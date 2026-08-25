# Kapomatic Storefront Design System

## 1. Product and design mandate

Kapomatic is an Egyptian public automotive ecommerce storefront focused on automatic transmission and gearbox parts, automotive spare parts, engine oils, automatic transmission oils, and related products. Primary visitors usually know a product name, part fragment, oil specification, or vehicle-related phrase and want to find it quickly and order without an account.

The new experience must feel professional, modern, reliable, technical but approachable, conversion-focused, fast on mobile, and clearly Kapomatic. It must not resemble a generic marketplace, gaming interface, neon/luxury-car concept, or decorative automotive landing page.

Do not invent claims such as same-day nationwide delivery, guaranteed original products, free returns, warranties, secure card payments, or other unsupported promises. Cash, wallet and InstaPay are the confirmed checkout methods, but the Home Page should not imply real-time payment processing.

## 2. Non-negotiable identity rules

- The real logo is dynamic backend content. No local approved logo asset is available for this draft.
- Every draft logo position must use a neutral rectangle labelled **Dynamic backend logo**. It is a wire-content placeholder only.
- Never create initials, an emoji, a gear/car/transmission mark, a generic icon, an invented SVG, or a wordmark as a logo substitute.
- The backend primary color is dynamic. All designs must remain coherent if the primary changes.
- The fallback preview accent is warm amber `#F5B700`, but it must be controlled and never flood large page areas.
- Strong automotive character comes from charcoal typography, exact alignment, technical detail density, product imagery, subtle surface hierarchy and confident controls—not black backgrounds, metallic gradients, racing stripes, or aggressive motifs.

## 3. Visual direction

### Core composition

- Off-white/light-gray canvas with white product/content surfaces.
- Dark charcoal typography for authority and legibility.
- Dynamic primary accent reserved for primary actions, selected states, focus, small emphasis, price/promotion details where appropriate, and navigational cues.
- Subtle cool-gray borders and restrained neutral shadows.
- Product imagery and search dominate; decoration remains secondary.
- Layout density is practical: neither sparse luxury editorial nor crowded marketplace.
- Use flat or lightly elevated surfaces. No glassmorphism and no excessive gradients.

### Visual rhythm

- Strong, compact header and discovery area.
- Clear page/section titles, supporting text and deliberate whitespace.
- Repeatable 4/8-based spacing rhythm.
- Cards align titles, price blocks, stock and actions predictably even when product names wrap.
- Technical attributes appear in compact chips/rows, not noisy banners.

## 4. Semantic color system

| Token              |  Fallback | Purpose                                                         |
| ------------------ | --------: | --------------------------------------------------------------- |
| `brand.primary`    | `#F5B700` | primary CTA, selected state, focus identity                     |
| `brand.hover`      | `#D8A100` | hover derived from runtime primary                              |
| `brand.active`     | `#C49200` | pressed/active derived from runtime primary                     |
| `brand.soft`       | `#FFF7D6` | badges, selected backgrounds, subtle callout                    |
| `brand.foreground` | `#111827` | contrast-selected text on primary; may become white dynamically |
| `canvas`           | `#F6F7F9` | page background                                                 |
| `surface`          | `#FFFFFF` | header, card, form, drawer, summary                             |
| `surface.muted`    | `#F1F3F5` | image wells, secondary blocks, skeletons                        |
| `border`           | `#E2E5E9` | separators and input/card outlines                              |
| `text`             | `#16181D` | primary content                                                 |
| `text.muted`       | `#667085` | supporting content                                              |
| `text.inverse`     | `#FFFFFF` | content on verified dark surfaces                               |
| `success`          | `#16834B` | in-stock/success                                                |
| `warning`          | `#B76A00` | low stock/attention                                             |
| `danger`           | `#C53B3B` | validation/out-of-stock/removal                                 |
| `info`             | `#2563EB` | neutral informational state                                     |

Rules:

1. Never use a raw backend hex in a component.
2. Theme utilities derive hover, active, soft and foreground variants and validate contrast.
3. Do not assume yellow/amber always has dark foreground; foreground is computed.
4. Text contrast targets WCAG 2.2 AA: 4.5:1 normal, 3:1 large text and meaningful UI boundaries.
5. Status color is never the only signal; pair it with text/icon/state.

## 5. Typography

Primary bilingual family: Cairo. Fallback: Noto Sans Arabic, Arial, sans-serif. Use one family for Arabic and English for stable mixed-script rhythm unless an approved licensed brand family is later supplied.

