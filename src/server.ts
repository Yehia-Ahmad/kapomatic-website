import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();
const cache = new Map<string, { expiresAt: number; value: string; contentType: string }>();
const sitemapCacheMs = 1000 * 60 * 60;

function configuredOrigin(value: string, fallback: string): string {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed && !trimmed.includes('{{') ? trimmed : fallback;
}

function apiUrl(path: string): string {
  return `${configuredOrigin(environment.api_base_url, environment.api_base_url)}/${path.replace(/^\/+/, '')}`;
}

function apiConfigured(): boolean {
  return Boolean(environment.api_base_url && !environment.api_base_url.includes('{{'));
}

function siteOrigin(req: express.Request): string {
  const configured = configuredOrigin(environment.site_url, '');
  if (configured) return configured;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function readArray(source: unknown): unknown[] {
  if (Array.isArray(source)) return source;
  const object = source && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  for (const key of ['data', 'result', 'items', 'rows', 'urls', 'products', 'categories', 'pages', 'images']) {
    const value = object[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;
      for (const nestedKey of ['items', 'rows', 'urls', 'products', 'categories', 'pages', 'images']) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
      }
    }
  }
  return [];
}

function readString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = key.split('.').reduce<unknown>((current, part) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[part];
    }, item);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function rowUrl(site: string, row: Record<string, unknown>, fallbackPath: string): string {
  const loc = readString(row, ['loc', 'url', 'href']);
  if (/^https?:\/\//i.test(loc)) return loc;
  if (loc) return `${site}/${loc.replace(/^\/+/, '')}`;
  return `${site}${fallbackPath}`;
}

function alternatesXml(row: Record<string, unknown>, site: string): string {
  const alternates = row['alternates'] && typeof row['alternates'] === 'object'
    ? (row['alternates'] as Record<string, unknown>)
    : row;
  const ar = readString(alternates, ['ar', 'arUrl', 'ar.loc']);
  const en = readString(alternates, ['en', 'enUrl', 'en.loc']);
  const fallback = ar || readString(alternates, ['xDefault', 'xDefaultUrl']);
  return [
    ar ? `<xhtml:link rel="alternate" hreflang="ar-EG" href="${xmlEscape(/^https?:\/\//i.test(ar) ? ar : `${site}/${ar.replace(/^\/+/, '')}`)}"/>` : '',
    en ? `<xhtml:link rel="alternate" hreflang="en-EG" href="${xmlEscape(/^https?:\/\//i.test(en) ? en : `${site}/${en.replace(/^\/+/, '')}`)}"/>` : '',
    fallback ? `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(/^https?:\/\//i.test(fallback) ? fallback : `${site}/${fallback.replace(/^\/+/, '')}`)}"/>` : ''
  ].filter(Boolean).join('');
}

function urlset(rows: unknown[], site: string, fallbackPath: (row: Record<string, unknown>) => string): string {
  const urls = rows.map((entry) => {
    const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const loc = rowUrl(site, row, fallbackPath(row));
    const lastmod = readString(row, ['lastmod', 'lastModified', 'updatedAt']);
    return `<url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ''}${alternatesXml(row, site)}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`;
}

async function cachedXml(key: string, contentType: string, factory: () => Promise<string>): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const value = await factory();
    cache.set(key, { value, contentType, expiresAt: Date.now() + sitemapCacheMs });
    return value;
  } catch (error) {
    if (cached) return cached.value;
    throw error;
  }
}

function sendXml(res: express.Response, body: string): void {
  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=3600, stale-if-error=86400')
    .send(body);
}

app.get('/robots.txt', (req, res) => {
  res
    .type('text/plain')
    .set('Cache-Control', 'public, max-age=3600')
    .send(`User-agent: *
Allow: /

Disallow: /ar/cart
Disallow: /en/cart
Disallow: /ar/checkout
Disallow: /en/checkout
Disallow: /ar/search
Disallow: /en/search
Disallow: /*?sort=
Disallow: /*?filter=

Sitemap: ${siteOrigin(req)}/sitemap.xml
`);
});

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const site = siteOrigin(req);
    const paths = [
      '/sitemaps/pages-ar.xml',
      '/sitemaps/pages-en.xml',
      '/sitemaps/categories-ar.xml',
      '/sitemaps/categories-en.xml',
      '/sitemaps/products-ar.xml',
      '/sitemaps/products-en.xml',
      '/sitemaps/images.xml'
    ];
    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths
        .map((path) => `<sitemap><loc>${xmlEscape(`${site}${path}`)}</loc></sitemap>`)
        .join('')}</sitemapindex>`
    );
  } catch (error) {
    next(error);
  }
});

app.get('/sitemaps/:kind.xml', async (req, res, next) => {
  try {
    const site = siteOrigin(req);
    const kind = req.params['kind'];
    const xml = await cachedXml(`sitemap:${kind}`, 'application/xml', async () => {
      if (kind === 'pages-ar' || kind === 'pages-en') {
        if (!apiConfigured()) {
          const language = kind.slice(-2);
          return urlset(
            [
              { loc: `${site}/${language}` },
              { loc: `${site}/${language}/locations` }
            ],
            site,
            () => `/${language}`
          );
        }
        const rows = readArray(await fetchJson(apiUrl('public/seo/sitemap/pages'))).filter((row) => {
          const item = row as Record<string, unknown>;
          const language = readString(item, ['language', 'lang']);
          return language ? language === kind.slice(-2) : true;
        });
        return urlset(rows, site, (row) => readString(row, ['path']) || `/${kind.slice(-2)}`);
      }
      if (kind === 'categories-ar' || kind === 'categories-en') {
        if (!apiConfigured()) return urlset([], site, () => '/');
        const language = kind.endsWith('-ar') ? 'ar' : 'en';
        const rows = readArray(await fetchJson(apiUrl('public/seo/sitemap/categories?page=1&limit=1000')));
        return urlset(rows, site, (row) => `/${language}/categories/${encodeURIComponent(readString(row, [`slug.${language}`, `${language}Slug`, 'slug']))}`);
      }
      if (kind === 'products-ar' || kind === 'products-en') {
        if (!apiConfigured()) return urlset([], site, () => '/');
        const language = kind.endsWith('-ar') ? 'ar' : 'en';
        const rows = readArray(await fetchJson(apiUrl('public/seo/sitemap/products?page=1&limit=1000')));
        return urlset(rows, site, (row) => `/${language}/products/${encodeURIComponent(readString(row, [`slug.${language}`, `${language}Slug`, 'slug']))}`);
      }
      if (kind === 'images') {
        if (!apiConfigured()) return urlset([], site, () => '/');
        const rows = readArray(await fetchJson(apiUrl('public/seo/sitemap/images?page=1&limit=1000')));
        const urls = rows.map((entry) => {
          const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
          const loc = rowUrl(site, row, readString(row, ['image', 'imageUrl', 'loc']) || '/favicon.ico');
          return `<url><loc>${xmlEscape(loc)}</loc></url>`;
        });
        return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
      }
      return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    });
    sendXml(res, xml);
  } catch (error) {
    next(error);
  }
});

app.use(async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  const localizedMatch = req.path.match(/^\/(ar|en)\/(categories|products)\/([^/]+)$/);
  if (localizedMatch && apiConfigured()) {
    const [, language, type, rawSlug] = localizedMatch;
    const slug = decodeURIComponent(rawSlug);
    const entityType = type === 'categories' ? 'category' : 'product';
    const publicPath =
      type === 'categories'
        ? `public/${language}/categories/${encodeURIComponent(slug)}`
        : `public/${language}/products/${encodeURIComponent(slug)}`;

    try {
      await fetchJson(apiUrl(publicPath));
      next();
      return;
    } catch {
      try {
        const alias = await fetchJson(
          apiUrl(`public/${language}/slug-aliases/${entityType}/${encodeURIComponent(slug)}`)
        );
        const item = alias && typeof alias === 'object' ? (alias as Record<string, unknown>) : {};
        const data = item['data'] && typeof item['data'] === 'object' ? (item['data'] as Record<string, unknown>) : item;
        const redirectTo = readString(data, ['redirectTo', 'url', 'location', 'canonicalUrl']);
        if (redirectTo) {
          res.redirect(301, /^https?:\/\//i.test(redirectTo) ? redirectTo : `${siteOrigin(req)}/${redirectTo.replace(/^\/+/, '')}`);
          return;
        }
      } catch {
        // Continue to render a 404 Angular page when the backend cannot resolve an alias.
      }
      res.status(404);
      next();
      return;
    }
  }

  const oldProductMatch = req.path.match(/^\/products\/([^/]+)$/);
  if (oldProductMatch && apiConfigured()) {
    try {
      const product = await fetchJson(apiUrl(`products/${encodeURIComponent(decodeURIComponent(oldProductMatch[1]))}`));
      const item = product && typeof product === 'object' ? (product as Record<string, unknown>) : {};
      const data = item['data'] && typeof item['data'] === 'object' ? (item['data'] as Record<string, unknown>) : item;
      const translations = data['translations'] && typeof data['translations'] === 'object'
        ? (data['translations'] as Record<string, unknown>)
        : {};
      const ar = translations['ar'] && typeof translations['ar'] === 'object' ? (translations['ar'] as Record<string, unknown>) : {};
      const en = translations['en'] && typeof translations['en'] === 'object' ? (translations['en'] as Record<string, unknown>) : {};
      const preferEnglish = req.query['lang'] === 'en' || req.query['language'] === 'en';
      const language = preferEnglish ? 'en' : 'ar';
      const slug = readString(preferEnglish ? en : ar, ['slug']) || readString(data, ['slug']);
      if (slug) {
        res.redirect(301, `${siteOrigin(req)}/${language}/products/${encodeURIComponent(slug)}`);
        return;
      }
      res.status(404);
      next();
      return;
    } catch {
      res.status(404);
      next();
      return;
    }
  }

  next();
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
