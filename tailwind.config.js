import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * FluentCopilot brand palette.
         * Primary is a vivid violet — used for hero CTAs, active nav, brand mark.
         * Mirrors Tailwind's violet ramp for predictable utility coverage,
         * but keys are kept under `primary` so existing `primary-xxx`
         * references throughout the codebase pick up the new identity.
         */
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        /**
         * Secondary indigo — used as a subtle accent and for legacy
         * blue references that have been migrated.
         */
        accent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        /**
         * Neutrals.
         * Surface is a warm off-white reminiscent of premium dashboard UIs;
         * elevated keeps cards crisp white with soft shadows.
         */
        surface: {
          DEFAULT: '#f7f7f4',
          elevated: '#ffffff',
          muted: '#eeede8',
          subtle: '#fafaf7',
        },
        ink: {
          primary: '#0f172a',
          secondary: '#334155',
          tertiary: '#64748b',
        },
        success: '#16a34a',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.625rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'title': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'body': ['1rem', { lineHeight: '1.5rem' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'caption': ['0.75rem', { lineHeight: '1rem' }],
        'eyebrow': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.14em', fontWeight: '700' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'sidebar': '240px',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      borderRadius: {
        'card': '20px',
        'sheet': '24px',
        'pill': '999px',
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 14px -6px rgb(15 23 42 / 0.06)',
        'elevated': '0 4px 24px -8px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.04)',
        'hero': '0 18px 48px -20px rgb(124 58 237 / 0.45), 0 8px 18px -10px rgb(15 23 42 / 0.10)',
        'sidebar': '0 1px 2px 0 rgb(15 23 42 / 0.04)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
        'brand-gradient-soft':
          'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(99,102,241,0.10) 100%)',
        'hero-radial':
          'radial-gradient(circle at 0% 0%, rgba(167,139,250,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(99,102,241,0.12), transparent 60%)',
      },
      keyframes: {
        'lesson-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'lesson-flash-success': {
          '0%': { boxShadow: '0 0 0 0 rgb(34 197 94 / 0.5)' },
          '100%': { boxShadow: '0 0 0 12px rgb(34 197 94 / 0)' },
        },
        'lesson-pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.06)', opacity: '0.85' },
        },
        /** Learn path — one-shot when a node becomes completed (subtle, adult tone). */
        'path-node-complete': {
          '0%': {
            boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.18)',
            transform: 'scale(1)',
          },
          '45%': {
            boxShadow: '0 0 0 8px rgba(34, 197, 94, 0.06)',
            transform: 'scale(1.008)',
          },
          '100%': {
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)',
            transform: 'scale(1)',
          },
        },
        /** Next lesson — soft invite (2 cycles, adult / premium). */
        'path-next-invite': {
          '0%, 100%': {
            boxShadow: '0 2px 8px -2px rgba(124, 58, 237, 0.14), 0 0 0 0 rgba(124, 58, 237, 0)',
          },
          '50%': {
            boxShadow: '0 10px 28px -6px rgba(124, 58, 237, 0.22), 0 0 0 1px rgba(124, 58, 237, 0.18)',
          },
        },
        'progress-fill-emphasis': {
          '0%': { opacity: '0.7', transform: 'scaleX(0.96)' },
          '100%': { opacity: '1', transform: 'scaleX(1)' },
        },
        'learn-segment-crossfade': {
          '0%': { opacity: '0.92' },
          '100%': { opacity: '1' },
        },
        /** Interaction layer — guided chat, feedback */
        'fc-typing-dot': {
          '0%, 80%, 100%': { opacity: '0.35', transform: 'scale(0.92)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
        'fc-message-in': {
          '0%': { opacity: '0', transform: 'translate3d(0, 8px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'fc-feedback-hero': {
          '0%': { opacity: '0', transform: 'translate3d(0, 10px, 0) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        'fc-soft-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '75%': { transform: 'translateX(3px)' },
        },
        /** Speak Live — waveform bars */
        'fc-speak-bar': {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'lesson-shake': 'lesson-shake 0.45s ease-in-out',
        'lesson-flash-success': 'lesson-flash-success 0.5s ease-out',
        'lesson-pulse-ring': 'lesson-pulse-ring 1.2s ease-in-out infinite',
        'path-node-complete': 'path-node-complete 0.7s ease-out forwards',
        'path-next-invite': 'path-next-invite 2.8s ease-in-out 2',
        'progress-fill-emphasis': 'progress-fill-emphasis 0.55s ease-out forwards',
        'learn-segment-crossfade': 'learn-segment-crossfade 0.2s ease-out',
        'fc-typing-dot': 'fc-typing-dot 1.05s ease-in-out infinite',
        'fc-message-in': 'fc-message-in 0.32s ease-out forwards',
        'fc-feedback-hero': 'fc-feedback-hero 0.45s ease-out forwards',
        'fc-soft-shake': 'fc-soft-shake 0.38s ease-in-out',
        'fc-speak-bar': 'fc-speak-bar 0.42s ease-in-out infinite',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('motion-safe', '@media (prefers-reduced-motion: no-preference)')
    }),
  ],
}