| Role                      |  Desktop |   Mobile |  Weight |                Line height |
| ------------------------- | -------: | -------: | ------: | -------------------------: |
| Display/value proposition | 44–52 px | 30–36 px | 700–800 |                    1.1–1.2 |
| Page title                | 36–40 px | 28–32 px | 700–800 |                        1.2 |
| Section title             | 26–30 px | 22–26 px | 700–800 |                       1.25 |
| Card title                | 15–17 px | 15–16 px | 600–700 |                       1.45 |
| Body                      |    16 px | 15–16 px | 400–500 | 1.65 Arabic / 1.55 English |
| Supporting                | 13–14 px | 13–14 px | 400–500 |                       1.55 |
| Label                     | 13–14 px | 13–14 px | 600–700 |                        1.4 |
| Effective price           | 20–24 px | 18–22 px | 700–800 |                        1.2 |
| Old price/caption         | 12–14 px | 12–13 px | 500–600 |                        1.4 |
| Button                    | 14–16 px | 14–16 px |     700 |                        1.2 |

Avoid all-caps for Arabic. English uppercase is limited to short technical codes. Maintain bidi isolation for product codes, phone numbers, currencies and mixed Arabic/Latin names.

## 6. Spacing, shape and elevation

- Base spacing: 4 px.
- Common sequence: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 px.
- Radius: 6 px compact, 10 px controls, 14 px cards, 20 px feature surfaces; pill only for chips/badges.
- Border: 1 px neutral. Selected/focus may use 2–3 px semantic accent without layout shift.
- Shadow small: `0 1px 2px rgb(15 23 42 / 6%)`.
- Shadow medium: `0 8px 24px rgb(15 23 42 / 8%)`.
- Shadow large: `0 18px 48px rgb(15 23 42 / 12%)` for drawers/dialogs only.

## 7. Responsive layout

Mobile-first breakpoints: 640, 768, 1024, 1280, 1536 px.

- Standard content maximum: 1200 px (75rem).
- Wide editorial/promotion maximum: 1440 px (90rem).
- Mobile horizontal page padding: 16 px; tablet 24 px; desktop 32 px where space allows.
- Product grid: 2 compact columns only when cards remain readable; otherwise 1. Tablet 2–3; desktop 3–4; wide desktop up to 5 only with approved density.
- Minimum touch target: 44×44 px.
- Filters: mobile drawer, desktop sidebar or top refinement based on result density.
- Checkout: single column mobile; form + sticky/contained order summary at desktop.
- Drawers: full-width or near-full mobile, max 420–480 px desktop; direction-aware placement.
- Logical CSS properties and direction-aware icons are mandatory.

## 8. Global shell specification

### Optional announcement strip

- Slim, dismissible only if backend supports dismissal/version.
- Text and link must be real configured content.
- No promotional promise is invented.

### Main header

- Dynamic backend logo position with fixed aspect/size reservation to prevent CLS.
- Central and visually strongest search on desktop.
- Arabic/English switcher with clear current locale.
- Contact/WhatsApp entry when configured.
- Cart action with total quantity badge.
- Wishlist/account actions only if intentionally retained and implemented; hide by default.
- Category navigation can be backend-configured; must collapse into accessible mobile navigation.
- Sticky behavior only if configuration/design approves it.

### Footer

- Store locations entry, contact/social links from settings, essential navigation and legal/cookie controls when implemented.
- External links expose clear names and safe target behavior.
- No fabricated address, phone, social account or policy copy.

## 9. Component contracts

### Buttons

- Primary: semantic brand fill and contrast-selected foreground.
- Secondary: white/neutral surface with border and dark text.
- Tertiary/text: no container until hover/focus.
- Danger: semantic danger reserved for destructive action.
- States: default, hover, pressed, focus-visible, loading, disabled.
- Loading preserves width and announces state without replacing the accessible name.

### Icon buttons

- 44 px target, visible focus, tooltip where meaning is not obvious, localized ARIA name.
- Use selective Font Awesome icons; no generic icon replacing a brand logo.

### Search field

- Largest discovery control on Home.
- Persistent label or accessible name, clear button, submit action, optional suggestions only when implemented.
- Mobile keyboard/search input behavior; no automatic navigation on every keystroke.

### Inputs/selects/checkboxes

- Visible label, optional hint, reserved error area, semantic invalid state and linked message.
- Height 44–48 px; generous Arabic line box.
- Placeholder is never the only label.

### Filter chips

- Clear selected/removable state, count where useful, keyboard operable.
- A “clear all” action appears only with active filters.

### Product card

- Product image in a stable square or near-square contained image well.
- Localized product name, optional short description/brand, normalized effective price, optional struck original price and calculated discount badge.
- Stock state from authoritative data; add-to-cart disabled for unavailable products.
- Rating appears only with real rating and count.
- Favorite control appears only if persistence/API scope is intentionally approved.
- Card title/details navigation and Add to Cart are distinct keyboard targets.
- Image fallback is neutral product placeholder, not a logo.

### Category card

- Real backend image when present, localized category name, one clear navigation target.
- Avoid decorative vehicle-category imagery that implies unsupported content.

### Price block

- Effective price is dominant.
- Original price shown only for a valid lower effective price.
- Discount percentage is normalized in one pricing policy.
- Currency uses locale-aware formatting and consistent placement.

