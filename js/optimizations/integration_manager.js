// integrationManager.js - Central orchestrator for all XR Home Chat optimizations
class XROptimizationManager {
    constructor(options = {}) {
        this.options = {
            autoInit: options.autoInit !== false,
            enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
            enableSpatialOptimization: options.enableSpatialOptimization !== false,
            enableVoiceOptimization: options.enableVoiceOptimization !== false,
            enableChatOptimization: options.enableChatOptimization !== false,
            enableAPIOptimization: options.enableAPIOptimization !== false,
            debugMode: options.debugMode || false,
            performanceTarget: options.performanceTarget || 'auto', // auto, high, medium, low
            ...options
        };
        
        // Component instances
        this.components = {
            apiClient: null,
            chatManager: null,
            messagePool: null,
            voiceManager: null,
            vadDetector: null,
            performanceMonitor: null,
            spatialOptimizer: null
        };
        
        // State tracking
        this.isInitialized = false;
        this.isStarted = false;
        this.currentPerformanceLevel = 'high';
        
        // Event system
        this.listeners = new Map();
        
        // Performance metrics
        this.metrics = {
            initTime: 0,
            frameRate: 0,
            memoryUsage: 0,
            networkLatency: 0,
            optimizationEfficiency: 0
        };
        
        // Auto-initialize if requested
        if (this.options.autoInit) {
            this.init();
        }
        
        console.log('XR Optimization Manager created');
    }
    
    async init() {
        if (this.isInitialized) {
            console.warn('XR Optimization Manager already initialized');
            return;
        }
        
        const startTime = performance.now();
        console.log('🚀 Initializing XR Optimization Manager...');
        
        try {
            // Wait for DOM and A-Frame to be ready
            await this.waitForDependencies();
            
            // Initialize core components in order
            await this.initializeAPIClient();
            await this.initializeMessagePool();
            await this.initializeChatManager();
            await this.initializeVoiceComponents();
            await this.initializePerformanceMonitoring();
            await this.initializeSpatialOptimization();
            
            // Setup inter-component communication
            this.setupComponentIntegration();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Setup performance adaptation
            this.setupPerformanceAdaptation();
            
            this.isInitialized = true;
            this.metrics.initTime = performance.now() - startTime;
            
            console.log(`✅ XR Optimization Manager initialized in ${this.metrics.initTime.toFixed(1)}ms`);
            this.emit('initialized', { initTime: this.metrics.initTime });
            
        } catch (error) {
            console.error('❌ XR Optimization Manager initialization failed:', error);
            this.emit('initError', { error });
            throw error;
        }
    }
    
    async waitForDependencies() {
        // Wait for A-Frame to be ready
        if (typeof AFRAME === 'undefined') {
            await new Promise(resolve => {
                const checkAFrame = () => {
                    if (typeof AFRAME !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkAFrame, 100);
                    }
                };
                checkAFrame();
            });
        }
        
        // Wait for scene to be loaded
        const scene = document.querySelector('a-scene');
        if (scene && !scene.hasLoaded) {
            await new Promise(resolve => {
                scene.addEventListener('loaded', resolve);
            });
        }
        
        // Wait for required optimization classes to be available
        const requiredClasses = [
            'EnhancedAPIClient',
            'ChatMessagePool', 
            'SmartChatManager',
            'VoiceActivityDetector'
        ];
        
