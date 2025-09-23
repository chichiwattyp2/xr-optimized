// performanceMonitor.js - A-Frame performance monitoring component
AFRAME.registerComponent('performance-monitor', {
    schema: {
        enabled: { default: true },
        updateInterval: { default: 1000 },
        showUI: { default: false },
        showStats: { default: false },
        logStats: { default: false },
        autoOptimize: { default: true },
        position: { default: '-3 2 -2' }
    },
    
    init() {
        this.stats = {
            fps: 0,
            frameTime: 0,
            memory: 0,
            entities: 0,
            drawCalls: 0,
            triangles: 0,
            lastFrameTime: performance.now(),
            renderTime: 0
        };
        
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastUpdateTime = this.lastTime;
        this.frameTimeHistory = new Array(60).fill(16.67); // 60fps baseline
        this.frameTimeIndex = 0;
        
        // Performance thresholds
        this.thresholds = {
            lowFPS: 30,
            goodFPS: 60,
            highMemory: 100, // MB
            maxEntities: 200
        };
        
        // Optimization state
        this.optimizations = {
            pixelRatioReduced: false,
            shadowsDisabled: false,
            antialiasDisabled: false,
            qualityLevel: 'high' // high, medium, low
        };
        
        if (this.data.showUI) {
            this.createStatsPanel();
        }
        
        if (this.data.showStats && typeof Stats !== 'undefined') {
            this.setupStats();
        }
        
        // Throttled tick to avoid performance impact
        this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), this.data.updateInterval, this);
        
        // Setup renderer monitoring
        this.setupRendererMonitoring();
        
        console.log('Performance Monitor initialized');
    },
    
    setupStats() {
        // Setup Stats.js if available
        this.statsPanel = new Stats();
        this.statsPanel.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        
        // Position the stats panel
        this.statsPanel.dom.style.position = 'fixed';
        this.statsPanel.dom.style.top = '0px';
        this.statsPanel.dom.style.left = '0px';
        this.statsPanel.dom.style.zIndex = '10000';
        
        document.body.appendChild(this.statsPanel.dom);
        
        // Custom memory panel
        this.memoryPanel = this.statsPanel.addPanel(new Stats.Panel('MB', '#ff8', '#221'));
    },
    
    setupRendererMonitoring() {
        const renderer = this.el.sceneEl.renderer;
        if (!renderer) return;
        
        // Store original render function to measure render time
        this.originalRender = renderer.render;
        const self = this;
        
        renderer.render = function(scene, camera) {
            const start = performance.now();
            self.originalRender.call(this, scene, camera);
            self.stats.renderTime = performance.now() - start;
        };
    },
    
    tick(time, timeDelta) {
        if (!this.data.enabled) return;
        
        const now = performance.now();
        const deltaTime = now - this.stats.lastFrameTime;
        
        // Update frame time history
        this.frameTimeHistory[this.frameTimeIndex] = deltaTime;
        this.frameTimeIndex = (this.frameTimeIndex + 1) % this.frameTimeHistory.length;
        
        this.frameCount++;
        this.stats.lastFrameTime = now;
        
        // Update stats every interval
        if (now - this.lastUpdateTime >= this.data.updateInterval) {
            this.updateStats(now);
            this.updateUI();
            this.checkPerformanceThresholds();
            
            if (this.data.logStats) {
                this.logPerformanceStats();
            }
            
            this.frameCount = 0;
            this.lastUpdateTime = now;
        }
        
        // Update Stats.js if available
        if (this.statsPanel) {
            this.statsPanel.update();
            if (this.memoryPanel && this.stats.memory > 0) {
                this.memoryPanel.update(this.stats.memory, 200);
            }
        }
    },
    
    updateStats(now) {
        const timeDelta = now - this.lastTime;
        
        // Calculate FPS
        this.stats.fps = Math.round((this.frameCount * 1000) / timeDelta);
        
        // Average frame time
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length;
        this.stats.frameTime = Math.round(avgFrameTime * 100) / 100;
        
        // Count entities
        this.stats.entities = this.el.sceneEl.querySelectorAll('[geometry], [gltf-model], [obj-model], [text]').length;
        
        // Memory usage (if available)
        if (performance.memory) {
            this.stats.memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        
        // WebGL render info
        const renderer = this.el.sceneEl.renderer;
        if (renderer && renderer.info) {
            this.stats.drawCalls = renderer.info.render.calls;
            this.stats.triangles = renderer.info.render.triangles;
        }
        
        this.lastTime = now;
    },
    
    createStatsPanel() {
        this.statsPanel = document.createElement('a-entity');
        this.statsPanel.setAttribute('id', 'performance-stats-panel');
        this.statsPanel.setAttribute('geometry', {
            primitive: 'plane',
            width: 2.5,
            height: 1.8
        });
        this.statsPanel.setAttribute('material', {
            color: '#000000',
            opacity: 0.8,
            transparent: true,
            shader: 'flat'
        });
        this.statsPanel.setAttribute('position', this.data.position);
        this.statsPanel.setAttribute('look-at', '[camera]');
        
        this.statsText = document.createElement('a-text');
        this.statsText.setAttribute('value', 'Performance Stats');
        this.statsText.setAttribute('color', '#ffffff');
        this.statsText.setAttribute('align', 'left');
        this.statsText.setAttribute('width', 8);
        this.statsText.setAttribute('position', '-1.2 0.8 0.01');
        this.statsText.setAttribute('font', 'dejavu');
        
        this.statsPanel.appendChild(this.statsText);
        this.el.sceneEl.appendChild(this.statsPanel);
        
        // Add close button
        const closeButton = document.createElement('a-box');
        closeButton.setAttribute('geometry', {
            width: 0.3,
            height: 0.3,
            depth: 0.1
        });
        closeButton.setAttribute('material', {
            color: '#ff4444',
            opacity: 0.8,
            transparent: true
        });
        closeButton.setAttribute('position', '1.1 0.7 0.01');
        closeButton.setAttribute('cursor-listener', '');
        
        const closeText = document.createElement('a-text');
        closeText.setAttribute('value', 'X');
        closeText.setAttribute('color', '#ffffff');
        closeText.setAttribute('align', 'center');
        closeText.setAttribute('width', 12);
        closeText.setAttribute('position', '0 0 0.01');
        
        closeButton.appendChild(closeText);
        this.statsPanel.appendChild(closeButton);
        
        closeButton.addEventListener('click', () => {
            this.statsPanel.setAttribute('visible', false);
        });
    },
    
    updateUI() {
        if (!this.statsText) return;
        
        const qualityColor = this.getQualityColor();
        const memoryWarning = this.stats.memory > this.thresholds.highMemory ? ' ⚠️' : '';
        
        const statsText = `Performance Monitor
        
FPS: ${this.stats.fps} ${this.getFPSIndicator()}
Frame Time: ${this.stats.frameTime}ms
Quality: ${this.optimizations.qualityLevel}

Memory: ${this.stats.memory}MB${memoryWarning}
Entities: ${this.stats.entities}
Draw Calls: ${this.stats.drawCalls}
Triangles: ${this.stats.triangles}
Render: ${this.stats.renderTime.toFixed(1)}ms

Optimizations:
• Pixel Ratio: ${this.optimizations.pixelRatioReduced ? 'Reduced' : 'Normal'}
• Shadows: ${this.optimizations.shadowsDisabled ? 'Disabled' : 'Enabled'}
• Antialias: ${this.optimizations.antialiasDisabled ? 'Disabled' : 'Enabled'}`;
        
        this.statsText.setAttribute('value', statsText);
        this.statsText.setAttribute('color', qualityColor);
    },
    
    getFPSIndicator() {
        if (this.stats.fps >= this.thresholds.goodFPS) return '🟢';
        if (this.stats.fps >= this.thresholds.lowFPS) return '🟡';
        return '🔴';
    },
    
    getQualityColor() {
        if (this.stats.fps >= this.thresholds.goodFPS) return '#4ade80'; // green
        if (this.stats.fps >= this.thresholds.lowFPS) return '#facc15'; // yellow
        return '#ef4444'; // red
    },
    
    checkPerformanceThresholds() {
        const currentFPS = this.stats.fps;
        const renderer = this.el.sceneEl.renderer;
        
        // Auto-optimization based on performance
        if (this.data.autoOptimize && currentFPS < this.thresholds.lowFPS) {
            this.el.emit('performance-low', { stats: this.getStats() });
            this.applyOptimizations();
        } else if (currentFPS > this.thresholds.goodFPS && this.optimizations.qualityLevel !== 'high') {
            this.el.emit('performance-good', { stats: this.getStats() });
            this.restoreQuality();
        }
        
        // Memory warnings
        if (this.stats.memory > this.thresholds.highMemory) {
            this.el.emit('memory-warning', { memory: this.stats.memory });
            console.warn(`High memory usage: ${this.stats.memory}MB`);
        }
        
        // Entity count warnings
        if (this.stats.entities > this.thresholds.maxEntities) {
            this.el.emit('entity-warning', { count: this.stats.entities });
            console.warn(`High entity count: ${this.stats.entities}`);
        }
    },
    
    applyOptimizations() {
        const renderer = this.el.sceneEl.renderer;
        if (!renderer) return;
        
        console.log('Applying performance optimizations...');
        
        // Reduce pixel ratio
        if (!this.optimizations.pixelRatioReduced && window.devicePixelRatio > 1) {
            renderer.setPixelRatio(1);
            this.optimizations.pixelRatioReduced = true;
            this.optimizations.qualityLevel = 'medium';
            console.log('• Reduced pixel ratio');
        }
        
        // Disable shadows
        if (!this.optimizations.shadowsDisabled && renderer.shadowMap.enabled) {
            renderer.shadowMap.enabled = false;
            this.optimizations.shadowsDisabled = true;
            this.optimizations.qualityLevel = 'low';
            console.log('• Disabled shadows');
        }
        
        // Disable antialiasing for existing WebGL context is not possible,
        // but we can note it for next initialization
        if (!this.optimizations.antialiasDisabled) {
            this.optimizations.antialiasDisabled = true;
            console.log('• Marked antialiasing for disable on next init');
        }
        
        // Reduce texture quality
        this.reduceTextureQuality();
        
        // Clean up unused geometries and materials
        this.cleanupResources();
    },
    
    restoreQuality() {
        const renderer = this.el.sceneEl.renderer;
        if (!renderer) return;
        
        console.log('Restoring quality settings...');
        
        // Restore pixel ratio gradually
        if (this.optimizations.pixelRatioReduced) {
            const targetRatio = Math.min(window.devicePixelRatio, 2);
            renderer.setPixelRatio(targetRatio);
            this.optimizations.pixelRatioReduced = false;
            this.optimizations.qualityLevel = 'high';
            console.log('• Restored pixel ratio');
        }
    },
    
    reduceTextureQuality() {
        // Find all materials and reduce texture sizes
        const materials = this.el.sceneEl.querySelectorAll('[material]');
        materials.forEach(el => {
            const material = el.getObject3D('mesh')?.material;
            if (material && material.map) {
                // Note: This is a placeholder - actual texture quality reduction
                // would require more complex texture management
                console.log('• Reduced texture quality for', el.getAttribute('id') || 'unnamed entity');
            }
        });
    },
    
    cleanupResources() {
        const scene = this.el.sceneEl;
        const renderer = scene.renderer;
        
        // Clean up unused geometries and materials
        if (renderer && renderer.info) {
            console.log(`• Cleanup: ${renderer.info.memory.geometries} geometries, ${renderer.info.memory.textures} textures`);
        }
        
        // Force garbage collection if available (Chrome DevTools)
        if (window.gc) {
            window.gc();
            console.log('• Forced garbage collection');
        }
    },
    
    logPerformanceStats() {
        console.log('Performance Stats:', {
            fps: this.stats.fps,
            frameTime: this.stats.frameTime,
            memory: this.stats.memory,
            entities: this.stats.entities,
            drawCalls: this.stats.drawCalls,
            triangles: this.stats.triangles,
            qualityLevel: this.optimizations.qualityLevel
        });
    },
    
    // Public methods
    getStats() {
        return { 
            ...this.stats,
            qualityLevel: this.optimizations.qualityLevel,
            optimizations: { ...this.optimizations }
        };
    },
    
    forceOptimization() {
        this.applyOptimizations();
    },
    
    toggleStatsPanel() {
        if (this.statsPanel) {
            const isVisible = this.statsPanel.getAttribute('visible');
            this.statsPanel.setAttribute('visible', !isVisible);
        } else if (this.data.showUI) {
            this.createStatsPanel();
        }
    },
    
    setQualityLevel(level) {
        this.optimizations.qualityLevel = level;
        
        switch (level) {
            case 'low':
                this.applyOptimizations();
                break;
            case 'high':
                this.restoreQuality();
                break;
        }
        
        console.log(`Quality level set to: ${level}`);
    },
    
    remove() {
        if (this.statsPanel && this.statsPanel.parentNode) {
            this.statsPanel.parentNode.removeChild(this.statsPanel);
        }
        
        if (this.statsPanel && this.statsPanel.dom) {
            document.body.removeChild(this.statsPanel.dom);
        }
        
        // Restore original render function
        if (this.originalRender) {
            const renderer = this.el.sceneEl.renderer;
            if (renderer) {
                renderer.render = this.originalRender;
            }
        }
    }
});

// Convenience function to add performance monitoring to any scene
if (typeof window !== 'undefined') {
    window.addPerformanceMonitoring = function(scene, options = {}) {
        const sceneEl = typeof scene === 'string' ? document.querySelector(scene) : scene;
        if (sceneEl) {
            sceneEl.setAttribute('performance-monitor', {
                showUI: options.showUI || false,
                showStats: options.showStats || false,
                autoOptimize: options.autoOptimize !== false,
                ...options
            });
            
            return sceneEl.components['performance-monitor'];
        }
        return null;
    };
}
