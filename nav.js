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
        // Load Material Icons if not already loaded
        if (!document.querySelector('link[href*="material-icons"]')) {
            const materialIcons = document.createElement('link');
            materialIcons.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
            materialIcons.rel = 'stylesheet';
            document.head.appendChild(materialIcons);
        }
        
        // Load Roboto font if not already loaded
        if (!document.querySelector('link[href*="Roboto"]')) {
            const robotoFont = document.createElement('link');
            robotoFont.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap';
            robotoFont.rel = 'stylesheet';
            document.head.appendChild(robotoFont);
        }
    }
    
    createNavigation() {
        // Create navigation HTML with Material Design
        const navHTML = `
            <nav class="md-xr-nav md-xr-nav-${this.options.variant}" id="md-xr-navigation">
                <div class="md-xr-nav-container">
                    <div class="md-xr-nav-start">
                        <button class="md-icon-button md-nav-menu-btn" aria-label="Menu" onclick="mdXrNav.toggleDrawer()">
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
                        <button class="md-icon-button" onclick="mdXrNav.toggleVRDashboard()" title="Performance Dashboard">
                            <span class="material-icons">dashboard</span>
                        </button>
                        <button class="md-icon-button" onclick="mdXrNav.toggleFullscreen()" title="Fullscreen">
                            <span class="material-icons">fullscreen</span>
                        </button>
                        <div class="md-status-chip" id="md-nav-status">
                            <span class="md-status-dot"></span>
                            <span class="md-status-text">Ready</span>
                        </div>
                    </div>
                </div>
                
                <!-- Mobile Drawer -->
                <div class="md-nav-drawer" id="md-nav-drawer">
                    <div class="md-nav-drawer-content">
                        <div class="md-nav-drawer-header">
                            <span class="material-icons">explore</span>
                            <span>XR Labs</span>
                            <button class="md-icon-button" onclick="mdXrNav.closeDrawer()">
                                <span class="material-icons">close</span>
                            </button>
                        </div>
                        <div class="md-nav-drawer-items">
                            ${this.options.showHomeButton ? this.createDrawerItem('/', 'home', 'Home') : ''}
                            ${this.createDrawerItem('/assistant.html', 'smart_toy', 'AI Chat')}
                            ${this.createDrawerItem('/workspace.html', 'business', 'Workspace')}
                            ${this.createDrawerItem('/ar-showcase.html', 'view_in_ar', 'AR Showcase')}
                            <div class="md-nav-divider"></div>
                            ${this.createDrawerItem('#', 'dashboard', 'Performance', 'mdXrNav.toggleVRDashboard()')}
                            ${this.createDrawerItem('#', 'fullscreen', 'Fullscreen', 'mdXrNav.toggleFullscreen()')}
                        </div>
                    </div>
                </div>
                
                <!-- Drawer Overlay -->
                <div class="md-nav-overlay" id="md-nav-overlay" onclick="mdXrNav.closeDrawer()"></div>
            </nav>
        `;
        
        // Add to page
        document.body.insertAdjacentHTML('afterbegin', navHTML);
        this.navigation = document.getElementById('md-xr-navigation');
        this.drawer = document.getElementById('md-nav-drawer');
        
        // Add CSS if not already present
        if (!document.getElementById('md-xr-nav-styles')) {
            this.addStyles();
        }
        
        // Add body padding to account for fixed nav
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
    
    createDrawerItem(href, icon, text, onclick = null) {
        const onclickAttr = onclick ? `onclick="${onclick}"` : '';
        return `
            <a href="${href}" class="md-nav-drawer-item" data-page="${this.getPageFromHref(href)}" ${onclickAttr}>
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
    
    addStyles() {
        const styles = `
            <style id="md-xr-nav-styles">
                /* Material Design Color Tokens */
                :root {
                    --md-sys-color-primary: #A8C7FA;
                    --md-sys-color-on-primary: #002E69;
                    --md-sys-color-primary-container: #004494;
                    --md-sys-color-on-primary-container: #D6E3FF;
                    --md-sys-color-surface: #121318;
                    --md-sys-color-on-surface: #E3E2E6;
                    --md-sys-color-surface-variant: #44474F;
                    --md-sys-color-on-surface-variant: #C4C7C5;
                    --md-sys-color-surface-container: #1F1F23;
                    --md-sys-color-surface-container-high: #2A2A2E;
                    --md-sys-color-surface-container-highest: #35353A;
                    --md-sys-color-outline: #8E9297;
                    --md-sys-color-outline-variant: #44474F;
                    --md-sys-color-secondary-container: #3F4759;
                    --md-sys-color-on-secondary-container: #DBE2F9;
                    --md-sys-color-tertiary-container: #583E5B;
                    --md-sys-color-on-tertiary-container: #FAD8FB;
                    --md-sys-color-error-container: #93000A;
                    --md-sys-color-on-error-container: #FFDAD6;
                    --md-sys-elevation-level2: 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
                    --md-sys-elevation-level3: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15);
                }
                
                /* Navigation Base */
                .md-xr-nav {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    background-color: var(--md-sys-color-surface-container);
                    backdrop-filter: blur(16px);
                    border-bottom: 1px solid var(--md-sys-color-outline-variant);
                    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
                    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                
                .md-xr-nav-floating {
                    top: 16px;
                    left: 16px;
                    right: 16px;
                    border-radius: 16px;
                    box-shadow: var(--md-sys-elevation-level3);
                    border: 1px solid var(--md-sys-color-outline-variant);
                }
                
                .md-xr-nav-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 8px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    min-height: 64px;
                }
                
                .md-xr-nav-start {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }
                
                .md-nav-menu-btn {
                    display: none;
                }
                
                /* Logo */
                .md-xr-logo {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-decoration: none;
                    color: var(--md-sys-color-primary);
                    font-weight: 500;
                    font-size: 1.125rem;
                    transition: color 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
                }
                
                .md-xr-logo:hover {
                    color: var(--md-sys-color-on-primary-container);
                }
                
                .md-xr-logo .material-icons {
                    font-size: 28px;
                }
                
                .md-xr-logo-text {
                    font-family: 'Roboto Mono', monospace;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                }
                
                /* Navigation Links */
                .md-xr-nav-links {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex: 1;
                    justify-content: center;
                }
                
                .md-nav-link {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--md-sys-color-on-surface);
                    text-decoration: none;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: 500;
                    font-size: 0.875rem;
                    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    white-space: nowrap;
                }
                
                .md-nav-link::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: currentColor;
                    opacity: 0;
                    transition: opacity 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
                }
                
                .md-nav-link:hover::before {
                    opacity: 0.08;
                }
                
                .md-nav-link:focus::before {
                    opacity: 0.12;
                }
                
                .md-nav-link.active {
                    background-color: var(--md-sys-color-secondary-container);
                    color: var(--md-sys-color-on-secondary-container);
                }
                
                .md-nav-link .material-icons {
                    font-size: 20px;
                }
                
                /* Navigation Actions */
                .md-xr-nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }
                
                /* Icon Button */
                .md-icon-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 20px;
                    background: transparent;
                    color: var(--md-sys-color-on-surface);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                
                .md-icon-button::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: currentColor;
                    opacity: 0;
                    transition: opacity 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
                    border-radius: inherit;
                }
                
                .md-icon-button:hover::before {
                    opacity: 0.08;
                }
                
                .md-icon-button:focus::before {
                    opacity: 0.12;
                }
                
                .md-icon-button:active::before {
                    opacity: 0.12;
                }
                
                .md-icon-button .material-icons {
                    font-size: 24px;
                    position: relative;
                    z-index: 1;
                }
                
                /* Status Chip */
                .md-status-chip {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background-color: var(--md-sys-color-primary-container);
                    color: var(--md-sys-color-on-primary-container);
                    border-radius: 16px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    border: 1px solid transparent;
                }
                
                .md-status-chip.warning {
                    background-color: var(--md-sys-color-tertiary-container);
                    color: var(--md-sys-color-on-tertiary-container);
                }
                
                .md-status-chip.error {
                    background-color: var(--md-sys-color-error-container);
                    color: var(--md-sys-color-on-error-container);
                }
                
                .md-status-dot {
                    width: 6px;
                    height: 6px;
                    background: currentColor;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                /* Mobile Drawer */
                .md-nav-drawer {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 280px;
                    height: 100vh;
                    background-color: var(--md-sys-color-surface-container-high);
                    transform: translateX(-100%);
                    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
                    z-index: 1001;
                    box-shadow: var(--md-sys-elevation-level2);
                }
                
                .md-nav-drawer.open {
                    transform: translateX(0);
                }
                
                .md-nav-drawer-content {
                    padding: 16px 0;
                    height: 100%;
                    overflow-y: auto;
                }
                
                .md-nav-drawer-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 24px;
                    color: var(--md-sys-color-primary);
                    font-weight: 500;
                    font-size: 1.125rem;
                }
                
                .md-nav-drawer-header .material-icons {
                    font-size: 28px;
                }
                
                .md-nav-drawer-header .md-icon-button {
                    margin-left: auto;
                }
                
                .md-nav-drawer-items {
                    padding: 8px 0;
                }
                
                .md-nav-drawer-item {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 12px 24px;
                    color: var(--md-sys-color-on-surface);
                    text-decoration: none;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: background-color 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
                }
                
                .md-nav-drawer-item:hover {
                    background-color: var(--md-sys-color-surface-container-highest);
                }
                
                .md-nav-drawer-item.active {
                    background-color: var(--md-sys-color-secondary-container);
                    color: var(--md-sys-color-on-secondary-container);
                }
                
                .md-nav-drawer-item .material-icons {
                    font-size: 24px;
                }
                
                .md-nav-divider {
                    height: 1px;
                    background-color: var(--md-sys-color-outline-variant);
                    margin: 8px 24px;
                }
                
                .md-nav-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
                }
                
                .md-nav-overlay.visible {
                    opacity: 1;
                    visibility: visible;
                }
                
                /* VR Mode */
                .vr-mode .md-xr-nav {
                    display: none !important;
                }
                
                /* Responsive Design */
                @media (max-width: 768px) {
                    .md-nav-menu-btn {
                        display: flex;
                    }
                    
                    .md-xr-nav-links {
                        display: none;
                    }
                    
                    .md-xr-nav-container {
                        padding: 8px 16px;
                        min-height: 56px;
                    }
                    
                    .md-xr-logo-text {
                        display: none;
                    }
                    
                    .md-status-chip .md-status-text {
                        display: none;
                    }
                    
                    body {
                        padding-top: 56px !important;
                    }
                }
                
                /* Compact/Dense variant */
                .md-xr-nav.dense .md-xr-nav-container {
                    min-height: 48px;
                    padding: 4px 16px;
                }
                
                .md-xr-nav.dense .md-nav-link {
                    padding: 6px 12px;
                    font-size: 0.8125rem;
                }
                
                .md-xr-nav.dense .md-nav-link .material-icons {
                    font-size: 18px;
                }
                
                /* High contrast mode support */
                @media (prefers-contrast: high) {
                    .md-xr-nav {
                        border-bottom: 2px solid var(--md-sys-color-outline);
                    }
                    
                    .md-nav-link.active {
                        outline: 2px solid var(--md-sys-color-primary);
                    }
                }
                
                /* Reduced motion support */
                @media (prefers-reduced-motion: reduce) {
                    .md-xr-nav,
                    .md-nav-link,
                    .md-icon-button,
                    .md-nav-drawer {
                        transition: none;
                    }
                    
                    .md-status-dot {
                        animation: none;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    addEventListeners() {
        // Update navigation when page changes
        window.addEventListener('popstate', () => {
            this.updateActiveState();
        });
        
        // Performance monitoring
        this.startPerformanceMonitoring();
        
        // VR mode detection
        this.detectVRMode();
        
        // Keyboard navigation
        this.setupKeyboardNavigation();
        
        // Close drawer on route change
        window.addEventListener('beforeunload', () => {
            this.closeDrawer();
        });
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            // Toggle drawer with Ctrl+M
            if (event.ctrlKey && event.key === 'm') {
                event.preventDefault();
                this.toggleDrawer();
            }
            
            // Close drawer with Escape
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
                (page === 'home' && (currentPath === '/' || currentPath === '/index.html')) ||
                (page === 'assistant' && currentPath.includes('assistant')) ||
                (page === 'workspace' && currentPath.includes('workspace')) ||
                (page === 'ar' && currentPath.includes('ar'))
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
            
            if (currentTime - lastTime >= 2000) { // Update every 2 seconds
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                statusChip.classList.remove('warning', 'error');
                
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
            scene.addEventListener('enter-vr', () => {
                document.body.classList.add('vr-mode');
            });
            
            scene.addEventListener('exit-vr', () => {
                document.body.classList.remove('vr-mode');
            });
        }
    }
    
    // Public methods
    toggleDrawer() {
        const overlay = document.getElementById('md-nav-overlay');
        
        if (this.isDrawerOpen) {
            this.closeDrawer();
        } else {
            this.drawer.classList.add('open');
            overlay.classList.add('visible');
            this.isDrawerOpen = true;
            
            // Focus first item for accessibility
            const firstItem = this.drawer.querySelector('.md-nav-drawer-item');
            if (firstItem) firstItem.focus();
        }
    }
    
    closeDrawer() {
        const overlay = document.getElementById('md-nav-overlay');
        
        this.drawer.classList.remove('open');
        overlay.classList.remove('visible');
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
        } else if (window.xrOptimizer) {
            console.log('📊 XR Optimizer Stats:', window.xrOptimizer.getStats());
            this.setStatus('info', 'Check Console');
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
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    this.setStatus('ready', 'Ready');
                });
            }
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
        
        // Auto-clear status after 3 seconds for non-persistent states
        if (status === 'info' || status === 'error') {
            setTimeout(() => {
                this.setStatus('ready', 'Ready');
            }, 3000);
        }
    }
    
    setVariant(variant) {
        this.navigation.className = this.navigation.className.replace(/md-xr-nav-\w+/, `md-xr-nav-${variant}`);
        this.options.variant = variant;
    }
    
    hide() {
        this.navigation.style.transform = 'translateY(-100%)';
    }
    
    show() {
        this.navigation.style.transform = 'translateY(0)';
    }
    
    destroy() {
        if (this.navigation) {
            this.navigation.remove();
        }
        
        const styles = document.getElementById('md-xr-nav-styles');
        if (styles) {
            styles.remove();
        }
        
        // Reset body padding
        document.body.style.paddingTop = '';
    }
}

// Auto-initialize navigation
let mdXrNav;
document.addEventListener('DOMContentLoaded', () => {
    // Detect current page for active state
    const path = window.location.pathname;
    let currentPage = 'home';
    
    if (path.includes('assistant')) currentPage = 'assistant';
    else if (path.includes('workspace')) currentPage = 'workspace';
    else if (path.includes('ar')) currentPage = 'ar';
    
    mdXrNav = new MaterialXRNavigation({
        currentPage: currentPage,
        showBackButton: false, // Material Design doesn't typically use back buttons in nav
        showHomeButton: path !== '/' && path !== '/index.html',
        variant: 'top', // top, floating
        dense: false
    });
    
    console.log('🧭 Material Design Navigation initialized');
});

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MaterialXRNavigation;
} else {
    window.MaterialXRNavigation = MaterialXRNavigation;
}
