const STORAGE_KEY = 'minhas-financas.theme';
export const THEME_EVENT = 'mf:theme-change';
export const getTheme = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light';

// Theme is a device preference; it never changes financial data or user records.
export function installTheme(app) {
    function apply(theme, persist = false) {
        const dark = theme === 'dark';
        app.setDarkMode(dark);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1221' : '#f6f9ff');
        if (persist) {
            try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light'); } catch { /* Private/blocked storage still allows this session's choice. */ }
        }
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: getTheme() } }));
    }
    apply(getTheme());
    window.addEventListener('storage', event => {
        if (event.key === STORAGE_KEY || event.key === null) apply(event.newValue === 'dark' ? 'dark' : 'light');
    });
    return { set(theme) { apply(theme, true); } };
}
