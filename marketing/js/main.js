// Theme Management System
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.applyTheme(this.currentTheme);
        this.initializeToggle();
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    getStoredTheme() {
        return localStorage.getItem('marketing_theme');
    }

    applyTheme(theme) {
        if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem('marketing_theme');
            this.updateToggleUI('system');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('marketing_theme', theme);
            this.updateToggleUI(theme);
        }
        this.currentTheme = theme;
    }

    initializeToggle() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                const btn = e.target.closest('.theme-toggle-option');
                if (btn) {
                    const newTheme = btn.dataset.theme;
                    this.applyTheme(newTheme);
                }
            });
        }
    }

    updateToggleUI(activeTheme) {
        const options = document.querySelectorAll('.theme-toggle-option');
        options.forEach(option => {
            option.classList.toggle('active', option.dataset.theme === activeTheme);
        });
    }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Initialize theme management
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});
