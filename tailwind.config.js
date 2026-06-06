/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#070B1A',
          card: '#0D1530',
          card2: '#111827',
        },
        cyan: {
          neon: '#00D9FF',
          dim: '#00A3BF',
        },
        purple: {
          neon: '#8B5CF6',
          dim: '#6D3FC4',
        },
        green: {
          neon: '#00FF88',
        },
        orange: {
          neon: '#FF8C00',
        },
        red: {
          neon: '#FF2D55',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '20px',
      },
      boxShadow: {
        cyan: '0 0 20px rgba(0,217,255,0.3)',
        purple: '0 0 20px rgba(139,92,246,0.3)',
        green: '0 0 20px rgba(0,255,136,0.3)',
      },
      backgroundImage: {
        'card-gradient': 'linear-gradient(135deg, #0D1530 0%, #1a0d3a 100%)',
        'card-gradient2': 'linear-gradient(135deg, #0f1f3d 0%, #0d1530 100%)',
        'cyan-gradient': 'linear-gradient(135deg, #00D9FF 0%, #8B5CF6 100%)',
      },
    },
  },
  plugins: [],
}
