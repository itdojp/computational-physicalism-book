/**
 * Main JavaScript file for book site
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initializeTheme();
    initializeSidebar();
    initializeCodeCopy();
    initializeSearch();
    initializeMobileNavigation();
    
    // Add smooth scrolling to anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Handle keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Alt+S to toggle sidebar
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            const toggleBtn = document.querySelector('.sidebar-toggle');
            if (toggleBtn) toggleBtn.click();
        }
        
        // Alt+T to toggle theme
        if (e.altKey && e.key === 't') {
            e.preventDefault();
            const themeBtn = document.querySelector('.theme-toggle');
            if (themeBtn) themeBtn.click();
        }
    });
});

// Initialize theme if not already done
function initializeTheme() {
    if (typeof window.initTheme === 'function') {
        window.initTheme();
    }
}

// Initialize sidebar if not already done
function initializeSidebar() {
    if (typeof window.initSidebar === 'function') {
        window.initSidebar();
    }
}

// Initialize code copy if not already done
function initializeCodeCopy() {
    if (typeof window.initCodeCopy === 'function') {
        window.initCodeCopy();
    }
}

// Initialize search if not already done
function initializeSearch() {
    if (typeof window.initSearch === 'function') {
        window.initSearch();
    }
}

// Initialize mobile navigation if not already done
function initializeMobileNavigation() {
    if (typeof window.initMobileNavigation === 'function') {
        window.initMobileNavigation();
    }
}

// Export for use in other modules
window.mainInit = {
    initializeTheme,
    initializeSidebar,
    initializeCodeCopy,
    initializeSearch,
    initializeMobileNavigation
};