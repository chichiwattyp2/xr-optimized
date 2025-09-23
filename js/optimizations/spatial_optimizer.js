// spatialOptimizer.js - Advanced A-Frame spatial performance optimization
AFRAME.registerComponent('spatial-optimizer', {
    schema: {
        enabled: { default: true },
        cullingDistance: { default: 50 }, // Maximum render distance
        lodLevels: { default: 3 }, // Number of Level-of-Detail levels
        updateInterval: { default: 100 }, // Update frequency in ms
        aggressiveOptimization: { default: false }, // More aggressive optimizations
        debugMode: { default: false }, // Show optimization boundaries
        spatialPartitioning: { default: true }, // Enable spatial partitioning
        adaptiveQuality: { default: true } // Adjust quality based on performance
    },
    
    init() {
        this.camera = null;
        this.entities = [];
        this.spatialGrid = new Map();
        this.visibilityCache = new Map();
        this.lodCache = new Map();
        this.lastUpdateTime = 0;
        this.gridSize = 10; // 10x10 unit grid cells
        
        // Performance tracking
        this.stats = {
            totalEntities: 0,
            visibleEntities: 0,
            culledEntities: 0,
            lodReductions: 0,
            framesSinceUpdate: 0
        };
        
        // Quality settings
        this.qualityLevel = 'high'; // high, medium, low
        this.qualitySettings = {
            high: {
                cullingDistance: this.data.cullingDistance,
                lodLevels: this.data.lodLevels,
                updateInterval: this.data.updateInterval
            },
            medium: {
                cullingDistance: this.data.cullingDistance * 0.8,
                lodLevels: Math.max(2, this.data.lodLevels - 1),
                updateInterval: this.data.updateInterval * 1.5
            },
            low: {
                cullingDistance: this.data.cullingDistance * 0.6,
                lodLevels: Math.max(1, this.data.lodLevels - 2),
                updateInterval: this.data.updateInterval * 2
            }
        };
        
        // Initialize after scene is ready
        this.el.addEventListener('loaded', () => {
            this.setupSpatialOptimization();
        });
        
        // Listen for performance events
        this.el.addEventListener('performance-low', (event) => {
            if (this.data.adaptiveQuality) {
                this.adaptQualityLevel('low');
            }
        });
        
        this.el.addEventListener('performance-good', (event) => {
            if (this.data.adaptiveQuality && this.qualityLevel !== 'high') {
                this.adaptQualityLevel('high');
            }
        });
        
        console.log('Spatial Optimizer initialized');
    },
    
    setupSpatialOptimization() {
        // Find camera
        this.camera = this.el.querySelector('[camera]') || 
                    this.el.querySelector('a-camera') ||
                    document.querySelector('[camera]');
        
        if (!this.camera) {
            console.warn('No camera found for spatial optimization');
            return;
        }
        
        // Index all optimizable entities
        this.indexEntities();
        
        // Setup spatial partitioning grid
        if (this.data.spatialPartitioning) {
            this.buildSpatialGrid();
        }
        
        // Setup debug visualization
        if (this.data.debugMode) {
            this.setupDebugVisualization();
        }
        
        // Start optimization loop
        this.tick = AFRAME.utils.throttleTick(this.optimizationTick.bind(this), this.getCurrentSettings().updateInterval, this);
        
        console.log(`Spatial optimization active: ${this.entities.length} entities indexed`);
    },
    
    indexEntities() {
        // Find all entities that can be optimized
        const selectorsToOptimize = [
            '[geometry]',
            '[gltf-model]', 
            '[obj-model]',
            '[text]',
            '[light]',
            '.chat-message',
            '[material]'
        ];
        
        this.entities = [];
        
        selectorsToOptimize.forEach(selector => {
            const elements = this.el.querySelectorAll(selector);
            elements.forEach(el => {
                if (el !== this.camera && !el.hasAttribute('spatial-optimizer')) {
                    this.entities.push({
                        element: el,
                        originalPosition: el.getAttribute('position') || { x: 0, y: 0, z: 0 },
                        originalVisible: true,
                        currentLod: 0,
                        lastDistance: Infinity,
                        gridCell: null,
                        isStatic: this.isStaticEntity(el)
                    });
                }
            });
        });
        
        this.stats.totalEntities = this.entities.length;
    },
    
    isStaticEntity(element) {
        // Determine if entity is static (doesn't move)
        return !element.hasAttribute('animation') && 
               !element.hasAttribute('wasd-controls') &&
               !element.hasAttribute('look-controls') &&
               !element.classList.contains('dynamic');
    },
    
    buildSpatialGrid() {
        this.spatialGrid.clear();
        
        this.entities.forEach(entity => {
            const pos = entity.element.getAttribute('position') || { x: 0, y: 0, z: 0 };
            const gridX = Math.floor(pos.x / this.gridSize);
            const gridZ = Math.floor(pos.z / this.gridSize);
            const gridKey = `${gridX},${gridZ}`;
            
            if (!this.spatialGrid.has(gridKey)) {
                this.spatialGrid.set(gridKey, []);
            }
            
            this.spatialGrid.get(gridKey).push(entity);
            entity.gridCell = gridKey;
        });
        
        console.log(`Spatial grid built: ${this.spatialGrid.size} cells`);
    },
    
    getCurrentSettings() {
        return this.qualitySettings[this.qualityLevel];
    },
    
    optimizationTick(time, timeDelta) {
        if (!this.data.enabled || !this.camera) return;
        
        const settings = this.getCurrentSettings();
        const now = performance.now();
        
        if (now - this.lastUpdateTime < settings.updateInterval) {
            this.stats.framesSinceUpdate++;
            return;
        }
        
        this.lastUpdateTime = now;
        this.stats.framesSinceUpdate = 0;
        
        // Get camera position and rotation
        const cameraPosition = this.camera.getAttribute('position') || { x: 0, y: 0, z: 0 };
        const cameraRotation = this.camera.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        
        // Reset stats
        this.stats.visibleEntities = 0;
        this.stats.culledEntities = 0;
        this.stats.lodReductions = 0;
        
        // Process entities based on spatial partitioning
        if (this.data.spatialPartitioning) {
            this.optimizeWithSpatialPartitioning(cameraPosition, cameraRotation, settings);
        } else {
            this.optimizeAllEntities(cameraPosition, cameraRotation, settings);
        }
        
        // Update debug visualization
        if (this.data.debugMode) {
            this.updateDebugVisualization(cameraPosition, settings);
        }
    },
    
    optimizeWithSpatialPartitioning(cameraPos, cameraRot, settings) {
        // Only check entities in nearby grid cells
        const cameraGridX = Math.floor(cameraPos.x / this.gridSize);
        const cameraGridZ = Math.floor(cameraPos.z / this.gridSize);
        const checkRadius = Math.ceil(settings.cullingDistance / this.gridSize) + 1;
        
        for (let x = cameraGridX - checkRadius; x <= cameraGridX + checkRadius; x++) {
            for (let z = cameraGridZ - checkRadius; z <= cameraGridZ + checkRadius; z++) {
                const gridKey = `${x},${z}`;
                const cellEntities = this.spatialGrid.get(gridKey);
                
                if (cellEntities) {
                    cellEntities.forEach(entity => {
                        this.optimizeEntity(entity, cameraPos, cameraRot, settings);
                    });
                }
            }
        }
    },
    
    optimizeAllEntities(cameraPos, cameraRot, settings) {
        this.entities.forEach(entity => {
            this.optimizeEntity(entity, cameraPos, cameraRot, settings);
        });
    },
    
    optimizeEntity(entity, cameraPos, cameraRot, settings) {
        const entityPos = entity.element.getAttribute('position') || { x: 0, y: 0, z: 0 };
        
        // Calculate distance
        const distance = this.calculateDistance(cameraPos, entityPos);
        entity.lastDistance = distance;
        
        // Frustum culling (basic)
        const isInFrustum = this.isInCameraFrustum(cameraPos, cameraRot, entityPos, distance);
        
        // Distance culling
        const withinCullingDistance = distance <= settings.cullingDistance;
        
        const shouldBeVisible = isInFrustum && withinCullingDistance;
        
        // Apply visibility
        if (shouldBeVisible !== entity.originalVisible) {
            entity.element.setAttribute('visible', shouldBeVisible);
            entity.originalVisible = shouldBeVisible;
            
            if (shouldBeVisible) {
                this.stats.visibleEntities++;
            } else {
                this.stats.culledEntities++;
            }
        } else if (shouldBeVisible) {
            this.stats.visibleEntities++;
        } else {
            this.stats.culledEntities++;
        }
        
        // Level of Detail (LOD) optimization
        if (shouldBeVisible && settings.lodLevels > 1) {
            this.applyLevelOfDetail(entity, distance, settings);
        }
        
        // Aggressive optimizations for low-performance scenarios
        if (this.data.aggressiveOptimization) {
            this.applyAggressiveOptimizations(entity, distance, settings);
        }
    },
    
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    
    isInCameraFrustum(cameraPos, cameraRot, entityPos, distance) {
        // Simplified frustum culling
        // Calculate angle between camera direction and entity direction
        
        const cameraYaw = (cameraRot.y || 0) * Math.PI / 180;
        
        // Vector from camera to entity
        const dx = entityPos.x - cameraPos.x;
        const dz = entityPos.z - cameraPos.z;
        
        // Camera forward direction
        const forwardX = Math.sin(cameraYaw);
        const forwardZ = -Math.cos(cameraYaw);
        
        // Dot product to get angle
        const dot = (dx * forwardX + dz * forwardZ) / distance;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        // FOV check (assume ~90 degree FOV, so ±45 degrees)
        const halfFOV = Math.PI / 4; // 45 degrees
        
        return angle <= halfFOV;
    },
    
    applyLevelOfDetail(entity, distance, settings) {
        const maxDistance = settings.cullingDistance;
        const lodLevel = Math.floor((distance / maxDistance) * settings.lodLevels);
        const clampedLod = Math.max(0, Math.min(settings.lodLevels - 1, lodLevel));
        
        if (clampedLod !== entity.currentLod) {
            entity.currentLod = clampedLod;
            this.stats.lodReductions++;
            
            // Apply LOD based on entity type
            const element = entity.element;
            
            // Text LOD
            if (element.hasAttribute('text')) {
                const baseWidth = 6;
                const lodWidth = baseWidth / (1 + clampedLod * 0.5);
                element.setAttribute('text', 'width', lodWidth);
            }
            
            // Geometry LOD
            if (element.hasAttribute('geometry')) {
                const geometry = element.getAttribute('geometry');
                if (geometry.primitive === 'sphere' || geometry.primitive === 'box') {
                    const baseFactor = 1;
                    const lodFactor = baseFactor / (1 + clampedLod * 0.3);
                    
                    if (geometry.primitive === 'sphere') {
                        const baseSegments = 32;
                        const lodSegments = Math.max(8, Math.floor(baseSegments * lodFactor));
                        element.setAttribute('geometry', {
                            ...geometry,
                            segmentsWidth: lodSegments,
                            segmentsHeight: Math.floor(lodSegments / 2)
                        });
                    }
                }
            }
            
            // Material LOD
            if (element.hasAttribute('material')) {
                const material = element.getAttribute('material');
                const lodOpacity = Math.max(0.3, 1 - (clampedLod * 0.2));
                element.setAttribute('material', 'opacity', lodOpacity);
            }
        }
    },
    
    applyAggressiveOptimizations(entity, distance, settings) {
        const element = entity.element;
        
        // Disable shadows for distant objects
        if (distance > settings.cullingDistance * 0.5) {
            if (element.hasAttribute('light')) {
                element.setAttribute('light', 'castShadow', false);
            }
        }
        
        // Reduce update frequency for distant dynamic objects
        if (!entity.isStatic && distance > settings.cullingDistance * 0.3) {
            // Could implement animation throttling here
        }
        
        // Simplify materials for very distant objects
        if (distance > settings.cullingDistance * 0.8) {
            const material = element.getAttribute('material');
            if (material && material.shader !== 'flat') {
                element.setAttribute('material', 'shader', 'flat');
            }
        }
    },
    
    adaptQualityLevel(targetQuality) {
        if (this.qualityLevel === targetQuality) return;
        
        console.log(`Adapting spatial optimization quality: ${this.qualityLevel} → ${targetQuality}`);
        this.qualityLevel = targetQuality;
        
        const settings = this.getCurrentSettings();
        
        // Update throttling
        this.tick = AFRAME.utils.throttleTick(this.optimizationTick.bind(this), settings.updateInterval, this);
        
        // Force immediate optimization with new settings
        if (this.camera) {
            const cameraPos = this.camera.getAttribute('position') || { x: 0, y: 0, z: 0 };
            const cameraRot = this.camera.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
            this.optimizeAllEntities(cameraPos, cameraRot, settings);
        }
    },
    
    setupDebugVisualization() {
        // Create debug container
        this.debugContainer = document.createElement('a-entity');
        this.debugContainer.setAttribute('id', 'spatial-optimizer-debug');
        this.el.appendChild(this.debugContainer);
        
        // Create culling distance indicator
        this.cullingIndicator = document.createElement('a-ring');
        this.cullingIndicator.setAttribute('geometry', {
            radiusInner: this.data.cullingDistance - 1,
            radiusOuter: this.data.cullingDistance
        });
        this.cullingIndicator.setAttribute('material', {
            color: '#ff0000',
            opacity: 0.2,
            transparent: true,
            side: 'double'
        });
        this.cullingIndicator.setAttribute('rotation', '90 0 0');
        this.debugContainer.appendChild(this.cullingIndicator);
    },
    
    updateDebugVisualization(cameraPos, settings) {
        if (!this.cullingIndicator) return;
        
        // Update culling distance ring
        this.cullingIndicator.setAttribute('position', cameraPos);
        this.cullingIndicator.setAttribute('geometry', {
            radiusInner: settings.cullingDistance - 1,
            radiusOuter: settings.cullingDistance
        });
        
        // Color based on quality level
        const qualityColors = {
            high: '#00ff00',
            medium: '#ffff00', 
            low: '#ff0000'
        };
        
        this.cullingIndicator.setAttribute('material', 'color', qualityColors[this.qualityLevel]);
    },
    
    // Public API
    getStats() {
        const efficiency = this.stats.totalEntities > 0 
            ? ((this.stats.culledEntities / this.stats.totalEntities) * 100).toFixed(1)
            : '0';
            
        return {
            ...this.stats,
            qualityLevel: this.qualityLevel,
            cullingEfficiency: `${efficiency}%`,
            spatialGridCells: this.spatialGrid.size,
            averageDistance: this.entities.length > 0 
                ? (this.entities.reduce((sum, e) => sum + e.lastDistance, 0) / this.entities.length).toFixed(1)
                : '0'
        };
    },
    
    setQualityLevel(level) {
        if (['high', 'medium', 'low'].includes(level)) {
            this.adaptQualityLevel(level);
        }
    },
    
    forceOptimization() {
        this.lastUpdateTime = 0; // Force immediate update
    },
    
    addEntity(element) {
        const entity = {
            element: element,
            originalPosition: element.getAttribute('position') || { x: 0, y: 0, z: 0 },
            originalVisible: true,
            currentLod: 0,
            lastDistance: Infinity,
            gridCell: null,
            isStatic: this.isStaticEntity(element)
        };
        
        this.entities.push(entity);
        this.stats.totalEntities++;
        
        // Add to spatial grid
        if (this.data.spatialPartitioning) {
            const pos = entity.originalPosition;
            const gridX = Math.floor(pos.x / this.gridSize);
            const gridZ = Math.floor(pos.z / this.gridSize);
            const gridKey = `${gridX},${gridZ}`;
            
            if (!this.spatialGrid.has(gridKey)) {
                this.spatialGrid.set(gridKey, []);
            }
            
            this.spatialGrid.get(gridKey).push(entity);
            entity.gridCell = gridKey;
        }
    },
    
    removeEntity(element) {
        const index = this.entities.findIndex(e => e.element === element);
        if (index !== -1) {
            const entity = this.entities[index];
            
            // Remove from spatial grid
            if (entity.gridCell && this.spatialGrid.has(entity.gridCell)) {
                const cellEntities = this.spatialGrid.get(entity.gridCell);
                const entityIndex = cellEntities.indexOf(entity);
                if (entityIndex !== -1) {
                    cellEntities.splice(entityIndex, 1);
                }
            }
            
            this.entities.splice(index, 1);
            this.stats.totalEntities--;
        }
    },
    
    remove() {
        if (this.debugContainer) {
            this.debugContainer.parentNode.removeChild(this.debugContainer);
        }
        
        // Restore all entities to original state
        this.entities.forEach(entity => {
            entity.element.setAttribute('visible', true);
        });
        
        console.log('Spatial Optimizer removed');
    }
});

// Helper function to add spatial optimization to any scene
if (typeof window !== 'undefined') {
    window.addSpatialOptimization = function(scene, options = {}) {
        const sceneEl = typeof scene === 'string' ? document.querySelector(scene) : scene;
        if (sceneEl) {
            sceneEl.setAttribute('spatial-optimizer', {
                enabled: options.enabled !== false,
                cullingDistance: options.cullingDistance || 50,
                lodLevels: options.lodLevels || 3,
                debugMode: options.debugMode || false,
                aggressiveOptimization: options.aggressiveOptimization || false,
                ...options
            });
            
            return sceneEl.components['spatial-optimizer'];
        }
        return null;
    };
}