// performanceMonitor.js
AFRAME.registerComponent('performance-monitor', {
    schema: {
        enabled: { default: true },
        updateInterval: { default: 1000 },
        showUI: { default: false }
    },
    
    init() {
        this.stats = {
            fps: 0,
            frameTime: 0,
            memory: 0,
            entities: 0
        };
        
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastUpdateTime = this.lastTime;
        
        if (this.data.showUI) {
            this.createStatsPanel();
        }
        
        this.tick = AFRAME.utils.throttleTick(this.tick, this.data.updateInterval, this);
    },
    
    tick() {
        if (!this.data.enabled) return;
        
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        this.frameCount++;
        
        // Update stats every interval
        if (now - this.lastUpdateTime >= this.data.updateInterval) {
            this.stats.fps = Math.round((this.frameCount * 1000) / (now - this.lastUpdateTime));
            this.stats.frameTime = Math.round(deltaTime * 100) / 100;
            this.stats.entities = this.el.sceneEl.querySelectorAll('a-entity, a-box, a-sphere, a-text').length;
            
            // Memory usage (if available)
            if (performance.memory) {
                this.stats.memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            }
            
            this.updateUI();
            this.checkPerformanceThresholds();
            
            this.frameCount = 0;
            this.lastUpdateTime = now;
        }
        
        this.lastTime = now;
    },
    
    createStatsPanel() {
        this.statsPanel = document.createElement('a-entity');
        this.statsPanel.setAttribute('geometry', 'primitive: plane; width: 2; height: 1');
        this.statsPanel.setAttribute('material', 'color: black; opacity: 0.7');
        this.statsPanel.setAttribute('position', '-3 2 -2');
        this.statsPanel.setAttribute('text', {
            value: 'Performance Stats',
            color: 'white',
            align: 'center'
        });
        
        this.el.sceneEl.appendChild(this.statsPanel);
    },
    
    updateUI() {
        if (!this.statsPanel) return;
        
        const statsText = `FPS: ${this.stats.fps}
Frame: ${this.stats.frameTime}ms
Memory: ${this.stats.memory}MB
Entities: ${this.stats.entities}`;
        
        this.statsPanel.setAttribute('text', 'value', statsText);
    },
    
    checkPerformanceThresholds() {
        // Auto-optimize based on performance
        if (this.stats.fps < 30) {
            this.el.emit('performance-low', this.stats);
            this.suggestOptimizations();
        } else if (this.stats.fps > 60) {
            this.el.emit('performance-good', this.stats);
        }
    },
    
    suggestOptimizations() {
        // Reduce quality for better performance
        const renderer = this.el.sceneEl.renderer;
        if (renderer.getPixelRatio() > 1) {
            renderer.setPixelRatio(1);
            console.log('Performance: Reduced pixel ratio');
        }
        
        // Disable shadows if enabled
        if (renderer.shadowMap.enabled) {
            renderer.shadowMap.enabled = false;
            console.log('Performance: Disabled shadows');
        }
    },
    
    getStats() {
        return { ...this.stats };
    }
});

// Usage in your HTML
// <a-scene performance-monitor="showUI: true; updateInterval: 500">
