# Theme Context

## Compact token summary

- Visual direction: professional automotive ecommerce; charcoal text, off-white canvas, white surfaces, controlled dynamic primary accent.
- Dynamic primary fallback: `#F5B700`; hover `#D8A100`; active `#C49200`; soft `#FFF7D6`; foreground `#111827`. Runtime values are derived from validated backend settings.
- Neutral palette: canvas `#F6F7F9`; surface `#FFFFFF`; muted surface `#F1F3F5`; border `#E2E5E9`; text `#16181D`; muted `#667085`; inverse `#FFFFFF`.
- Semantic: success `#16834B`; warning `#B76A00`; danger `#C53B3B`; info `#2563EB`.
- Font stack: Cairo, Noto Sans Arabic, Arial, sans-serif. No approved bundled font asset yet.
- Radius: 6, 10, 14, 20 px equivalents.
- Shadows: subtle 1px/2px, 8px/24px and 18px/48px neutral shadows.
- Breakpoints: 640, 768, 1024, 1280, 1536 px.
- Containers: 75rem standard, 90rem wide.
- Global focus: 3px primary outline, 3px offset. Reduced-motion media query suppresses nonessential motion.

## Raw `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: { DEFAULT: 'var(--color-surface)', muted: 'var(--color-surface-muted)' },
        border: 'var(--color-border)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)'
        },
        brand: {
          DEFAULT: 'var(--brand-primary)',
          hover: 'var(--brand-primary-hover)',
          active: 'var(--brand-primary-active)',
          soft: 'var(--brand-primary-soft)',
          foreground: 'var(--brand-primary-foreground)'
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)'
      },
      fontFamily: { sans: ['Cairo', 'Noto Sans Arabic', 'Arial', 'sans-serif'] },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' },
      maxWidth: { content: 'var(--content-max-width)', wide: 'var(--content-wide-max-width)' }
    }
  },
  plugins: []
};
```

## Raw `src/styles.scss`

```scss
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand-primary: #f5b700;
  --brand-primary-hover: #d8a100;
  --brand-primary-active: #c49200;
  --brand-primary-soft: #fff7d6;
  --brand-primary-foreground: #111827;
  --color-canvas: #f6f7f9;
  --color-surface: #ffffff;
  --color-surface-muted: #f1f3f5;
  --color-border: #e2e5e9;
  --color-text: #16181d;
  --color-text-muted: #667085;
  --color-text-inverse: #ffffff;
  --color-success: #16834b;
  --color-warning: #b76a00;
  --color-danger: #c53b3b;
  --color-info: #2563eb;
  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.875rem;
  --radius-xl: 1.25rem;
  --shadow-sm: 0 1px 2px rgb(15 23 42 / 0.06);
  --shadow-md: 0 8px 24px rgb(15 23 42 / 0.08);
  --shadow-lg: 0 18px 48px rgb(15 23 42 / 0.12);
  --content-max-width: 75rem;
  --content-wide-max-width: 90rem;
}

html {
  min-height: 100%;
  background: var(--color-canvas);
  color: var(--color-text);
  font-family: Cairo, 'Noto Sans Arabic', Arial, sans-serif;
  scroll-behavior: smooth;
}

body {
  min-height: 100vh;
  margin: 0;
  background: var(--color-canvas);
}
button,
input,
select,
textarea {
  font: inherit;
}
:focus-visible {
  outline: 3px solid var(--brand-primary);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```
