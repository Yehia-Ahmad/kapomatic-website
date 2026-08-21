# Kapomatic Website Frontend

## 1. Project Overview

Kapomatic Website Frontend is an Angular storefront for Kapomatic, an automotive products business focused on car spare parts, gearbox/transmission parts, engine oils, and automatic transmission oils.

The project solves the customer-facing ecommerce problem of letting shoppers browse active product categories, search and filter products, view product details, add products to a cart, and submit an order with delivery and payment details. The target users are retail customers shopping online, while the business benefits from a branded storefront connected to ecommerce configuration APIs.

The main value is a searchable Arabic, right-to-left storefront with dynamic categories, product listings, order checkout, store location discovery, configurable branding, and SEO metadata.

Verified from: `src/app/app.routes.ts`, `src/app/pages/home/home.page.ts`, `src/app/pages/products/products.page.ts`, `src/app/pages/checkout/checkout.page.ts`, `src/app/services/ecommerce.service.ts`, `src/app/services/checkout.service.ts`, `src/app/services/general-settings.service.ts`, and `src/app/services/seo.service.ts`.

## 2. Main Features

### Authentication and Authorization

| Feature | What It Does | Who Uses It | Main Capabilities | Related Pages or Modules | Status |
|---|---|---|---|---|---|
| Public storefront access | Allows visitors to browse and order without logging in. | Customers | Public page routing; no login requirement; no visible role checks. | `src/app/app.routes.ts` | Complete |
| Authentication and role-based authorization | Not present in the frontend code. | Needs Verification | No auth module, login page, guards, interceptors, JWT handling, or role checks were found. | No related files found under `src/app` | Not Implemented |

### Catalog and Product Discovery

| Feature | What It Does | Who Uses It | Main Capabilities | Related Pages or Modules | Status |
|---|---|---|---|---|---|
| Home page category browsing | Displays active ecommerce categories and selected home-page category product sections. | Customers | Loads active categories, shows category images, links to category product listings, shows selected home-page products. | `home.page.*`, `home-category-products.component.*`, `ecommerce.service.ts` | Complete |
| Product listing | Displays products by category, targeted image campaign, or search term. | Customers | Category selection, product cards, stock labels, discounts, ratings, add to cart, favorite toggles, sorting, pagination/infinite load. | `products.page.*`, `ecommerce.service.ts`, `website-images.service.ts` | Complete |
| Product search | Searches active products through the API and routes users to search results. | Customers | Debounced search from header/home/products pages; search result listing; paginated API search. | `site-header.component.*`, `home.page.ts`, `products.page.ts`, `ecommerce.service.ts` | Complete |
| Specification filters | Filters category listings by visible specification values returned by the API. | Customers | Loads category filters; shows visible filters; supports multiple values per specification; sends selected filters to product API. | `products.page.ts`, `products.page.html`, `ecommerce.service.ts` | Complete |
| Product sorting | Sorts product results by rating or price. | Customers | Rating descending, price ascending, price descending; API sort for category listings; client-side sorting for current results. | `products.page.ts` | Complete |
| Product detail page | Shows product title, subtitle/brand, pricing, stock, images, quantity selector, specifications, and rating summary. | Customers | Gallery image selection, quantity range, add to cart, specs tab, reviews summary tab, SEO product metadata. | `product-detail.page.*`, `ecommerce.service.ts`, `seo.service.ts` | Complete |
| Favorites | Lets users toggle a visual favorite state on product cards. | Customers | In-memory favorite toggle per product. Favorites are not persisted and are not sent to an API. | `products.page.ts`, `products.page.html` | Partial |

### Promotions and Targeted Website Images

| Feature | What It Does | Who Uses It | Main Capabilities | Related Pages or Modules | Status |
|---|---|---|---|---|---|
| Targeted image carousel | Shows active website images/offers on the home page and links each image to related products. | Customers | Autoplay carousel, previous/next controls, target title, campaign listing via query parameters. | `website-targeted-images.component.*`, `website-images.service.ts` | Complete |
| Target-based product resolution | Resolves image targets to products by category, product IDs, combined targets, or max price. | Customers | Uses API-provided resolved products when available; falls back to category/product/price resolution. | `website-images.service.ts` | Complete |

### Cart, Checkout, Orders, and Payments

