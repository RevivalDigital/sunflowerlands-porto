/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pixel: {
          bg:       '#1a1c2c',
          panel:    '#2d2f3e',
          border:   '#3d4052',
          gold:     '#f7c948',
          'gold-dark': '#c9952a',
          green:    '#37b74a',
          'green-dark': '#1e7a2e',
          red:      '#e53535',
          blue:     '#4e9af1',
          purple:   '#9b59ff',
          text:     '#e8e8f0',
          muted:    '#7c7f99',
          sunflower:'#ffdd00',
          sky:      '#5fcde4',
          earth:    '#8b5e3c',
          grass:    '#5bb450',
        }
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono:  ['"Share Tech Mono"', 'monospace'],
        body:  ['"VT323"', 'monospace'],
      },
      boxShadow: {
        pixel:    '4px 4px 0px #000000',
        'pixel-sm':'2px 2px 0px #000000',
        'pixel-gold':'4px 4px 0px #c9952a',
        'pixel-green':'4px 4px 0px #1e7a2e',
        'pixel-red':'4px 4px 0px #8b1a1a',
        'pixel-blue':'4px 4px 0px #1a3a6e',
        glow:     '0 0 20px rgba(247, 201, 72, 0.4)',
        'glow-green':'0 0 20px rgba(55, 183, 74, 0.4)',
      },
      borderWidth: {
        pixel: '3px',
      },
      animation: {
        'pixel-bounce': 'pixelBounce 0.5s steps(4) infinite',
        'pixel-blink':  'pixelBlink 1s steps(1) infinite',
        'pixel-slide':  'pixelSlide 0.2s steps(4) forwards',
        'scanline':     'scanline 8s linear infinite',
        'float':        'float 3s ease-in-out infinite',
      },
      keyframes: {
        pixelBounce: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pixelBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        pixelSlide: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0px)', opacity: '1' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      },
    },
  },
  plugins: [],
}