        for (const className of requiredClasses) {
            if (!window[className]) {
                console.warn(`${className} not available, some optimizations may be limited`);
            }
        }
    }
    
    async initializeAPIClient() {
        if (!this.options.enableAPIOptimization) return;
        
        console.log('🌐 Initializing API optimizations...');
        
        if (window.EnhancedAPIClient) {
            this.components.apiClient = window.apiClient || new window.EnhancedAPIClient();
            
            // Setup API event listeners
            this.components.apiClient.on?.('requestStart', () => {
                this.updateNetworkLatency();
            });
            
            this.components.apiClient.on?.('requestComplete', (latency) => {
                this.metrics.networkLatency = latency;
            });
            
            console.log('✅ API client optimized');
        } else {
            console.warn('EnhancedAPIClient not available');
        }
    }
    
    async initializeMessagePool() {
        if (!this.options.enableChatOptimization) return;
        
        console.log('💬 Initializing chat optimizations...');
        
        if (window.ChatMessagePool) {
            this.components.messagePool = new window.ChatMessagePool();
            console.log('✅ Message pooling enabled');
        } else {
            console.warn('ChatMessagePool not available');
        }
    }
    
    async initializeChatManager() {
        if (!this.options.enableChatOptimization) return;
        
        if (window.SmartChatManager) {
            this.components.chatManager = new window.SmartChatManager({
                apiClient: this.components.apiClient,
                messagePool: this.components.messagePool,
                persistHistory: true
            });
            
            // Setup chat event listeners
            this.components.chatManager.on?.('messageAdded', (data) => {
                this.emit('chatActivity', data);
            });
            
            this.components.chatManager.on?.('streamingComplete', (data) => {
                this.updatePerformanceMetrics();
            });
            
            console.log('✅ Smart chat management enabled');
        } else {
            console.warn('SmartChatManager not available');
        }
    }
    
    async initializeVoiceComponents() {
        if (!this.options.enableVoiceOptimization) return;
        
        console.log('🎤 Initializing voice optimizations...');
        
        try {
            // Initialize Voice Activity Detection
            if (window.VoiceActivityDetector) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                this.components.vadDetector = new window.VoiceActivityDetector(stream, {
                    threshold: 0.02,
                    minSpeechFrames: 3
                });
                
                this.components.vadDetector.on('speechStart', () => {
                    this.handleVoiceActivityStart();
                });
                
                this.components.vadDetector.on('speechEnd', () => {
                    this.handleVoiceActivityEnd();
                });
                
                console.log('✅ Voice activity detection enabled');
            }
            
            // Initialize Realtime Voice Manager
            if (window.RealtimeVoiceManager) {
                this.components.voiceManager = new window.RealtimeVoiceManager({
                    vadEnabled: true,
                    vadDetector: this.components.vadDetector
                });
                
                this.components.voiceManager.on('connected', () => {
                    console.log('Voice manager connected');
                    this.emit('voiceReady');
                });
                
                this.components.voiceManager.on('error', (error) => {
                    console.warn('Voice manager error:', error);
                    this.handleVoiceError(error);
                });
                
                console.log('✅ Realtime voice management enabled');
            }
            
        } catch (error) {
            console.warn('Voice optimization failed:', error);
            this.options.enableVoiceOptimization = false;
        }
    }
    
    async initializePerformanceMonitoring() {
        if (!this.options.enablePerformanceMonitoring) return;
        
        console.log('⚡ Initializing performance monitoring...');
        
        const scene = document.querySelector('a-scene');
        if (scene) {
            scene.setAttribute('performance-monitor', {
                enabled: true,
                showUI: this.options.debugMode,
                autoOptimize: true,
                logStats: this.options.debugMode
            });
            
            this.components.performanceMonitor = scene.components['performance-monitor'];
            
            // Listen for performance events
            scene.addEventListener('performance-low', (event) => {
                this.handleLowPerformance(event.detail);
            });
            
            scene.addEventListener('performance-good', (event) => {
                this.handleGoodPerformance(event.detail);
            });
            
            console.log('✅ Performance monitoring enabled');
        }
    }
    
    async initializeSpatialOptimization() {
        if (!this.options.enableSpatialOptimization) return;
        
        console.log('🏠 Initializing spatial optimization...');
        
        const scene = document.querySelector('a-scene');
        if (scene) {
            scene.setAttribute('spatial-optimizer', {
                enabled: true,
                cullingDistance: 50,
                lodLevels: 3,
                debugMode: this.options.debugMode,
                adaptiveQuality: true
            });
            
            this.components.spatialOptimizer = scene.components['spatial-optimizer'];
            console.log('✅ Spatial optimization enabled');
        }
    }
    
    setupComponentIntegration() {
        console.log('🔗 Setting up component integration...');
        
        // Integrate chat manager with voice manager
        if (this.components.chatManager && this.components.voiceManager) {
            this.components.voiceManager.on('transcriptReceived', (transcript) => {
                this.components.chatManager.handleVoiceMessage?.(transcript);
            });
        }
        
        // Integrate performance monitor with all components
        if (this.components.performanceMonitor) {
            this.components.performanceMonitor.on?.('statsUpdated', (stats) => {
                this.updatePerformanceMetrics(stats);
            });
        }
        
        // Integrate API client with all network-using components
        if (this.components.apiClient) {
            ['chatManager', 'voiceManager'].forEach(componentName => {
                const component = this.components[componentName];
                if (component && component.setAPIClient) {
                    component.setAPIClient(this.components.apiClient);
                }
            });
        }
    }
    
    setupGlobalEventListeners() {
        // Window focus/blur for performance optimization
        window.addEventListener('focus', () => {
            this.handleWindowFocus();
        });
        
        window.addEventListener('blur', () => {
            this.handleWindowBlur();
        });
        
        // VR session events
        const scene = document.querySelector('a-scene');
        if (scene) {
            scene.addEventListener('enter-vr', () => {
                this.handleVREnter();
            });
            
            scene.addEventListener('exit-vr', () => {
                this.handleVRExit();
            });
        }
        
        // Error handling
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event);
        });
        
        // Performance observer if available
        if (typeof PerformanceObserver !== 'undefined') {
            this.setupPerformanceObserver();
        }
    }
    
    setupPerformanceAdaptation() {
        // Auto-detect optimal performance level
        if (this.options.performanceTarget === 'auto') {
            this.detectOptimalPerformanceLevel();
        } else {
            this.setPerformanceLevel(this.options.performanceTarget);
        }
    }
    
    setupPerformanceObserver() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure') {
                        this.metrics[entry.name] = entry.duration;
                    }
                }
            });
            
            observer.observe({ entryTypes: ['measure'] });
        } catch (error) {
            console.warn('Performance Observer not supported');
        }
    }
    
    detectOptimalPerformanceLevel() {
        // Simple device capability detection
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            this.setPerformanceLevel('low');
            return;
        }
        
        const renderer = gl.getParameter(gl.RENDERER);
        const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
        const cores = navigator.hardwareConcurrency || 4;
        
        // Score based on various factors
        let performanceScore = 0;
        
        if (memory >= 8) performanceScore += 3;
        else if (memory >= 4) performanceScore += 2;
        else performanceScore += 1;
        
        if (cores >= 8) performanceScore += 3;
        else if (cores >= 4) performanceScore += 2;
        else performanceScore += 1;
        
        // GPU detection (simplified)
        if (renderer.includes('GeForce') || renderer.includes('Radeon') || renderer.includes('Intel Iris')) {
            performanceScore += 2;
        } else {
            performanceScore += 1;
        }
        
        // Determine performance level
        let level = 'medium';
        if (performanceScore >= 7) level = 'high';
        else if (performanceScore <= 4) level = 'low';
        
        console.log(`Auto-detected performance level: ${level} (score: ${performanceScore})`);
        this.setPerformanceLevel(level);
    }
    
    setPerformanceLevel(level) {
        if (!['high', 'medium', 'low'].includes(level)) {
            console.warn('Invalid performance level:', level);
            return;
        }
        
        this.currentPerformanceLevel = level;
        
        // Apply settings to all components
        Object.values(this.components).forEach(component => {
            if (component && component.setQualityLevel) {
                component.setQualityLevel(level);
            }
        });
        
        // Adjust global settings
        this.applyGlobalPerformanceSettings(level);
        
        console.log(`Performance level set to: ${level}`);
        this.emit('performanceLevelChanged', { level });
    }
    
    applyGlobalPerformanceSettings(level) {
        const settings = {
            high: {
                targetFPS: 90,
                maxEntities: 200,
                shadowQuality: 'high'
            },
            medium: {
                targetFPS: 60,
                maxEntities: 150,
                shadowQuality: 'medium'
            },
            low: {
                targetFPS: 30,
                maxEntities: 100,
                shadowQuality: 'low'
            }
        };
        
        const currentSettings = settings[level];
        
        // Apply to renderer if available
        const scene = document.querySelector('a-scene');
        if (scene && scene.renderer) {
            const renderer = scene.renderer;
            
            if (level === 'low') {
                renderer.shadowMap.enabled = false;
                renderer.setPixelRatio(1);
            } else {
                renderer.shadowMap.enabled = true;
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, level === 'high' ? 2 : 1.5));
            }
        }
    }
    
    // Event handlers
    handleVoiceActivityStart() {
        console.log('Voice activity started');
        this.emit('voiceActivityStart');
        
        // Temporarily boost performance for voice processing
        this.boostPerformanceTemporarily();
    }
    
    handleVoiceActivityEnd() {
        console.log('Voice activity ended');
        this.emit('voiceActivityEnd');
    }
    
    handleLowPerformance(stats) {
        console.log('Low performance detected:', stats);
        
        if (this.currentPerformanceLevel !== 'low') {
            const newLevel = this.currentPerformanceLevel === 'high' ? 'medium' : 'low';
            this.setPerformanceLevel(newLevel);
        }
    }
    
    handleGoodPerformance(stats) {
        console.log('Good performance detected:', stats);
        
        // Gradually restore performance level
        setTimeout(() => {
            if (this.currentPerformanceLevel !== 'high') {
                const newLevel = this.currentPerformanceLevel === 'low' ? 'medium' : 'high';
                this.setPerformanceLevel(newLevel);
            }
        }, 5000); // Wait 5 seconds before upgrading
    }
    
    handleVoiceError(error) {
        console.warn('Voice error, falling back to text-only mode');
        this.emit('voiceError', { error });
        
        // Hide voice UI elements
        const voiceButton = document.querySelector('#voice-button, [data-voice-button]');
        if (voiceButton) {
            voiceButton.style.display = 'none';
        }
    }
    
    handleWindowFocus() {
        // Resume optimizations when window gains focus
        if (this.components.vadDetector) {
            this.components.vadDetector.start?.();
        }
        
        this.emit('windowFocused');
    }
    
    handleWindowBlur() {
        // Pause optimizations when window loses focus
        if (this.components.vadDetector) {
            this.components.vadDetector.stop?.();
        }
        
        this.emit('windowBlurred');
    }
    
    handleVREnter() {
        console.log('Entered VR mode');
        
        // Optimize for VR performance
        this.setPerformanceLevel('high');
        
        // Enable all VR-specific optimizations
        if (this.components.spatialOptimizer) {
            this.components.spatialOptimizer.setData?.('aggressiveOptimization', true);
        }
        
        this.emit('vrEntered');
    }
    
    handleVRExit() {
        console.log('Exited VR mode');
        
        // Restore normal performance settings
        this.detectOptimalPerformanceLevel();
        
        this.emit('vrExited');
    }
    
    handleGlobalError(event) {
        console.error('Global error:', event.error);
        this.emit('globalError', { error: event.error });
        
        // Try to recover gracefully
        this.recoverFromError(event.error);
    }
    
    // Utility methods
    boostPerformanceTemporarily(duration = 5000) {
        const originalLevel = this.currentPerformanceLevel;
        
        if (originalLevel !== 'high') {
            this.setPerformanceLevel('high');
            
            setTimeout(() => {
                this.setPerformanceLevel(originalLevel);
            }, duration);
        }
    }
    
    updatePerformanceMetrics(stats) {
        if (stats) {
            this.metrics = { ...this.metrics, ...stats };
        }
        
        // Calculate optimization efficiency
        const totalOptimizations = Object.values(this.components)
            .filter(c => c && c.getStats)
            .reduce((total, component) => {
                const stats = component.getStats();
                return total + (stats.optimizationsApplied || 0);
            }, 0);
        
        this.metrics.optimizationEfficiency = totalOptimizations;
    }
    
    updateNetworkLatency() {
        if (this.components.apiClient) {
            const stats = this.components.apiClient.getStats?.();
            if (stats) {
                this.metrics.networkLatency = stats.averageResponseTime || 0;
            }
        }
    }
    
    recoverFromError(error) {
        // Attempt to reinitialize failed components
        if (error.message.includes('voice') || error.message.includes('audio')) {
            this.options.enableVoiceOptimization = false;
            console.log('Disabled voice optimizations due to error');
        }
        
        // Reduce performance level as a safety measure
        if (this.currentPerformanceLevel === 'high') {
            this.setPerformanceLevel('medium');
        }
    }
    
    // Public API
    async start() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (this.isStarted) {
            console.warn('XR Optimization Manager already started');
            return;
        }
        
        console.log('▶️ Starting XR optimizations...');
        
        // Start all components
        const startPromises = Object.entries(this.components).map(async ([name, component]) => {
            if (component && component.start) {
                try {
                    await component.start();
                    console.log(`✅ ${name} started`);
                } catch (error) {
                    console.warn(`⚠️ ${name} failed to start:`, error);
                }
            }
        });
        
        await Promise.all(startPromises);
        
        this.isStarted = true;
        console.log('✅ All XR optimizations active');
        this.emit('started');
    }
    
    async stop() {
        if (!this.isStarted) return;
        
        console.log('⏹️ Stopping XR optimizations...');
        
        // Stop all components
        const stopPromises = Object.entries(this.components).map(async ([name, component]) => {
            if (component && component.stop) {
                try {
                    await component.stop();
                    console.log(`✅ ${name} stopped`);
                } catch (error) {
                    console.warn(`⚠️ ${name} failed to stop:`, error);
                }
            }
        });
        
        await Promise.all(stopPromises);
        
        this.isStarted = false;
        console.log('✅ All XR optimizations stopped');
        this.emit('stopped');
    }
    
    getStats() {
        const componentStats = {};
        
        Object.entries(this.components).forEach(([name, component]) => {
            if (component && component.getStats) {
                componentStats[name] = component.getStats();
            }
        });
        
        return {
            manager: {
                isInitialized: this.isInitialized,
                isStarted: this.isStarted,
                currentPerformanceLevel: this.currentPerformanceLevel,
                metrics: this.metrics
            },
            components: componentStats
        };
    }
    
    getComponent(name) {
        return this.components[name];
    }
    
    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    // Cleanup
    destroy() {
        this.stop();
        
        // Destroy all components
        Object.values(this.components).forEach(component => {
            if (component && component.destroy) {
                component.destroy();
            }
        });
        
        this.listeners.clear();
        console.log('XR Optimization Manager destroyed');
    }
}

// Auto-initialize global instance
if (typeof window !== 'undefined') {
    window.XROptimizationManager = XROptimizationManager;
    
    // Create global instance
    window.xrOptimizer = null;
    
    // Helper to initialize the optimization manager
    window.initXROptimizations = function(options = {}) {
        if (!window.xrOptimizer) {
            window.xrOptimizer = new XROptimizationManager({
                autoInit: true,
                debugMode: options.debug || false,
                performanceTarget: options.performance || 'auto',
                ...options
            });
        }
        return window.xrOptimizer;
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Auto-initialize with default settings
            window.initXROptimizations();
        });
    } else {
        // DOM already ready
        setTimeout(() => window.initXROptimizations(), 100);
    }
}