| Feature | What It Does | Who Uses It | Main Capabilities | Related Pages or Modules | Status |
|---|---|---|---|---|---|
| Shopping cart | Stores selected products locally and shows cart count, subtotal, item details, and quantity controls. | Customers | Add product, increment/decrement, set quantity, remove item, clear cart after checkout, localStorage persistence. | `cart.service.ts`, `site-header.component.*`, `cart.page.*` | Complete |
| Cart page | Provides a full cart review page before checkout. | Customers | Item review, quantity changes, remove items, subtotal, checkout link. | `cart.page.*` | Partial |
| Checkout form | Collects customer, delivery, payment, and cart item data and submits an order to the API. | Customers | Name, phone, governorate, address, payment method, order summary, validation, success/error messages. | `checkout.page.*`, `checkout.service.ts` | Complete |
| Shipping calculation | Calculates shipping fee by selected government/governorate and applies free shipping threshold. | Customers | Loads shipping settings; applies configured government fee unless subtotal qualifies for free shipping. | `checkout.service.ts`, `checkout.page.ts` | Complete |
| Payment options | Supports cash on delivery, e-wallet transfer, and InstaPay transfer. | Customers, payment review team | Cash checkout without transfer proof; wallet/InstaPay require transfer phone and proof image. | `checkout.page.ts`, `checkout.page.html`, `checkout.service.ts` | Complete |
| Tax and discount summary | Shows tax and discount fields in cart summary. | Customers | Both are hardcoded to zero in the cart page. | `cart.page.ts`, `cart.page.html` | Partial |

### Store Information, Settings, and Branding

| Feature | What It Does | Who Uses It | Main Capabilities | Related Pages or Modules | Status |
|---|---|---|---|---|---|
| General website settings | Loads storefront settings from the API. | Customers, business owners through backend/admin system | Logo, main color, currency, free shipping threshold, phone numbers, InstaPay link, store locations, social links. | `general-settings.service.ts`, `app.ts`, `site-header.component.*`, `site-footer.component.*` | Complete |
| Store locations | Displays configured branches and an interactive map. | Customers | Leaflet map, OpenStreetMap tiles, marker rendering from coordinates in map links, branch cards, direct map links. | `locations.page.*`, `general-settings.service.ts` | Complete |
| WhatsApp contact shortcut | Shows a floating WhatsApp link when a phone number is configured. | Customers | Normalizes local phone numbers and builds a WhatsApp URL. | `app.ts`, `app.html` | Complete |
| Social media footer | Displays social media links from settings with mapped Font Awesome icons. | Customers | Dynamic social icons; fallback link icon for unknown services. | `site-footer.component.*`, `general-settings.service.ts` | Complete |

### SEO, Localization, and Presentation

| Feature | What It Does | Who Uses It | Main Capabilities | Related Pages or Modules | Status |
|---|---|---|---|---|---|
| SEO metadata | Updates titles, descriptions, keywords, Open Graph, Twitter card, canonical links, and JSON-LD structured data. | Search engines, customers sharing links | Home, products, search, category, product, organization, website, auto-parts-store, and product schema data. | `seo.service.ts` | Complete |
| Static crawler files | Provides public robots and sitemap files. | Search engines | Allows crawling and lists main storefront routes. | `public/robots.txt`, `public/sitemap.xml` | Complete |
| Arabic RTL storefront UI | Presents the storefront in Arabic/right-to-left layout. | Arabic-speaking customers | RTL page templates, Arabic labels/messages, Cairo font, Tailwind-based styling. | Page templates under `src/app/pages`, `src/styles.scss`, `tailwind.config.js` | Complete |
| Theme customization | Applies configured main color and logo in UI. | Customers, business owners through backend/admin system | Dynamic header color, logo, map marker color, footer links. | `general-settings.service.ts`, `site-header.component.*`, `locations.page.ts` | Complete |

## 3. User Roles

No authenticated user roles can be confirmed from the frontend code.

The application routes are public and do not include route guards, permission directives, login pages, token handling, or role-specific UI. The confirmed user type is an anonymous customer/visitor who can browse products, manage a local cart, and submit checkout details.

Any administrator, inventory manager, payment reviewer, or business-owner role is Needs Verification because this repository does not include an admin interface or backend code.

Verified from: `src/app/app.routes.ts` and a source search of `src/app` showing no guard/interceptor/auth/state files.

## 4. Main User Flows

### Browse and Search Products

1. Customer opens the home page.
2. App loads general settings and active categories.
3. Customer browses category tiles, selected home-page product groups, or targeted carousel images.
4. Customer searches from the header or selects a category.
5. App routes to `/products` with query parameters for search, category, or targeted image.
6. Products are loaded through the ecommerce API, displayed with price, rating, discount, and stock status.
7. Customer filters by visible specifications or changes sort order.

