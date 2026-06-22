/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#F2D200',
          600: '#E6C800',
          700: '#D2B600'
        },
        surface: {
          0: '#FFFFFF',
          50: '#F8FAFC'
        },
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6B7280',
          300: '#D1D5DB'
        },
        line: {
          200: '#E5E7EB'
        },
        rating: {
          500: '#F59E0B'
        },
        heart: {
          600: '#E11D48'
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          700: '#047857'
        },
        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          800: '#1E40AF'
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          800: '#92400E'
        },
        danger: {
          50: '#FEF2F2',
          300: '#FCA5A5',
          700: '#B91C1C',
          800: '#991B1B'
        },
        detail: {
          950: '#0A0F1A',
          900: '#0B1220',
          850: '#111827',
          800: '#1F2937',
          750: '#263244',
          700: '#374151'
        },
        hero: {
          overlay: 'rgba(0, 0, 0, 0.55)'
        },
        dot: {
          active: '#F2D200',
          inactive: 'rgba(255, 255, 255, 0.65)'
        }
      },
      boxShadow: {
        'soft-xl': '0 16px 50px rgba(0,0,0,0.30)'
      }
    }
  },
  plugins: []
};