### Stock state

- In stock: success text/icon.
- Low stock only if backend returns a confirmed threshold/state.
- Out of stock: danger/muted state; purchasing disabled.
- Never expose exact inventory unless product approves it.

### Quantity control

- Minus, numeric value and plus with 44 px controls.
- Announces bounds/errors; disabled limits are visible.
- Durable quantity is clamped but live availability must be revalidated.

### Cart line and shipping progress

- Product image/name, current quoted price, quantity, line total, remove.
- Changed price/stock/deleted-item status must be explicit.
- Shipping progress uses the authoritative threshold and never implies eligibility from stale cached prices.

### Payment method cards and proof uploader

- Cash, Wallet, InstaPay cards with localized explanation.
- Conditional fields expand after selection with focus management.
- Proof uploader shows accepted types/size only after business/backend confirmation, preview/removal and privacy copy.

### Dialog/drawer

- Semantic dialog, labelled title, focus trap, Escape, close button, inert background, focus return and direction-aware animation.

### Carousel

- Region label, previous/next names, pause behavior, keyboard controls, current item state and reduced-motion mode.
- Autoplay never hides access or changes faster than users can read.

### State components

- Skeleton matches final geometry and is hidden appropriately from assistive technology.
- Empty state explains why and provides one valid next action.
- Error state uses stable localized message and retry only when safe.
- Toast/live status does not steal focus; critical form errors use summary + field focus.

## 10. Home Page approved-design brief

The first draft must be a complete desktop Home Page direction with mobile-responsiveness implicit in its component behavior. It must include:

1. Optional slim service/announcement strip using clearly configurable content.
2. Main header with neutral **Dynamic backend logo** placeholder.
3. Large central search as the strongest action.
4. Arabic/English switcher.
5. Contact/WhatsApp entry.
6. Cart action and count.
7. Category navigation.
8. Promotion hero/banner carousel with real-domain placeholder content, not fabricated claims.
9. Search-focused value proposition for locating transmission parts/oils.
10. Main category grid using gearbox parts, transmission filters, transmission oil, engine oil and related spare parts.
11. Selected Home Page Builder category/product sections.
12. Reusable product cards with complete price/stock/action hierarchy.
13. Offer/targeted promotion section only as configurable content.
14. Store/service trust signals limited to neutral service navigation unless backend content confirms claims.
15. Free-shipping information only as a dynamic configured threshold.
16. Store locations entry.
17. Social/contact footer.
18. A credible mobile header/navigation concept represented within responsive rules, not a separate unrelated design.
19. Loading, empty, API error and stable fallback considerations.

Suggested real-domain sample copy may name product types, not businesses or guarantees. Prices/images in the design are illustrative UI data and must be clearly treated as sample content, not claimed live inventory.

## 11. Accessibility

Target WCAG 2.2 AA:

- Skip link and semantic header/nav/main/footer landmarks.
- One logical H1; ordered headings.
- Visible focus and full keyboard operation.
- 44 px touch targets.
- Associated form labels, hints and errors.
- Error summary and focus to first invalid control.
- Live regions for cart/status changes.
- Dialog focus trap/return/Escape.
- Carousel pause and reduced-motion behavior.
- Contrast-safe dynamic theme.
- Correct Arabic and English reading order; mixed data isolated.
- Store list remains fully usable without an interactive map.

Do not label a draft or implementation “WCAG compliant” without manual validation.

## 12. Motion

- 120–180 ms for hover/focus/press; 200–280 ms for drawers and disclosure.
- Use opacity/transform where motion is useful; avoid parallax, looping decorative motion and broad page transitions.
- Promotion autoplay pauses on hover/focus and respects reduced motion.
- Skeleton shimmer may be replaced by subtle pulse; reduced-motion uses static fill.

## 13. Content and localization rules

- Every design component has Arabic RTL and English LTR behavior.
- Do not hardcode Arabic as the only visible language.
- Allow Arabic product names to wrap to two lines without moving price/actions unpredictably.
- Do not translate backend category/product values by guessing.
- Validation, state, ARIA and button copy all have equivalents.
- Search/filter/page query state remains visible and understandable.

## 14. Page flow after Home approval

Only after Home approval, derive a consistent flow for category products, unified search, product detail, cart, checkout, locations, not-found, global state screens, cart drawer, mobile filter drawer and checkout success/failure. These pages must use the approved Home shell, tokens and components; they must not be independently restyled.

## 15. Prohibited draft behavior

- No invented logo or brand mark.
- No huge saturated amber/yellow hero background.
- No unsupported delivery, warranty, authenticity, returns or payment claims.
- No favorite/account/review prominence without deliberate retained scope.
- No English-as-direction-only mockup; English copy must be real.
- No generic stock-photo luxury car as the identity.
- No neon, gaming, racing, glassmorphism or excessive gradients.
- No product-page implementation code; this document drives design only until approval.