Verified from: `home.page.ts`, `products.page.ts`, `site-header.component.ts`, `ecommerce.service.ts`, and `website-images.service.ts`.

### View Product and Add to Cart

1. Customer opens `/products/:id`, normally with a `categoryId` query parameter.
2. If no category ID is present, the app attempts to identify the category by loading active categories and finding the product.
3. Product details, gallery images, specs, ratings, price, and stock status are shown.
4. Customer selects quantity between 1 and 99.
5. Customer adds the product to the local cart if the product is in stock.

Verified from: `product-detail.page.ts`, `product-detail.page.html`, and `cart.service.ts`.

### Cart Review

1. Customer opens the cart drawer or `/cart`.
2. Cart items are read from Angular signals backed by `localStorage`.
3. Customer increments, decrements, or removes items.
4. Cart subtotal is recalculated.
5. Customer proceeds to `/checkout`.

Verified from: `cart.service.ts`, `site-header.component.html`, and `cart.page.*`.

### Checkout and Payment

1. Customer opens `/checkout`.
2. If the cart is empty, the page prompts the user to return to products.
3. App loads shipping settings from the API.
4. Customer enters name, phone, government/governorate, and detailed address.
5. Customer chooses cash, e-wallet, or InstaPay.
6. For e-wallet or InstaPay, transfer phone and proof image are required.
7. App submits customer details and cart products to the checkout API.
8. On success, the app shows the returned order/invoice reference if available and clears the local cart.

Verified from: `checkout.page.ts`, `checkout.page.html`, and `checkout.service.ts`.

### Store Location Discovery

1. Customer opens `/locations`.
2. App reads configured store locations from general settings.
3. Locations with parseable coordinates are shown as map markers.
4. Customer can click markers or location cards to open the configured map link.

Verified from: `locations.page.ts`, `locations.page.html`, and `general-settings.service.ts`.

## 5. Pages and Modules

| Page/Module | Purpose | Main Features | Access/Role | Status |
|---|---|---|---|---|
| `/` Home | Storefront landing page | Header search, targeted image carousel, active category grid, selected category product sections, footer | Public customer | Complete |
| `/products` Products | Product catalog listing | Category browsing, search results, targeted listings, visible specification filters, sorting, add to cart, pagination/infinite scroll | Public customer | Complete |
| `/products/:id` Product Detail | Product detail and purchase decision page | Product price, discount, stock, image gallery, quantity selector, specs, rating summary, add to cart, product SEO | Public customer | Complete |
| `/cart` Cart | Full cart review page | Local cart items, quantity controls, removal, subtotal, checkout link, zero-value tax/shipping display | Public customer | Partial |
| `/checkout` Checkout | Order submission | Customer delivery data, shipping government fee, free shipping threshold, cash/wallet/InstaPay payment, transfer proof upload, order submission | Public customer | Complete |
| `/locations` Locations | Branch discovery | Leaflet/OpenStreetMap map, marker extraction from map links, branch cards, direct map links | Public customer | Complete |
| `SiteHeaderComponent` | Shared header and cart drawer | Dynamic logo/color, search input, cart badge, cart drawer, free shipping progress | Public customer | Complete |
| `SiteFooterComponent` | Shared footer | Social media links and locations link | Public customer | Complete |
| `WebsiteTargetedImagesComponent` | Home page offer carousel | Active website images, autoplay, carousel controls, campaign-to-products navigation | Public customer | Complete |
| `HomeCategoryProductsComponent` | Home page product sections | Selected home-page categories and up to 10 products per category | Public customer | Complete |
| `GeneralSettingsService` | Storefront configuration state | Loads logo, color, currency, phones, locations, social links, free shipping minimum | Application-wide | Complete |
| `EcommerceService` | Product/category API adapter | Category/product/search/filter APIs and flexible response mapping | Application-wide | Complete |
| `CartService` | Cart state management | Angular signals, computed totals, `localStorage` persistence, item quantity rules | Application-wide | Complete |
| `CheckoutService` | Checkout API adapter | Shipping settings and order submission | Checkout page | Complete |
| `WebsiteImagesService` | Targeted website image API adapter | Active image loading and product target resolution | Home/products pages | Complete |
| `SeoService` | SEO metadata manager | Meta tags, canonical links, Open Graph/Twitter metadata, JSON-LD structured data | Application-wide | Complete |
| `App` root component | App shell | Loads settings, renders router outlet, WhatsApp floating link | Application-wide | Complete |

## 6. Technical Architecture

