/* Kibi — Shared Tailwind CDN config */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      colors: {
        charcoal: '#0F1419',
        'charcoal-light': '#1C2128',
        cream: '#F7F5F0',
        'cream-dark': '#EDEAE3',
        sage: '#6B8E6E',
        'sage-light': '#8DAA8F',
        'sage-dark': '#557057',
        sand: '#C4B8A5',
        'sand-light': '#D9CFC0',
        border: '#E5E2DA',
        'border-light': '#F0EEE8',
        'text-main': '#2D2D2D',
        'text-secondary': '#6B6B6B',
        'text-muted': '#9A9A9A',
        error: '#C75B5B',
        success: '#6B8E6E'
      },
      fontFamily: {
        serif: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        script: ['Caveat', 'cursive']
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0, 0, 0, 0.05)',
        card: '0 8px 30px rgba(0, 0, 0, 0.08)',
        lg: '0 16px 50px rgba(0, 0, 0, 0.12)'
      }
    }
  }
};
