// vrDashboard.js - VR Performance Dashboard Component
AFRAME.registerComponent('vr-dashboard', {
    schema: {
        enabled: { default: false },
        position: { default: '2 1.6 -1' },
        showStats: { default: true },
        showOptimizations: { default: true },
        showNetwork: { default: true },
        showControls: { default: true },
        autoHide: { default: true },
        updateInterval: { default: 1000 },
        size: { default: 'medium' } // small, medium, large
    },
    
    init() {
        this.dashboard = null;
        this.panels = {};
        this.isVisible = false;
        this.lastUpdate = 0;
        this.statsHistory = [];
        this.maxHistoryLength = 60; // 1 minute at 1fps
        
        // Dashboard configuration
        this.config = {
            small: { width: 3, height: 2, fontSize: 0.15 },
            medium: { width: 4, height: 2.5, fontSize: 0.18 },
            large: { width: 5, height: 3, fontSize: 0.22 }
        };
        
        // Data sources
        this.xrOptimizer = window.xrOptimizer;
        this.performanceMonitor = null;
        this.spatialOptimizer = null;
        
        // Create dashboard if enabled
        if (this.data.enabled) {
            this.createDashboard();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start update loop
        this.tick = AFRAME.utils.throttleTick(this.updateDashboard.bind(this), this.data.updateInterval, this);
        
        console.log('VR Dashboard initialized');
    },
    
    createDashboard() {
        const size = this.config[this.data.size];
        
        // Main dashboard container
        this.dashboard = document.createElement('a-entity');
        this.dashboard.setAttribute('id', 'vr-dashboard');
        this.dashboard.setAttribute('position', this.data.position);
        
        // Background panel
        const background = document.createElement('a-plane');
        background.setAttribute('geometry', `width: ${size.width}; height: ${size.height}`);
        background.setAttribute('material', {
            color: '#1a1a1a',
            opacity: 0.9,
            transparent: true,
            shader: 'flat'
        });
        background.setAttribute('position', '0 0 -0.01');
        this.dashboard.appendChild(background);
        
        // Header
        this.createHeader(size);
        
        // Performance stats panel
        if (this.data.showStats) {
            this.createStatsPanel(size);
        }
        
        // Optimization status panel
        if (this.data.showOptimizations) {
            this.createOptimizationPanel(size);
        }
        
        // Network status panel
        if (this.data.showNetwork) {
            this.createNetworkPanel(size);
        }
        
        // Control buttons
        if (this.data.showControls) {
            this.createControlPanel(size);
        }
        
        // Performance graph (simplified)
        this.createPerformanceGraph(size);
        
        this.el.appendChild(this.dashboard);
        
        // Initially hide if auto-hide is enabled
        if (this.data.autoHide) {
            this.hideDashboard();
        } else {
            this.showDashboard();
        }
    },
    
    createHeader(size) {
        const header = document.createElement('a-text');
        header.setAttribute('value', '⚡ XR Performance Dashboard');
        header.setAttribute('position', `${-size.width/2 + 0.2} ${size.height/2 - 0.3} 0.01`);
        header.setAttribute('color', '#4ade80');
        header.setAttribute('width', size.fontSize * 35);
        header.setAttribute('font', 'dejavu');
        this.dashboard.appendChild(header);
        
        // Close button
        const closeBtn = document.createElement('a-box');
        closeBtn.setAttribute('geometry', 'width: 0.3; height: 0.3; depth: 0.05');
        closeBtn.setAttribute('material', { color: '#ef4444', opacity: 0.8, transparent: true });
        closeBtn.setAttribute('position', `${size.width/2 - 0.2} ${size.height/2 - 0.2} 0.02`);
        closeBtn.setAttribute('cursor-listener', '');
        
        const closeText = document.createElement('a-text');
        closeText.setAttribute('value', '×');
        closeText.setAttribute('color', '#ffffff');
        closeText.setAttribute('align', 'center');
        closeText.setAttribute('width', size.fontSize * 40);
        closeText.setAttribute('position', '0 0 0.01');
        
        closeBtn.appendChild(closeText);
        this.dashboard.appendChild(closeBtn);
        
        closeBtn.addEventListener('click', () => {
            this.hideDashboard();
        });
    },
    
    createStatsPanel(size) {
        const panel = document.createElement('a-entity');
        panel.setAttribute('position', `${-size.width/2 + 0.2} ${size.height/2 - 0.8} 0.01`);
        
        this.panels.stats = document.createElement('a-text');
        this.panels.stats.setAttribute('value', 'Loading stats...');
        this.panels.stats.setAttribute('color', '#ffffff');
        this.panels.stats.setAttribute('width', size.fontSize * 25);
        this.panels.stats.setAttribute('font', 'dejavu');
        
        panel.appendChild(this.panels.stats);
        this.dashboard.appendChild(panel);
    },
    
    createOptimizationPanel(size) {
        const panel = document.createElement('a-entity');
        panel.setAttribute('position', `${size.width/2 - 1.8} ${size.height/2 - 0.8} 0.01`);
        
        this.panels.optimizations = document.createElement('a-text');
        this.panels.optimizations.setAttribute('value', 'Loading optimizations...');
        this.panels.optimizations.setAttribute('color', '#ffffff');
        this.panels.optimizations.setAttribute('width', size.fontSize * 25);
        this.panels.optimizations.setAttribute('font', 'dejavu');
        
        panel.appendChild(this.panels.optimizations);
        this.dashboard.appendChild(panel);
    },
    
    createNetworkPanel(size) {
        const panel = document.createElement('a-entity');
        panel.setAttribute('position', `${-size.width/2 + 0.2} ${-size.height/2 + 0.8} 0.01`);
        
        this.panels.network = document.createElement('a-text');
        this.panels.network.setAttribute('value', 'Loading network...');
        this.panels.network.setAttribute('color', '#ffffff');
        this.panels.network.setAttribute('width', size.fontSize * 25);
        this.panels.network.setAttribute('font', 'dejavu');
        
        panel.appendChild(this.panels.network);
        this.dashboard.appendChild(panel);
    },
    
    createControlPanel(size) {
        const panel = document.createElement('a-entity');
        panel.setAttribute('position', `${size.width/2 - 1.8} ${-size.height/2 + 0.8} 0.01`);
        
        // Performance level buttons
        const levels = ['high', 'medium', 'low'];
        levels.forEach((level, index) => {
            const btn = document.createElement('a-box');
            btn.setAttribute('geometry', 'width: 0.5; height: 0.2; depth: 0.05');
            btn.setAttribute('material', { 
                color: level === 'high' ? '#22c55e' : level === 'medium' ? '#eab308' : '#ef4444',
                opacity: 0.7,
                transparent: true 
            });
            btn.setAttribute('position', `${index * 0.6} 0 0.02`);
            btn.setAttribute('cursor-listener', '');
            
            const btnText = document.createElement('a-text');
            btnText.setAttribute('value', level.toUpperCase());
            btnText.setAttribute('color', '#ffffff');
            btnText.setAttribute('align', 'center');
            btnText.setAttribute('width', size.fontSize * 20);
            btnText.setAttribute('position', '0 0 0.01');
            
            btn.appendChild(btnText);
            panel.appendChild(btn);
            
            btn.addEventListener('click', () => {
                this.setPerformanceLevel(level);
            });
        });
        
        this.dashboard.appendChild(panel);
    },
    
    createPerformanceGraph(size) {
        // Simplified performance graph using planes
        this.performanceGraph = document.createElement('a-entity');
        this.performanceGraph.setAttribute('position', `0 ${-size.height/2 + 0.4} 0.01`);
        
        // Graph background
        const graphBg = document.createElement('a-plane');
        graphBg.setAttribute('geometry', 'width: 3; height: 0.8');
        graphBg.setAttribute('material', { 
            color: '#2a2a2a', 
            opacity: 0.8, 
            transparent: true 
        });
        this.performanceGraph.appendChild(graphBg);
        
        // Graph lines (will be updated dynamically)
        this.graphPoints = [];
        for (let i = 0; i < 30; i++) {
            const point = document.createElement('a-box');
            point.setAttribute('geometry', 'width: 0.08; height: 0.02; depth: 0.01');
            point.setAttribute('material', { color: '#4ade80' });
            point.setAttribute('position', `${-1.4 + i * 0.1} 0 0.01`);
            point.setAttribute('visible', false);
            this.performanceGraph.appendChild(point);
            this.graphPoints.push(point);
        }
        
        this.dashboard.appendChild(this.performanceGraph);
    },
    
    setupEventListeners() {
        // Listen for XR optimizer events
        if (this.xrOptimizer) {
            this.xrOptimizer.on('performanceLevelChanged', (data) => {
                this.highlightPerformanceLevel(data.level);
            });
            
            this.xrOptimizer.on('voiceActivityStart', () => {
                this.showVoiceActivity(true);
            });
            
            this.xrOptimizer.on('voiceActivityEnd', () => {
                this.showVoiceActivity(false);
            });
        }
        
        // Toggle dashboard with keyboard shortcut
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'd') {
                event.preventDefault();
                this.toggleDashboard();
            }
        });
        
        // VR controller events (if available)
        this.el.addEventListener('buttondown', (event) => {
            if (event.detail.id === 1) { // B button or equivalent
                this.toggleDashboard();
            }
        });
    },
    
    updateDashboard(time, timeDelta) {
        if (!this.isVisible || !this.dashboard) return;
        
        const now = performance.now();
        if (now - this.lastUpdate < this.data.updateInterval) return;
        this.lastUpdate = now;
        
        // Gather data from all sources
        const data = this.gatherPerformanceData();
        
        // Update panels
        this.updateStatsPanel(data);
        this.updateOptimizationPanel(data);
        this.updateNetworkPanel(data);
        this.updatePerformanceGraph(data);
        
        // Store in history
        this.statsHistory.push({ timestamp: now, ...data });
        if (this.statsHistory.length > this.maxHistoryLength) {
            this.statsHistory.shift();
        }
    },
    
    gatherPerformanceData() {
        const data = {
            fps: 0,
            memory: 0,
            entities: 0,
            visibleEntities: 0,
            culledEntities: 0,
            networkLatency: 0,
            optimizationsActive: 0,
            performanceLevel: 'unknown'
        };
        
        // Get data from XR optimizer
        if (this.xrOptimizer) {
            const stats = this.xrOptimizer.getStats();
            
            if (stats.manager) {
                data.performanceLevel = stats.manager.currentPerformanceLevel;
                data.memory = stats.manager.metrics.memoryUsage || 0;
                data.networkLatency = stats.manager.metrics.networkLatency || 0;
            }
            
            if (stats.components) {
                // Performance monitor data
                if (stats.components.performanceMonitor) {
                    data.fps = stats.components.performanceMonitor.fps || 0;
                    data.memory = stats.components.performanceMonitor.memory || data.memory;
                    data.entities = stats.components.performanceMonitor.entities || 0;
                }
                
                // Spatial optimizer data
                if (stats.components.spatialOptimizer) {
                    data.visibleEntities = stats.components.spatialOptimizer.visibleEntities || 0;
                    data.culledEntities = stats.components.spatialOptimizer.culledEntities || 0;
                }
                
                // Count active optimizations
                data.optimizationsActive = Object.keys(stats.components).length;
            }
        }
        
        // Fallback to direct component access if optimizer not available
        if (!this.xrOptimizer) {
            // Try to get performance monitor directly
            const scene = document.querySelector('a-scene');
            if (scene && scene.components && scene.components['performance-monitor']) {
                const perfStats = scene.components['performance-monitor'].getStats();
                data.fps = perfStats.fps || 0;
                data.memory = perfStats.memory || 0;
                data.entities = perfStats.entities || 0;
            }
        }
        
        return data;
    },
    
    updateStatsPanel(data) {
        if (!this.panels.stats) return;
        
        const fpsColor = data.fps >= 60 ? '🟢' : data.fps >= 30 ? '🟡' : '🔴';
        const memoryColor = data.memory < 100 ? '🟢' : data.memory < 200 ? '🟡' : '🔴';
        
        const statsText = `📊 PERFORMANCE
${fpsColor} FPS: ${data.fps}
${memoryColor} Memory: ${data.memory}MB
🏗️ Entities: ${data.entities}
👁️ Visible: ${data.visibleEntities}
🚫 Culled: ${data.culledEntities}`;
        
        this.panels.stats.setAttribute('value', statsText);
        
        // Color coding based on performance
        const overallColor = data.fps >= 60 && data.memory < 100 ? '#4ade80' : 
                           data.fps >= 30 && data.memory < 200 ? '#eab308' : '#ef4444';
        this.panels.stats.setAttribute('color', overallColor);
    },
    
    updateOptimizationPanel(data) {
        if (!this.panels.optimizations) return;
        
        const levelColors = {
            high: '🟢',
            medium: '🟡', 
            low: '🔴',
            unknown: '⚪'
        };
        
        const optimizationText = `⚡ OPTIMIZATIONS
${levelColors[data.performanceLevel]} Level: ${data.performanceLevel.toUpperCase()}
🔧 Active: ${data.optimizationsActive}
🎯 Auto-adapt: ON
📈 Efficiency: ${data.culledEntities > 0 ? Math.round((data.culledEntities / (data.visibleEntities + data.culledEntities)) * 100) : 0}%`;
        
        this.panels.optimizations.setAttribute('value', optimizationText);
        this.panels.optimizations.setAttribute('color', '#ffffff');
    },
    
    updateNetworkPanel(data) {
        if (!this.panels.network) return;
        
        const latencyColor = data.networkLatency < 100 ? '🟢' : 
                           data.networkLatency < 300 ? '🟡' : '🔴';
        
        const networkText = `🌐 NETWORK
${latencyColor} Latency: ${Math.round(data.networkLatency)}ms
📡 Status: Connected
🔄 Retry Logic: ON
💾 Cache: Active`;
        
        this.panels.network.setAttribute('value', networkText);
        this.panels.network.setAttribute('color', '#ffffff');
    },
    
    updatePerformanceGraph(data) {
        if (!this.graphPoints || this.graphPoints.length === 0) return;
        
        // Update graph with recent FPS data
        const recentStats = this.statsHistory.slice(-30);
        
        recentStats.forEach((stat, index) => {
            if (index < this.graphPoints.length) {
                const point = this.graphPoints[index];
                const normalizedFPS = Math.min(1, stat.fps / 90); // Normalize to 90fps max
                const height = normalizedFPS * 0.6; // Max height of 0.6 units
                
                point.setAttribute('geometry', `height: ${Math.max(0.02, height)}`);
                point.setAttribute('position', `${-1.4 + index * 0.1} ${height/2 - 0.3} 0.01`);
                point.setAttribute('visible', true);
                
                // Color based on performance
                const color = stat.fps >= 60 ? '#4ade80' : stat.fps >= 30 ? '#eab308' : '#ef4444';
                point.setAttribute('material', 'color', color);
            }
        });
        
        // Hide unused points
        for (let i = recentStats.length; i < this.graphPoints.length; i++) {
            this.graphPoints[i].setAttribute('visible', false);
        }
    },
    
    setPerformanceLevel(level) {
        if (this.xrOptimizer) {
            this.xrOptimizer.setPerformanceLevel(level);
        }
        
        // Update button highlighting
        this.highlightPerformanceLevel(level);
    },
    
    highlightPerformanceLevel(level) {
        // Find and highlight the selected performance level button
        const buttons = this.dashboard.querySelectorAll('a-box');
        buttons.forEach(button => {
            const text = button.querySelector('a-text');
            if (text) {
                const buttonLevel = text.getAttribute('value').toLowerCase();
                if (buttonLevel === level) {
                    button.setAttribute('material', 'opacity', 1);
                } else {
                    button.setAttribute('material', 'opacity', 0.7);
                }
            }
        });
    },
    
    showVoiceActivity(active) {
        // Add visual indicator for voice activity
        if (!this.voiceIndicator) {
            this.voiceIndicator = document.createElement('a-text');
            this.voiceIndicator.setAttribute('value', '🎤 VOICE ACTIVE');
            this.voiceIndicator.setAttribute('color', '#4ade80');
            this.voiceIndicator.setAttribute('position', '0 1.5 0.01');
            this.voiceIndicator.setAttribute('align', 'center');
            this.dashboard.appendChild(this.voiceIndicator);
        }
        
        this.voiceIndicator.setAttribute('visible', active);
        
        if (active) {
            this.voiceIndicator.setAttribute('animation', {
                property: 'scale',
                from: '1 1 1',
                to: '1.1 1.1 1.1',
                dur: 500,
                dir: 'alternate',
                loop: true
            });
        } else {
            this.voiceIndicator.removeAttribute('animation');
        }
    },
    
    showDashboard() {
        if (this.dashboard) {
            this.dashboard.setAttribute('visible', true);
            this.dashboard.setAttribute('animation', {
                property: 'scale',
                from: '0.1 0.1 0.1',
                to: '1 1 1',
                dur: 300,
                easing: 'easeOutQuad'
            });
            this.isVisible = true;
        }
    },
    
    hideDashboard() {
        if (this.dashboard) {
            this.dashboard.setAttribute('animation', {
                property: 'scale',
                from: '1 1 1',
                to: '0.1 0.1 0.1',
                dur: 200,
                easing: 'easeInQuad'
            });
            
            setTimeout(() => {
                this.dashboard.setAttribute('visible', false);
            }, 200);
            
            this.isVisible = false;
        }
    },
    
    toggleDashboard() {
        if (this.isVisible) {
            this.hideDashboard();
        } else {
            this.showDashboard();
        }
    },
    
    // Public API
    show() {
        this.showDashboard();
    },
    
    hide() {
        this.hideDashboard();
    },
    
    toggle() {
        this.toggleDashboard();
    },
    
    enable() {
        this.data.enabled = true;
        if (!this.dashboard) {
            this.createDashboard();
        }
        this.showDashboard();
    },
    
    disable() {
        this.data.enabled = false;
        this.hideDashboard();
    },
    
    remove() {
        if (this.dashboard && this.dashboard.parentNode) {
            this.dashboard.parentNode.removeChild(this.dashboard);
        }
        
        console.log('VR Dashboard removed');
    }
});

// Helper function to add VR dashboard to any scene
if (typeof window !== 'undefined') {
    window.addVRDashboard = function(scene, options = {}) {
        const sceneEl = typeof scene === 'string' ? document.querySelector(scene) : scene;
        if (sceneEl) {
            sceneEl.setAttribute('vr-dashboard', {
                enabled: options.enabled !== false,
                position: options.position || '2 1.6 -1',
                showStats: options.showStats !== false,
                showOptimizations: options.showOptimizations !== false,
                showNetwork: options.showNetwork !== false,
                showControls: options.showControls !== false,
                size: options.size || 'medium',
                ...options
            });
            
            return sceneEl.components['vr-dashboard'];
        }
        return null;
    };
    
    // Global keyboard shortcut to toggle dashboard
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'D') {
            event.preventDefault();
            
            const scene = document.querySelector('a-scene');
            if (scene && scene.components && scene.components['vr-dashboard']) {
                scene.components['vr-dashboard'].toggleDashboard();
            } else if (scene) {
                // Create dashboard if it doesn't exist
                window.addVRDashboard(scene, { enabled: true });
            }
        }
    });
}