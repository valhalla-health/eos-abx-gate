// IBM Plex Sans Thai (400, 600) and IBM Plex Mono (500), OFL, bundled by Vite into dist/assets and
// served from this origin, so the CSP keeps font-src 'self' and no third party is asked for a font.
// Only the Thai and Latin subsets are imported; each @font-face uses font-display: swap.
import '@fontsource/ibm-plex-sans-thai/thai-400.css';
import '@fontsource/ibm-plex-sans-thai/latin-400.css';
import '@fontsource/ibm-plex-sans-thai/thai-600.css';
import '@fontsource/ibm-plex-sans-thai/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './ui/styles.css';
import { Session } from './flow/session';
import { render, type View } from './ui/render';

const root = document.getElementById('app');
if (!root) throw new Error('#app is missing from index.html');

const view: View = { root, session: new Session(), started: false, overrideOpen: false, now: () => new Date() };
render(view);

// The first screen draws in the system Thai font. The web fonts are switched on only after the load
// event, because a font fetched during loading holds that event back: on the 400 kbit/s profile the
// 60 KB of fonts took the first screen from 1.2 s to 3.3 s. All five faces are fetched at once, so no
// later screen makes a request (SRS sections 1 and 6: the page's own fonts are the one fetch after load).
// A font that fails to load leaves the system font in place, so the failure is dropped, not thrown.
function useWebFonts(): void {
  document.documentElement.classList.add('fonts');
  for (const font of ['400 1em "IBM Plex Sans Thai"', '600 1em "IBM Plex Sans Thai"', '500 1em "IBM Plex Mono"']) {
    document.fonts.load(font, 'กA').catch(() => {});
  }
}
if (document.readyState === 'complete') useWebFonts();
else window.addEventListener('load', useWebFonts, { once: true });
