/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ---------------------------------------------------------------
        // Pitchonix Dashboard Design System (Phase Δ — Soft Sage)
        // Premium SaaS palette: warm beige page bg, sage green accents,
        // soft white surfaces, calm neutrals. Used by every dashboard page.
        // ---------------------------------------------------------------
        page: '#EDEBE6',
        surface: '#FFFFFF',
        'surface-soft': '#F7F6F2',
        'surface-muted': '#F1F0EC',
        ink: {
          DEFAULT: '#111111',
          soft: '#6B6B6B',
          muted: '#9A9A9A',
          action: '#111114',
        },
        sage: {
          50: '#EEF5F1',
          100: '#DDE8E1',
          200: '#C5D9CB',
          300: '#A8B9AE',
          400: '#7A988A',
          500: '#4F7563',
          600: '#3F6452',
          700: '#355846',
          800: '#263F34',
          900: '#1A2D24',
          DEFAULT: '#4F7563',
        },
        beige: {
          50: '#F7F6F2',
          100: '#F1F0EC',
          200: '#EDEBE6',
          300: '#E3E1DA',
          400: '#C9C6BD',
        },
        line: '#E3E1DA',
        // Status accents
        ok: { DEFAULT: '#4F7563', soft: '#E6F0EA' },
        warn: { DEFAULT: '#D9A441', soft: '#FAEEDB' },
        danger: { DEFAULT: '#D96A6A', soft: '#F7E3E3' },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '3xl': '1.5rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        // Soft floating-card shadow (premium SaaS look)
        'soft':   '0 12px 30px rgba(38, 63, 52, 0.06)',
        'card':   '0 20px 50px rgba(38, 63, 52, 0.06)',
        'lifted': '0 28px 60px rgba(38, 63, 52, 0.10)',
        'modal':  '0 30px 80px rgba(0, 0, 0, 0.18)',
        'pill':   '0 12px 30px rgba(0, 0, 0, 0.06)',
        'sage':   '0 14px 30px rgba(79, 117, 99, 0.22)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'var(--font-sans)', 'Manrope', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
