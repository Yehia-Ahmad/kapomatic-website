# Design System Implementation Contract

The authoritative design brief is `.superdesign/design-system.md`. This file describes how approved tokens map into Angular/Tailwind implementation.

## Current semantic tokens

| Purpose                     | CSS variable                     | Safe fallback                    |
| --------------------------- | -------------------------------- | -------------------------------- |
| Primary                     | `--brand-primary`                | `#F5B700`                        |
| Primary hover               | `--brand-primary-hover`          | derived darker variant           |
| Primary active              | `--brand-primary-active`         | derived darker variant           |
| Primary soft surface        | `--brand-primary-soft`           | derived light variant            |
| Primary foreground          | `--brand-primary-foreground`     | contrast-selected charcoal/white |
| Canvas                      | `--color-canvas`                 | `#F6F7F9`                        |
| Surface                     | `--color-surface`                | `#FFFFFF`                        |
| Muted surface               | `--color-surface-muted`          | `#F1F3F5`                        |
| Border                      | `--color-border`                 | `#E2E5E9`                        |
| Text                        | `--color-text`                   | `#16181D`                        |
| Muted text                  | `--color-text-muted`             | `#667085`                        |
| Success/warning/danger/info | corresponding semantic variables | values in `src/styles.scss`      |

`ThemeService` accepts only six-digit hex from normalized backend settings, derives variants, selects a ≥4.5:1 text foreground where possible, and writes semantic variables. Components consume semantic tokens, never raw backend colors.

## Typography and layout foundation

- Preferred bilingual family: Cairo; current implementation uses a Cairo/Noto Sans Arabic/Arial fallback stack pending an approved licensed font asset strategy.
- Mobile-first breakpoints: 640, 768, 1024, 1280 and 1536 px.
- Content containers: 75rem standard, 90rem wide.
- Radius scale: 6, 10, 14 and 20 px equivalents.
- Motion is purposeful and disabled/reduced under `prefers-reduced-motion`.
- Every interactive component must expose visible focus, hover, active, disabled and error states.

## Approved Home v3 component mapping

The implemented shell and Home use approved draft `3d6cca6e-3a4b-405d-b2c7-8371074061cc`, version 3, as visual direction. The draft was direct-authored/imported after Superdesign credits blocked model generation; the user accepted that provenance. Production Angular templates do not contain draft preview controls, preview scripts, CDN dependencies, placeholder links, or draft sample data.

| Pattern   | Implementation rule                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Logo      | Stable 44/56 px-high container; backend image uses `object-contain`, max 112/180 px, no crop/stretch; absent logo is a neutral empty surface           |
| Header    | Four-column 320px mobile grid plus full-width search row; desktop logo/search/actions row and dynamic navigation                                       |
| Promotion | Image-dominant 16:10 mobile, 16:7 tablet, 16:5 desktop container; cover image, optional backend overlay, controls/indicators and no blank fixed height |
| Category  | Two-column mobile, configured tablet/desktop columns, image-first card, line-safe localized title                                                      |
| Product   | Two-column 320px grid, configured larger grids, square contained image, normalized price/discount/stock and one add action                             |
| States    | Geometry-matched category/product skeletons; neutral empty panel; warning partial state; recoverable error with retry                                  |
| Drawer    | Logical inline-end modal, 88vw/22rem max, inert background, scroll lock, focus trap and reduced motion                                                 |

Responsive breakpoints remain 640, 768, 1024, 1280 and 1536 px. Exact device emulation verifies no document overflow at 320px in Arabic or English. Full Home screenshots are under `docs/screenshots/` and are explicitly fixture-driven.

No later page component is approved merely because Home establishes a reusable token or shell pattern.
