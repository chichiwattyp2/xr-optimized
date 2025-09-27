// nav.js - Material Design Navigation Component for XR Labs
class MaterialXRNavigation {
    constructor(options = {}) {
        this.options = {
            currentPage: options.currentPage || '',
            showBackButton: options.showBackButton !== false,
            showHomeButton: options.showHomeButton !== false,
            variant: options.variant || 'top', // top, floating, drawer
            dense: options.dense || false,
            ...options
        };

        this.navigation = null;
        this.drawer = null;
        this.overlay = null;
        this.isDrawerOpen = false;
        this.init();
    }

    init() {
        this.loadMaterialResources();
        this.createNavigation();
        this.addEventListeners();
        this.updateActiveState();
    }

    loadMaterialResources() {
        if (!document.querySelector('link[href*="material-icons"]')) {
            const materialIcons = document.createElement('link');
            materialIcons.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
            materialIcons.rel = 'stylesheet';
            document.head.appendChild(materialIcons);
        }

        if (!document.querySelector('link[href*="Roboto"]')) {
            const robotoFont = document.createElement('link');
            robotoFont.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap';
            robotoFont.rel = 'stylesheet';
            document.head.appendChild(robotoFont);
        }
    }

    createNavigation() {
        const navHTML = `
            <nav class="md-xr-nav md-xr-nav-${this.options.variant}" id="md-xr-navigation">
                <div class="md-xr-nav-container">
                    <div class="md-xr-nav-start">
                        <button class="md-icon-button md-nav-menu-btn" aria-label="Menu" id="md-nav-menu-btn">
                            <span class="material-icons">menu</span>
                        </button>
                        
                        <a href="/" class="md-xr-logo">
                            <span class="material-icons">explore</span>
                            <span class="md-xr-logo-text">XR LABS</span>
                        </a>
                    </div>
                    
                    <div class="md-xr-nav-links">
                        ${this.options.showHomeButton ? this.createNavLink('/', 'home', 'Home') : ''}
                        ${this.createNavLink('/assistant.html', 'smart_toy', 'AI Chat')}
                        ${this.createNavLink('/workspace.html', 'business', 'Workspace')}
                        ${this.createNavLink('/ar-showcase.html', 'view_in_ar', 'AR')}
                    </div>
                    
                    <div class="md-xr-nav-actions">
                        <button class="md-icon-button" id="md-nav-dashboard-btn" title="Performance Dashboard">
                            <span class="material-icons">dashboard</span>
                        </button>
                        <button class="md-icon-button" id="md-nav-fullscreen-btn" title="Fullscreen">
                            <span class="material-icons">fullscreen</span>
                        </button>
                        <div class="md-status-chip" id="md-nav-status">
                            <span class="md-status-dot"></span>
                            <span class="md-status-text">Ready</span>
                        </div>
                    </div>
                </div>
                
                <div class="md-nav-drawer" id="md-nav-drawer">
                    <div class="md-nav-drawer-content">
                        <div class="md-nav-drawer-header">
                            <span class="material-icons">explore</span>
                            <span>XR Labs</span>
                            <button class="md-icon-button" id="md-nav-drawer-close">
                                <span class="material-icons">close</span>
                            </button>
                        </div>
                        <div class="md-nav-drawer-items">
                            ${this.options.showHomeButton ? this.createDrawerItem('/', 'home', 'Home') : ''}
                            ${this.createDrawerItem('/assistant.html', 'smart_toy', 'AI Chat')}
                            ${this.createDrawerItem('/workspace.html', 'business', 'Workspace')}
                            ${this.createDrawerItem('/ar-showcase.html', 'view_in_ar', 'AR Showcase')}
                            <div class="md-nav-divider"></div>
                            ${this.createDrawerItem('#', 'dashboard', 'Performance', 'dashboard')}
                            ${this.createDrawerItem('#', 'fullscreen', 'Fullscreen', 'fullscreen')}
                        </div>
                    </div>
                </div>
                
                <div class="md-nav-overlay" id="md-nav-overlay"></div>
            </nav>
        `;

        document.body.insertAdjacentHTML('afterbegin', navHTML);
        this.navigation = document.getElementById('md-xr-navigation');
        this.drawer = document.getElementById('md-nav-drawer');
        this.overlay = document.getElementById('md-nav-overlay');

        if (!document.getElementById('md-xr-nav-styles')) {
            this.addStyles();
        }

        if (this.options.variant === 'top') {
            document.body.style.paddingTop = this.options.dense ? '56px' : '64px';
        }
    }

    createNavLink(href, icon, text) {
        return `
            <a href="${href}" class="md-nav-link" data-page="${this.getPageFromHref(href)}">
                <span class="material-icons">${icon}</span>
                <span class="md-nav-link-text">${text}</span>
            </a>
        `;
    }

    createDrawerItem(href, icon, text, action = null) {
        const attr = action ? `data-action="${action}"` : '';
        return `
            <a href="${href}" class="md-nav-drawer-item" data-page="${this.getPageFromHref(href)}" ${attr}>
                <span class="material-icons">${icon}</span>
                <span>${text}</span>
            </a>
        `;
    }

    getPageFromHref(href) {
        if (href === '/' || href.includes('index')) return 'home';
        if (href.includes('assistant')) return 'assistant';
        if (href.includes('workspace')) return 'workspace';
        if (href.includes('ar')) return 'ar';
        return '';
    }

