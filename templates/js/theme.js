/**
 * Theme Management
 * Handles light/dark theme switching with system preference detection
 */

class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupThemeToggle();
        this.setupSystemThemeListener();
        this.applyInitialTheme();
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    setupSystemThemeListener() {
        // Listen for system theme changes
        if (typeof window.matchMedia === 'function') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => {
                // Only update if user hasn't manually set a preference
                if (!this.getStoredTheme()) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            };
            if (typeof mediaQuery.addEventListener === 'function') {
                mediaQuery.addEventListener('change', handler);
            } else if (typeof mediaQuery.addListener === 'function') {
                mediaQuery.addListener(handler);
            }
        }
    }

    applyInitialTheme() {
        const savedTheme = this.getStoredTheme();
        const systemPrefersDark = typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;

        let theme;
        if (savedTheme) {
            theme = savedTheme;
        } else if (systemPrefersDark) {
            theme = 'dark';
        } else {
            theme = 'light';
        }

        this.setTheme(theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        this.safeSetItem('theme', newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeToggleIcon(theme);

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme }
        }));
    }

    updateThemeToggleIcon(theme) {
        const lightIcon = document.querySelector('.theme-icon-light');
        const darkIcon = document.querySelector('.theme-icon-dark');

        if (lightIcon && darkIcon) {
            if (theme === 'light') {
                lightIcon.style.display = 'block';
                darkIcon.style.display = 'none';
            } else {
                lightIcon.style.display = 'none';
                darkIcon.style.display = 'block';
            }
        }
    }

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme');
    }

    safeGetItem(key) {
        try {
            return window.localStorage ? window.localStorage.getItem(key) : null;
        } catch (e) {
            return null;
        }
    }

    safeSetItem(key, value) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {}
    }

    normalizeTheme(value) {
        return value === 'dark' || value === 'light' ? value : null;
    }

    getStoredTheme() {
        const currentTheme = this.normalizeTheme(this.safeGetItem('theme'));
        if (currentTheme) {
            return currentTheme;
        }

        const legacyTheme = this.normalizeTheme(this.safeGetItem('book-theme'));
        if (legacyTheme) {
            this.safeSetItem('theme', legacyTheme);
            return legacyTheme;
        }

        return null;
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}
