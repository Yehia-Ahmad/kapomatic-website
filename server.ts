import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express, { Request } from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APP_RUNTIME_CONFIG_OVERRIDE,
  normalizeRuntimeConfig
} from './src/app/core/config/app-runtime-config';
import bootstrap from './src/main.server';

const LOCALIZED_ROUTE =
  /^\/(?:ar|en)(?:\/(?:categories\/[^/]+|search|products\/[^/]+|cart|checkout|locations|not-found))?\/?$/;
const LEGACY_PRODUCT_ROUTE = /^\/products\/[^/]+\/?$/;

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  const commonEngine = new CommonEngine();

  if (process.env['TRUST_PROXY'] === 'true') server.set('trust proxy', 1);
  server.disable('x-powered-by');

  server.get('/', (request, response) => response.redirect(308, withQuery(request, '/ar')));
  server.get('/cart', (request, response) => response.redirect(308, withQuery(request, '/ar/cart')));
  server.get('/checkout', (request, response) => response.redirect(308, withQuery(request, '/ar/checkout')));
  server.get('/locations', (request, response) =>
    response.redirect(308, withQuery(request, '/ar/locations'))
  );
  server.get('/products', (request, response) => response.redirect(308, withQuery(request, '/ar/search')));

  const apiBaseUrl = normalizeRuntimeConfig({
    apiBaseUrl: process.env['API_BASE_URL'] || '/api'
  }).apiBaseUrl;
  if (apiBaseUrl.startsWith('/') && apiBaseUrl !== '/') {
    server.use(apiBaseUrl, (_request, response) => {
      response.status(502).set('Cache-Control', 'no-store').json({ code: 'API_PROXY_NOT_CONFIGURED' });
    });
  }

  server.get(
    '*.*',
    express.static(browserDistFolder, {
      immutable: true,
      maxAge: '1y',
      index: false
    })
  );

  server.get('*', (request, response, next) => {
    const runtimeConfig = normalizeRuntimeConfig({
      production: true,
      apiBaseUrl: process.env['API_BASE_URL'] || '/api',
      siteUrl: process.env['SITE_URL'] || requestOrigin(request),
      baseHref: process.env['BASE_HREF'] || '/',
      requestTimeoutMs: Number(process.env['API_REQUEST_TIMEOUT_MS']) || 10_000
    });
    const status = isKnownApplicationPath(request.path) ? 200 : 404;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${runtimeConfig.siteUrl}${request.originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: runtimeConfig.baseHref },
          { provide: APP_RUNTIME_CONFIG_OVERRIDE, useValue: runtimeConfig }
        ]
      })
      .then((html) => {
        response.status(status).set('Cache-Control', 'no-store').send(html);
      })
      .catch((error: unknown) => next(error));
  });

  server.use(
    (_error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      response.status(500).type('text/plain').send('Server rendering failed.');
    }
  );

  return server;
}

function isKnownApplicationPath(path: string): boolean {
  return LOCALIZED_ROUTE.test(path) || LEGACY_PRODUCT_ROUTE.test(path);
}

function withQuery(request: Request, destination: string): string {
  const queryIndex = request.originalUrl.indexOf('?');
  return queryIndex >= 0 ? `${destination}${request.originalUrl.slice(queryIndex)}` : destination;
}

function requestOrigin(request: Request): string {
  const host = request.get('host') ?? 'localhost:4000';
  const safeHost = /^[a-z0-9.:[\]-]+$/i.test(host) ? host : 'localhost:4000';
  return `${request.protocol === 'https' ? 'https' : 'http'}://${safeHost}`;
}

function run(): void {
  const port = Number(process.env['PORT']) || 4000;
  app().listen(port, () => {
    console.log(`Angular SSR server listening on port ${port}`);
  });
}

run();
