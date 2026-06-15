import type { Config } from 'tailwindcss';
import typographyPlugin from '@tailwindcss/typography';
import animatePlugin from 'tailwindcss-animate';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        cream: { 
          DEFAULT: '#edeec9', 100: '#414315', 200: '#82852a', 300: '#bfc443', 
          400: '#d6d986', 500: '#edeec9', 600: '#f0f1d4', 700: '#f4f5de', 
          800: '#f8f8e9', 900: '#fbfcf4' 
        },
        beige: { 
          DEFAULT: '#dde7c7', 100: '#313c1a', 200: '#627833', 300: '#93b34e', 
          400: '#b8cd8a', 500: '#dde7c7', 600: '#e3ebd1', 700: '#eaf0dd', 
          800: '#f1f5e8', 900: '#f8faf4' 
        },
        tea_green: { 
          DEFAULT: '#bfd8bd', 100: '#1f331e', 200: '#3e663c', 300: '#5e9859', 
          400: '#8cba89', 500: '#bfd8bd', 600: '#cbdfc9', 700: '#d8e7d7', 
          800: '#e5efe4', 900: '#f2f7f2' 
        },
        celadon: { 
          DEFAULT: '#98c9a3', 100: '#182e1d', 200: '#315c3a', 300: '#498a57', 
          400: '#69b079', 500: '#98c9a3', 600: '#acd3b5', 700: '#c1dec7', 
          800: '#d6e9da', 900: '#eaf4ec' 
        },
        muted_teal: { 
          DEFAULT: '#77bfa3', 100: '#142a22', 200: '#285543', 300: '#3c7f65', 
          400: '#50a987', 500: '#77bfa3', 600: '#93ccb6', 700: '#aed9c8', 
          800: '#c9e6db', 900: '#e4f2ed' 
        }
      },
      animation: {
        'fade-rise': 'fadeRise 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeRise: {
          '0%': { opacity: '0', transform: 'translateY(24px) translateZ(0)' },
          '100%': { opacity: '1', transform: 'translateY(0) translateZ(0)' },
        }
      }
    },
  },
  plugins: [typographyPlugin, animatePlugin],
};

export default config;