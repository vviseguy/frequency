import type { Config } from 'tailwindcss';

// Memphis-design palette: bright pastels over cream, with bold ink outlines.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF3E4',
        ink: '#1A1626',
        grape: '#7C5CFF',
        bubble: '#FF8FD6',
        tangerine: '#FF9F45',
        lime: '#9BE564',
        sky: '#5BC8FF',
        sun: '#FFD93D',
        coral: '#FF6B6B',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // chunky offset "sticker" shadow, a Memphis staple
        pop: '4px 4px 0 0 #1A1626',
        'pop-lg': '7px 7px 0 0 #1A1626',
        'pop-sm': '2px 2px 0 0 #1A1626',
      },
      borderWidth: { 3: '3px' },
      keyframes: {
        wiggle: {
          '0%,100%': { transform: 'rotate(-2.5deg)' },
          '50%': { transform: 'rotate(2.5deg)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0' },
          '12%': { opacity: '1' },
          '100%': { transform: 'translateY(-110vh) scale(1.4)', opacity: '0' },
        },
        drift: {
          '0%,100%': { transform: 'translate(0,0) rotate(0deg)' },
          '50%': { transform: 'translate(14px,-18px) rotate(8deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out infinite',
        'float-up': 'floatUp 3.4s ease-in forwards',
        drift: 'drift 9s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
