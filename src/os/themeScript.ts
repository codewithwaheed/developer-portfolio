// Server-safe: imported by app/layout.tsx. Keep in sync with useTheme() in theme.ts.
export const THEME_KEY = 'agentos.theme';

/**
 * Inline script for <head>: sets data-theme before first paint so the page
 * never flashes the wrong theme. Mirrors the resolution in useTheme().
 */
export const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem('${THEME_KEY}'));}catch(e){}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t;})();`;