- Frontend framework: Angular 21.x, standalone components, strict TypeScript.
- UI and styling: Tailwind CSS 3, SCSS, Cairo font, Font Awesome, PrimeNG configuration with Aura theme. PrimeNG is configured but no PrimeNG components are directly used in the inspected templates.
- Backend technology: Not included in this repository. The frontend communicates with external REST APIs configured through `environment.api_base_url`.
- Database: Not identifiable from the frontend code. Needs Verification.
- Project architecture: Single Angular application with page components in `src/app/pages`, reusable components in `src/app/components`, and API/state services in `src/app/services`.
- State management: Angular signals and computed values are used for local UI state and cart state. No NgRx, Redux, Akita, or separate state library was found.
- API communication: Angular `HttpClient` with `withFetch()` is configured in `src/app/app.config.ts`. Services build REST URLs from environment configuration.
- Authentication method: No frontend authentication method was found. No token storage, auth headers, guards, or interceptors were found.
- Routing: Lazy loaded standalone page components through `src/app/app.routes.ts`; wildcard redirects to home.
- Guards and interceptors: None found.
- Server-side rendering: Angular SSR is enabled. `src/app/app.routes.server.ts` server-renders `products/:id` and prerenders other routes. `src/server.ts` provides an Express server for SSR output.
- Third-party services and integrations: External ecommerce/settings/order APIs, Leaflet/OpenStreetMap map tiles, WhatsApp deep link, social media links, SEO crawler files.
- Testing tools: Angular unit test builder with Vitest and jsdom dependencies. Existing test coverage appears minimal and includes an Angular starter assertion that likely no longer matches the app.
- Build and deployment configuration: Angular CLI application build with production budgets, SSR output mode, static assets from `public`, and an npm SSR serve script.

Verified from: `package.json`, `angular.json`, `src/app/app.config.ts`, `src/app/app.routes.ts`, `src/app/app.routes.server.ts`, `src/server.ts`, `src/styles.scss`, `tailwind.config.js`, and `src/app/app.spec.ts`.

## 7. API Integrations

| API Area | Purpose | Used By | Authentication Required |
|---|---|---|---|
| Ecommerce active categories | Load public categories and embedded products. | Home page, products page, product detail fallback, website image product resolution | No frontend auth found |
| Home-page ecommerce categories | Load selected categories configured for the home page. | `HomeCategoryProductsComponent` | No frontend auth found |
| Category product listing | Load paginated products for an active category, with optional filters and sort. | Products page | No frontend auth found |
| Product search | Search active products by query. | Products page and header search flow | No frontend auth found |
| Category filters | Load visible product specification filters and optional products. | Products page | No frontend auth found |
| Product detail | Load a specific product within an active category. | Product detail page | No frontend auth found |
| General ecommerce settings | Load logo, color, currency, phone numbers, payment links, locations, and social links. | App shell, header, footer, checkout, locations | No frontend auth found |
| Shipping settings | Load government/governorate shipping fees and free shipping threshold. | Checkout page | No frontend auth found |
| Checkout submission | Submit customer delivery details, payment method, transfer proof when required, and products. | Checkout page | No frontend auth found |
| Website images | Load active promotional/targeted images and resolve related products. | Home carousel and targeted product listings | No frontend auth found |

The concrete API base URL is intentionally not included here. It is configured in `src/environments/environment.ts` as `api_base_url`.

## 8. Key Business Rules

- Cart quantities are clamped from 1 to 99.
- Adding the same product to the cart increases its quantity instead of creating duplicate cart rows.
- Product listing and detail add-to-cart controls are disabled or blocked for out-of-stock products.
- Cart item price uses `priceAfterDiscount` when `hasDiscount` is true; otherwise it uses the available product price/retail price.
- Products are considered discounted only when `discountPercentage` is greater than zero and `priceAfterDiscount` exists.
- Checkout requires customer name with minimum length 3.
- Checkout requires phone values to match the pattern `^[0-9+()\\-\\s]{8,20}$`.
- Checkout requires government/governorate and shipping address.
- Shipping address must have minimum length 5.
- Cash payment does not require transfer phone or proof image.
- E-wallet and InstaPay payments require transfer phone and an uploaded proof image encoded as PNG, JPG/JPEG, or WebP data URL.
- Checkout is blocked when the cart is empty.
- Shipping fee is waived when the cart subtotal meets or exceeds the configured free shipping minimum.
- Location map markers are shown only when configured map links contain parseable latitude and longitude.
- On the server platform, several browser-only API calls return empty data to avoid SSR browser API usage.

