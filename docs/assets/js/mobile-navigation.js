/**
 * Mobile Navigation Enhancement
 * Handles mobile-specific navigation behaviors and optimizations
 */

class MobileNavigation {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('sidebar-overlay');
        this.toggleButton = document.querySelector('.sidebar-toggle');
        this.main = document.getElementById('main');
        
        this.isOpen = false;
        this.isMobile = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        
        this.init();
    }

    init() {
        if (!this.sidebar || !this.toggleButton) return;
        
        this.checkMobile();
        this.setupEventListeners();
        this.setupTouchNavigation();
        this.setupKeyboardNavigation();
        this.optimizeForMobile();
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
        
        // Listen for resize events
        window.addEventListener('resize', this.debounce(() => {
            this.checkMobile();
            this.handleResize();
        }, 150));
    }

    checkMobile() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            this.handleMobileToggle();
        }
        
        this.updateLayout();
    }

    handleMobileToggle() {
        if (this.isMobile) {
            // Switching to mobile
            this.close();
            this.enableTouchNavigation();
        } else {
            // Switching to desktop
            this.open();
            this.disableTouchNavigation();
        }
    }

    updateLayout() {
        document.body.classList.toggle('mobile-layout', this.isMobile);
        
        if (this.isMobile) {
            this.sidebar?.classList.remove('is-open');
            this.toggleButton?.setAttribute('aria-expanded', 'false');
        } else {
            this.sidebar?.classList.add('is-open');
            this.toggleButton?.setAttribute('aria-expanded', 'true');
        }
    }

    setupEventListeners() {
        // Toggle button
        this.toggleButton?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });

        // Overlay click (mobile only)
        this.overlay?.addEventListener('click', () => {
            if (this.isMobile) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen && this.isMobile) {
                this.close();
            }
        });

        // Close sidebar when clicking main content links on mobile
        this.main?.addEventListener('click', (e) => {
            if (this.isMobile && this.isOpen && e.target.tagName === 'A') {
                this.close();
            }
        });
    }

    setupTouchNavigation() {
        if (!('ontouchstart' in window)) return;

        // Swipe to open/close sidebar
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (e.touches.length > 0) return;
            
            this.touchEndX = e.changedTouches[0].clientX;
            this.touchEndY = e.changedTouches[0].clientY;
            
            this.handleSwipeGesture();
        }, { passive: true });
    }

    handleSwipeGesture() {
        if (!this.isMobile) return;

        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const swipeThreshold = 50;
        const velocityThreshold = 0.3;

        // Check if it's a horizontal swipe (not vertical scroll)
        if (Math.abs(deltaY) > Math.abs(deltaX)) return;

        const swipeDistance = Math.abs(deltaX);
        if (swipeDistance < swipeThreshold) return;

        // Right swipe from left edge - open sidebar
        if (deltaX > 0 && this.touchStartX < 50 && !this.isOpen) {
            this.open();
        }
        // Left swipe when sidebar is open - close sidebar
        else if (deltaX < 0 && this.isOpen) {
            this.close();
        }
    }

    enableTouchNavigation() {
        document.body.classList.add('touch-navigation');
    }

    disableTouchNavigation() {
        document.body.classList.remove('touch-navigation');
    }

    setupKeyboardNavigation() {
        // Tab trapping when sidebar is open on mobile
        document.addEventListener('keydown', (e) => {
            if (!this.isMobile || !this.isOpen || e.key !== 'Tab') return;

            const focusableElements = this.sidebar?.querySelectorAll(
                'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            
            if (!focusableElements?.length) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    optimizeForMobile() {
        if (!this.isMobile) return;

        // Optimize touch targets
        const navLinks = this.sidebar?.querySelectorAll('.nav-link');
        navLinks?.forEach(link => {
            const computedStyle = window.getComputedStyle(link);
            const height = parseInt(computedStyle.minHeight);
            
            if (height < 44) {
                link.style.minHeight = '44px';
                link.style.display = 'flex';
                link.style.alignItems = 'center';
            }
        });

        // Add touch feedback
        this.addTouchFeedback();
    }

    addTouchFeedback() {
        const interactiveElements = document.querySelectorAll(
            '.nav-link, .page-nav-link, .sidebar-toggle, .theme-toggle'
        );

        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            }, { passive: true });

            element.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.classList.remove('touch-active');
                }, 150);
            }, { passive: true });

            element.addEventListener('touchcancel', function() {
                this.classList.remove('touch-active');
            }, { passive: true });
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.sidebar?.classList.add('open');
        this.overlay?.classList.add('active');
        this.toggleButton?.setAttribute('aria-expanded', 'true');
        
        if (this.isMobile) {
            document.body.classList.add('sidebar-open');
            // Prevent body scroll when sidebar is open
            document.body.style.overflow = 'hidden';
            
            // Focus first focusable element in sidebar
            const firstFocusable = this.sidebar?.querySelector('a, button, input');
            firstFocusable?.focus();
        }

        this.triggerEvent('sidebar:open');
    }

    close() {
        this.isOpen = false;
        this.sidebar?.classList.remove('open');
        this.overlay?.classList.remove('active');
        this.toggleButton?.setAttribute('aria-expanded', 'false');
        
        if (this.isMobile) {
            document.body.classList.remove('sidebar-open');
            document.body.style.overflow = '';
        }

        this.triggerEvent('sidebar:close');
    }

    handleOrientationChange() {
        this.checkMobile();
        
        // Close sidebar on mobile when rotating to landscape
        if (this.isMobile && this.isOpen && window.orientation !== 0) {
            this.close();
        }
    }

    handleResize() {
        // Adjust layout for new viewport size
        this.optimizeForMobile();
    }

    triggerEvent(eventName) {
        const event = new CustomEvent(eventName, {
            detail: { isOpen: this.isOpen, isMobile: this.isMobile }
        });
        document.dispatchEvent(event);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Auto-initialize
function initMobileNavigation() {
    if (typeof window.MobileNavigation === 'undefined') {
        window.MobileNavigation = new MobileNavigation();
    }
}

// Export for external use
window.initMobileNavigation = initMobileNavigation;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNavigation);
} else {
    initMobileNavigation();
}

// CSS for touch feedback
const style = document.createElement('style');
style.textContent = `
.touch-active {
    opacity: 0.7;
    transform: scale(0.98);
    transition: all 0.1s ease-out;
}

.mobile-layout .nav-link,
.mobile-layout .page-nav-link {
    min-height: 44px;
}

.sidebar-open {
    position: fixed;
    width: 100%;
}

@media (max-width: 768px) {
    .touch-navigation .nav-link:hover {
        background-color: transparent;
    }
    
    .touch-navigation .nav-link:active,
    .touch-navigation .nav-link.touch-active {
        background-color: var(--color-bg-tertiary);
    }
}
`;
document.head.appendChild(style);