    addEventListeners() {
        const menuBtn = document.getElementById('md-nav-menu-btn');
        const closeBtn = document.getElementById('md-nav-drawer-close');
        const dashboardBtn = document.getElementById('md-nav-dashboard-btn');
        const fullscreenBtn = document.getElementById('md-nav-fullscreen-btn');

        if (menuBtn) menuBtn.addEventListener('click', () => this.toggleDrawer());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeDrawer());
        if (this.overlay) this.overlay.addEventListener('click', () => this.closeDrawer());

        if (dashboardBtn) dashboardBtn.addEventListener('click', () => this.toggleVRDashboard());
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        this.navigation.querySelectorAll('.md-nav-drawer-item[data-action]').forEach(item => {
            item.addEventListener('click', e => {
                const action = e.currentTarget.dataset.action;
                if (action === 'dashboard') this.toggleVRDashboard();
                if (action === 'fullscreen') this.toggleFullscreen();
                this.closeDrawer();
            });
        });

        window.addEventListener('popstate', () => this.updateActiveState());
        this.startPerformanceMonitoring();
        this.detectVRMode();
        this.setupKeyboardNavigation();
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key.toLowerCase() === 'm') {
                event.preventDefault();
                this.toggleDrawer();
            }
            if (event.key === 'Escape' && this.isDrawerOpen) {
                this.closeDrawer();
            }
        });
    }

    updateActiveState() {
        const links = this.navigation.querySelectorAll('.md-nav-link[data-page], .md-nav-drawer-item[data-page]');
        const currentPath = window.location.pathname;

        links.forEach(link => {
            link.classList.remove('active');
            const page = link.getAttribute('data-page');
            if (
                (page === 'home' && (currentPath === '/' || currentPath.endsWith('index.html'))) ||
                (page === 'assistant' && currentPath.includes('assistant')) ||
                (page === 'workspace' && currentPath.includes('workspace')) ||
                (page === 'ar' && currentPath.includes('ar-showcase'))
            ) {
                link.classList.add('active');
            }
        });
    }

    startPerformanceMonitoring() {
        const statusChip = document.getElementById('md-nav-status');
        const statusText = statusChip.querySelector('.md-status-text');
        let frameCount = 0;
        let lastTime = performance.now();

        const updateStatus = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 2000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                statusChip.className = 'md-status-chip';
                if (fps >= 55) {
                    statusText.textContent = 'Optimal';
                } else if (fps >= 25) {
                    statusChip.classList.add('warning');
                    statusText.textContent = 'Good';
                } else {
                    statusChip.classList.add('error');
                    statusText.textContent = 'Low FPS';
                }
                frameCount = 0;
                lastTime = currentTime;
            }
            requestAnimationFrame(updateStatus);
        };
        updateStatus();
    }

    detectVRMode() {
        const scene = document.querySelector('a-scene');
        if (scene) {
            scene.addEventListener('enter-vr', () => document.body.classList.add('vr-mode'));
            scene.addEventListener('exit-vr', () => document.body.classList.remove('vr-mode'));
        }
    }

    toggleDrawer() {
        if (this.isDrawerOpen) {
            this.closeDrawer();
        } else {
            this.drawer.classList.add('open');
            this.overlay.classList.add('visible');
            this.isDrawerOpen = true;
            const firstItem = this.drawer.querySelector('.md-nav-drawer-item');
            if (firstItem) firstItem.focus();
        }
    }

    closeDrawer() {
        this.drawer.classList.remove('open');
        this.overlay.classList.remove('visible');
        this.isDrawerOpen = false;
    }

    toggleVRDashboard() {
        if (window.addVRDashboard) {
            const scene = document.querySelector('a-scene');
            if (scene) {
                if (!scene.components['vr-dashboard']) {
                    window.addVRDashboard(scene, { enabled: true });
                } else {
                    scene.components['vr-dashboard'].toggle();
                }
            }
        } else {
            console.log('📊 Performance Dashboard: Press Ctrl+Shift+D in VR');
            this.setStatus('info', 'Check Console');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                this.setStatus('info', 'Fullscreen');
            }).catch(err => {
                console.log('Fullscreen error:', err);
                this.setStatus('error', 'Fullscreen Failed');
            });
        } else if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                this.setStatus('ready', 'Ready');
            });
        }
    }

    setStatus(status, message) {
        const statusChip = document.getElementById('md-nav-status');
        const statusText = statusChip.querySelector('.md-status-text');
        statusChip.className = 'md-status-chip';
        if (status === 'error' || status === 'warning') {
            statusChip.classList.add(status);
        }
        statusText.textContent = message;
        if (status === 'info' || status === 'error') {
            setTimeout(() => this.setStatus('ready', 'Ready'), 3000);
        }
    }

    setVariant(variant) {
        this.navigation.className = this.navigation.className.replace(/md-xr-nav-\\w+/, `md-xr-nav-${variant}`);
        this.options.variant = variant;
    }

    hide() { this.navigation.style.transform = 'translateY(-100%)'; }
    show() { this.navigation.style.transform = 'translateY(0)'; }

    destroy() {
        if (this.navigation) this.navigation.remove();
        const styles = document.getElementById('md-xr-nav-styles');
        if (styles) styles.remove();
        document.body.style.paddingTop = '';
    }
}

let mdXrNav;
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let currentPage = 'home';
    if (path.includes('assistant')) currentPage = 'assistant';
    else if (path.includes('workspace')) currentPage = 'workspace';
    else if (path.includes('ar')) currentPage = 'ar';
    mdXrNav = new MaterialXRNavigation({
        currentPage,
        showBackButton: false,
        showHomeButton: !(path === '/' || path.endsWith('index.html')),
        variant: 'top',
        dense: false
    });
    console.log('🧭 Material Design Navigation initialized');
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MaterialXRNavigation;
} else {
    window.MaterialXRNavigation = MaterialXRNavigation;
}