Verified from: `cart.service.ts`, `checkout.page.ts`, `checkout.service.ts`, `ecommerce.service.ts`, and `locations.page.ts`.

## 9. What the Project Provides

For end users, the project provides product discovery, search, filtering, product details, local cart management, checkout, payment instructions, and branch location discovery.

For administrators, no admin UI exists in this repository. Administrative capabilities such as managing products, categories, settings, locations, website images, shipping fees, and orders appear to be provided by external APIs or another system. Needs Verification.

For business owners, the storefront provides a public ecommerce channel with configurable branding, promotional images, SEO metadata, order intake, payment proof collection, and store contact/location visibility.

For operations or payment-review teams, the checkout payload includes transfer phone and proof image for manual payment methods, but the review workflow itself is not implemented in this frontend.

## 10. Current Project Status

### Completed Functionality

- Public Angular storefront routing.
- Dynamic general settings loading.
- Active category and product browsing.
- Product search, filtering, sorting, and pagination/infinite load.
- Product detail pages with SEO metadata.
- Targeted website image carousel and targeted product listings.
- Local cart with persistence.
- Checkout submission with shipping and payment-method validation.
- Store locations page with Leaflet/OpenStreetMap.
- SEO metadata, JSON-LD, robots, and sitemap files.
- Angular SSR configuration.

### Partially Implemented or In Progress

- Favorites are UI-only and in-memory; they are not persisted or backed by an API.
- Cart page tax, discount, and estimated shipping fields are present but currently fixed at zero.
- Existing unit test coverage is minimal and appears outdated because `app.spec.ts` still checks for starter template text.
- `environment.site_url` has a TODO indicating the production storefront domain still needs configuration.
- `SeoService` has a fallback site URL TODO until `site_url` is configured.

### Not Implemented or Not Confirmed

- Customer accounts, registration, login, logout, password reset, or profile management.
- User roles, permissions, route guards, or protected admin screens.
- Backend implementation and database schema.
- Order history, order tracking, refunds, coupons, tax calculation, online payment gateway processing, and payment-review screens.
- End-to-end test framework configuration.

## 11. Project Structure

| Path | Purpose |
|---|---|
| `src/app/pages` | Standalone route pages for home, products, product detail, cart, checkout, and locations. |
| `src/app/components` | Reusable storefront components such as header, footer, home category products, and targeted image carousel. |
| `src/app/services` | API adapters and application services for ecommerce data, cart state, checkout, settings, website images, and SEO. |
| `src/app/app.routes.ts` | Client route definitions for the public storefront. |
| `src/app/app.routes.server.ts` | Angular SSR render-mode configuration. |
| `src/app/app.config.ts` | Application providers for routing, HTTP, hydration, base href, error listeners, and PrimeNG. |
| `src/server.ts` | Express server entry point for Angular SSR output. |
| `src/environments` | Environment configuration names such as API base URL, site URL, and base href. |
| `src/styles.scss` | Global styles, Tailwind imports, Cairo font setup, and Leaflet CSS import. |
| `public` | Static assets including favicon, fonts, robots file, and sitemap. |
| `angular.json` | Angular CLI build, serve, test, asset, style, budget, and SSR configuration. |
| `package.json` | npm scripts and dependency definitions. |
| `tailwind.config.js` | Tailwind theme colors, fonts, shadows, and content paths. |

Generated/dependency folders such as `node_modules`, `dist`, `build`, `coverage`, and cache directories are intentionally excluded.

## 12. Running the Project

### Requirements

- Node.js compatible with Angular 21.
- npm, using the package manager declared in `package.json`.
- Network/API access to the configured backend services for live data.

### Commands

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Start development server | `npm start` |
| Production build | `npm run build` |
| Watch build | `npm run watch` |
| Run unit tests | `npm test` |
| Serve SSR build after building | `npm run serve:ssr:kapomatic-website-frontend` |

### Required Environment Configuration Names

The frontend reads these configuration names from `src/environments/environment.ts`:

- `api_base_url`
- `site_url`
- `baseHREF`
- `production`

No sensitive environment values are included in this document.

## 13. Summary

Kapomatic Website Frontend is a public Angular ecommerce storefront for automotive spare parts and oils. It provides Arabic RTL product discovery, dynamic categories, targeted promotional images, product details, local cart management, checkout with cash/e-wallet/InstaPay support, shipping fee calculation, store locations, configurable branding, and SEO support.

The repository contains only the frontend. Authentication, admin management, backend implementation, database details, and operational order-management workflows cannot be confirmed from this codebase and need verification in the related backend or admin system.
