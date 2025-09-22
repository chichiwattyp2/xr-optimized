/**
 * WebAR Model Placement Application
 * Built with A-Frame 1.7.0 and WebXR
 * 
 * This application allows users to place 3D models in AR space
 * using WebXR hit-testing and surface detection
 */

class WebARApp {
    constructor() {
        // State management
        this.isARActive = false;
        this.selectedModel = 'cube';
        this.selectedType = 'primitive';
        this.placedModels = [];
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        this.reticle = null;
        this.clickPlacementActive = false;
        
        // DOM elements cache
        this.elements = {
            scene: document.querySelector('#scene'),
            modelContainer: document.querySelector('#modelContainer'),
            status: document.querySelector('#status'),
            statusText: document.querySelector('#statusText'),
            instructions: document.querySelector('#instructions'),
            arControls: document.querySelector('#arControls'),
            modelPanel: document.querySelector('#modelPanel'),
            reticleElement: document.querySelector('#reticle'),
            placeButton: document.querySelector('#placeButton'),
            clearButton: document.querySelector('#clearButton'),
            exitButton: document.querySelector('#exitButton'),
            startButton: document.querySelector('#startButton')
        };
        
        // Model configurations
        this.modelConfigs = {
            // Primitive models
            cube: {
                type: 'primitive',
                geometry: 'primitive: box; width: 0.3; height: 0.3; depth: 0.3',
                material: 'color: #4CC3D9; metalness: 0.7; roughness: 0.3'
            },
            sphere: {
                type: 'primitive',
                geometry: 'primitive: sphere; radius: 0.2',
                material: 'color: #EF2D5E; metalness: 0.8; roughness: 0.2'
            },
            cylinder: {
                type: 'primitive',
                geometry: 'primitive: cylinder; radius: 0.15; height: 0.4',
                material: 'color: #7BC8A4; metalness: 0.6; roughness: 0.4'
            },
            torus: {
                type: 'primitive',
                geometry: 'primitive: torus; radius: 0.2; radiusTubular: 0.05',
                material: 'color: #FFC65D; metalness: 0.7; roughness: 0.3'
            },
            // GLB models
            robot: {
                type: 'gltf',
                src: '#robotModel',
                scale: '0.5 0.5 0.5',
                animations: true
            },
            fox: {
                type: 'gltf',
                src: '#foxModel',
                scale: '0.008 0.008 0.008',
                animations: true
            },
            avocado: {
                type: 'gltf',
                src: '#avocadoModel',
                scale: '2 2 2',
                animations: false
            },
            duck: {
                type: 'gltf',
                src: '#duckModel',
                scale: '0.3 0.3 0.3',
                animations: false
            }
        };
        
        // Initialize application
        this.init();
    }
    
    /**
     * Initialize the WebAR application
     */
    init() {
        console.log('🚀 WebAR App initializing...');
        
        // Detect mobile device
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            console.log('📱 Mobile device detected');
            // Add mobile-specific class
            document.body.classList.add('is-mobile');
        }
        
        // Check WebXR support
        if (!this.checkWebXRSupport()) {
            this.showFallback();
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup custom A-Frame components if needed
        this.registerComponents();
        
        console.log('✅ WebAR App initialized');
        this.updateStatus('Ready to start AR');
    }
    
    /**
     * Check if WebXR is supported in the browser
     */
    checkWebXRSupport() {
        if ('xr' in navigator) {
            // Check for immersive-ar support asynchronously
            navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
                if (!supported) {
                    console.warn('⚠️ Immersive AR not supported, falling back to camera view');
                }
            });
            return true;
        }
        console.error('❌ WebXR not supported in this browser');
        return false;
    }
    
    /**
     * Show fallback UI for non-WebXR browsers
     */
    showFallback() {
        this.elements.statusText.textContent = 'WebXR not supported. Using camera fallback.';
        // Continue with AR.js fallback
        this.initARFallback();
    }
    
    /**
     * Register custom A-Frame components
     */
    registerComponents() {
        // Register a custom component for model interactions
        AFRAME.registerComponent('ar-model', {
            init: function() {
                this.el.addEventListener('click', () => {
                    // Rotate model on click
                    const currentRotation = this.el.getAttribute('rotation');
                    this.el.setAttribute('animation', `
                        property: rotation;
                        to: ${currentRotation.x} ${currentRotation.y + 90} ${currentRotation.z};
                        dur: 500;
                        easing: easeInOutQuad
                    `);
                });
            }
        });
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Start button
        this.elements.startButton.addEventListener('click', () => this.initAR());
        
        // Control buttons
        this.elements.placeButton.addEventListener('click', () => this.placeModel());
        this.elements.clearButton.addEventListener('click', () => this.clearModels());
        this.elements.exitButton.addEventListener('click', () => this.exitAR());
        
        // Model selection
        document.querySelectorAll('.model-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const model = e.currentTarget.dataset.model;
                const type = e.currentTarget.dataset.type || 'primitive';
                this.selectModel(model, type);
            });
        });
        
        // Scene events for AR session management
        this.elements.scene.addEventListener('enter-vr', () => {
            console.log('📱 Entered AR mode');
            this.onARSessionStarted();
        });
        
        this.elements.scene.addEventListener('exit-vr', () => {
            console.log('📴 Exited AR mode');
            this.onARSessionEnded();
        });
        
        // Handle WebXR session events
        this.elements.scene.addEventListener('sessionstart', () => {
            console.log('🎯 WebXR session started');
        });
        
        this.elements.scene.addEventListener('sessionend', () => {
            console.log('🛑 WebXR session ended');
        });
    }
    
    /**
     * Initialize AR session
     */
    async initAR() {
        try {
            console.log('🎬 Starting AR session...');
            
            // Hide instructions
            this.elements.instructions.classList.add('hidden');
            
            // Show UI elements
            this.elements.status.classList.remove('hidden');
            this.elements.arControls.classList.remove('hidden');
            this.elements.modelPanel.classList.remove('hidden');
            
            // Update status
            this.updateStatus('Starting AR session...');
            
            // Check if WebXR is available in A-Frame 1.7.0
            const sceneEl = this.elements.scene;
            
            // Request AR session with A-Frame 1.7.0's improved WebXR support
            if ('xr' in navigator) {
                // Check for immersive-ar support
                const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
                
                if (arSupported) {
                    // Enter AR mode using A-Frame's WebXR
                    sceneEl.enterAR();
                    this.updateStatus('WebXR AR Active');
                } else {
                    // Fallback to standard VR/camera mode
                    console.log('AR not supported, using camera fallback');
                    this.initARFallback();
                    return;
                }
            } else {
                // No WebXR support
                this.initARFallback();
                return;
            }
            
            this.isARActive = true;
            
            // Setup hit testing with A-Frame 1.7.0's built-in support
            this.setupHitTesting();
            
        } catch (error) {
            console.error('❌ Failed to start AR:', error);
            this.updateStatus('Failed to start AR: ' + error.message);
            this.initARFallback();
        }
    }
    
    /**
     * Initialize AR.js as fallback for non-WebXR browsers
     */
    initARFallback() {
        console.log('📸 Initializing AR.js fallback');
        
        // Hide instructions
        this.elements.instructions.classList.add('hidden');
        
        // Show controls
        this.elements.status.classList.remove('hidden');
        this.elements.arControls.classList.remove('hidden');
        this.elements.modelPanel.classList.remove('hidden');
        
        // Show reticle for placement
        this.elements.reticleElement.style.display = 'block';
        
        // Request camera permissions explicitly on mobile
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            })
            .then(stream => {
                console.log('✅ Camera access granted');
                // Camera will be handled by AR.js
            })
            .catch(err => {
                console.error('❌ Camera access denied:', err);
                this.updateStatus('Camera access required for AR');
            });
        }
        
        this.isARActive = true;
        this.updateStatus('AR Ready (Camera Mode)');
    }
    
    /**
     * Setup WebXR hit testing for surface detection
     */
    setupHitTesting() {
        console.log('🎯 Setting up hit testing...');
        
        // Get XR session from A-Frame
        const session = this.elements.scene.renderer?.xr?.getSession();
        
        if (!session) {
            console.log('No XR session available, using fallback placement');
            return;
        }
        
        // Request hit test source for surface detection
        session.requestReferenceSpace('viewer').then((referenceSpace) => {
            session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                this.hitTestSource = source;
                console.log('✅ Hit test source created');
            });
        });
        
        // Create reticle for hit test visualization
        this.createReticle();
    }
    
    /**
     * Create visual reticle for placement preview
     */
    createReticle() {
        // Create a visual indicator for where models will be placed
        const reticle = document.createElement('a-entity');
        reticle.setAttribute('id', 'ar-reticle');
        reticle.innerHTML = `
            <a-ring color="#ffffff" radius-inner="0.1" radius-outer="0.15" opacity="0.5"></a-ring>
            <a-ring color="#ffffff" radius-inner="0.05" radius-outer="0.055" opacity="0.8"></a-ring>
        `;
        reticle.setAttribute('visible', false);
        this.elements.scene.appendChild(reticle);
        this.reticle = reticle;
    }
    
    /**
     * Select a model type for placement
     */
    selectModel(modelType, type = 'primitive') {
        // Update selected model and type
        this.selectedModel = modelType;
        this.selectedType = type;
        
        // Update UI - remove selected class from all options
        document.querySelectorAll('.model-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selected class to chosen option
        document.querySelector(`[data-model="${modelType}"]`).classList.add('selected');
        
        console.log(`✨ Selected model: ${modelType} (${type})`);
        this.updateStatus(`Selected: ${modelType}`);
    }
    
    /**
     * Place a model in AR space
     */
    placeModel() {
        if (!this.isARActive) {
            console.warn('⚠️ AR session not active');
            return;
        }
        
        console.log('📍 Placing model:', this.selectedModel);
        
        // Show loading indicator for GLB models
        const config = this.modelConfigs[this.selectedModel];
        if (config && config.type === 'gltf') {
            this.showLoading(true);
        }
        
        // Create model based on selection
        const model = this.createModelEntity(this.selectedModel);
        
        // Position model based on hit test or fallback
        this.positionModel(model);
        
        // Add to container
        this.elements.modelContainer.appendChild(model);
        this.placedModels.push(model);
        
        // Add interaction handlers
        this.addModelInteraction(model);
        
        // Handle loading complete for GLB models
        if (config && config.type === 'gltf') {
            model.addEventListener('model-loaded', () => {
                this.showLoading(false);
                console.log(`✅ Model placed: ${this.selectedModel} (${this.placedModels.length} total)`);
                this.updateStatus(`Placed ${this.selectedModel} (${this.placedModels.length} total)`);
                // Animate after loading
                this.animateModelPlacement(model);
            });
            
            model.addEventListener('model-error', () => {
                this.showLoading(false);
            });
        } else {
            // For primitives, update immediately
            console.log(`✅ Model placed: ${this.selectedModel} (${this.placedModels.length} total)`);
            this.updateStatus(`Placed ${this.selectedModel} (${this.placedModels.length} total)`);
            // Animate placement
            this.animateModelPlacement(model);
        }
        
        // Add click-to-place functionality for camera mode
        if (!this.hitTestSource && !this.clickPlacementActive) {
            this.addCameraModePlacement();
        }
    }
    
    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        const loadingEl = document.querySelector('#loadingIndicator');
        if (loadingEl) {
            if (show) {
                loadingEl.classList.remove('hidden');
            } else {
                loadingEl.classList.add('hidden');
            }
        }
    }
    
    /**
     * Add click-to-place functionality for camera fallback mode
     */
    addCameraModePlacement() {
        // Create a click handler for the scene
        const placeOnClick = (event) => {
            if (!this.isARActive) return;
            
            // Calculate position based on click/touch coordinates
            const x = (event.clientX / window.innerWidth) * 2 - 1;
            const y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Create a new model at the calculated position
            const model = this.createModelEntity(this.selectedModel);
            
            // Position based on screen coordinates
            const camera = this.elements.scene.camera;
            const distance = 3; // 3 meters away
            
            // Convert screen position to 3D world position
            const vector = new THREE.Vector3(x, y, 0.5);
            vector.unproject(camera);
            vector.sub(camera.position).normalize();
            
            const position = camera.position.clone();
            position.add(vector.multiplyScalar(distance));
            
            model.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
            
            // Add to scene
            this.elements.modelContainer.appendChild(model);
            this.placedModels.push(model);
            
            // Add interactions
            this.addModelInteraction(model);
            
            // Animate
            this.animateModelPlacement(model);
            
            // Update status
            this.updateStatus(`Placed ${this.selectedModel} at click position (${this.placedModels.length} total)`);
        };
        
        // Add event listener once
        if (!this.clickPlacementActive) {
            this.elements.scene.addEventListener('click', placeOnClick);
            this.clickPlacementActive = true;
            console.log('📱 Click-to-place mode activated');
        }
    }
    
    /**
     * Create a model entity with specified type
     */
    createModelEntity(type) {
        const model = document.createElement('a-entity');
        model.classList.add('clickable', 'ar-model');
        
        // Get configuration for model type
        const config = this.modelConfigs[type];
        
        if (config) {
            if (config.type === 'gltf') {
                // Create GLTF model
                model.setAttribute('gltf-model', config.src);
                model.setAttribute('scale', config.scale);
                
                // Add animation if model supports it
                if (config.animations) {
                    model.setAttribute('animation-mixer', 'clip: *; loop: repeat');
                }
                
                // Add loading handler
                model.addEventListener('model-loaded', () => {
                    console.log(`✅ GLB model loaded: ${type}`);
                    this.updateStatus(`${type} model loaded`);
                    
                    // Auto-play animations if available
                    if (config.animations) {
                        const mixer = model.components['animation-mixer'];
                        if (mixer) {
                            mixer.mixer.clipAction(mixer.mixer._actions[0]).play();
                        }
                    }
                });
                
                model.addEventListener('model-error', (err) => {
                    console.error(`❌ Error loading model ${type}:`, err);
                    this.updateStatus(`Error loading ${type}`);
                });
            } else {
                // Create primitive model
                model.setAttribute('geometry', config.geometry);
                model.setAttribute('material', config.material);
            }
        }
        
        // Add shadow for realism
        model.setAttribute('shadow', 'cast: true; receive: false');
        
        // Add custom component
        model.setAttribute('ar-model', '');
        
        // Add rotation animation for all models
        model.setAttribute('animation__rotate', `
            property: rotation;
            to: 0 360 0;
            loop: true;
            dur: 20000;
            easing: linear;
            pauseEvents: mouseenter;
            resumeEvents: mouseleave
        `);
        
        return model;
    }
    
    /**
     * Position model based on hit test or camera
     */
    positionModel(model) {
        if (this.reticle && this.reticle.getAttribute('visible')) {
            // Use reticle position from hit test
            const position = this.reticle.getAttribute('position');
            model.setAttribute('position', position);
        } else {
            // Fallback: Place in front of camera
            const camera = this.elements.scene.camera;
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            
            const position = camera.position.clone();
            position.add(direction.multiplyScalar(2)); // 2 meters in front
            position.y = Math.max(0, position.y - 1); // Place at reasonable height
            
            model.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
        }
    }
    
    /**
     * Add interaction capabilities to model
     */
    addModelInteraction(model) {
        // Add hover effect
        model.addEventListener('mouseenter', () => {
            model.setAttribute('animation__hover', `
                property: scale;
                to: 1.1 1.1 1.1;
                dur: 200;
                easing: easeOutElastic
            `);
        });
        
        model.addEventListener('mouseleave', () => {
            model.setAttribute('animation__hover', `
                property: scale;
                to: 1 1 1;
                dur: 200;
                easing: easeOutElastic
            `);
        });
    }
    
    /**
     * Animate model appearance
     */
    animateModelPlacement(model) {
        // Scale in animation
        model.setAttribute('scale', '0 0 0');
        model.setAttribute('animation__scale', `
            property: scale;
            to: 1 1 1;
            dur: 600;
            easing: easeOutElastic
        `);
        
        // Add floating animation after placement
        setTimeout(() => {
            const position = model.getAttribute('position');
            model.setAttribute('animation__float', `
                property: position;
                from: ${position.x} ${position.y} ${position.z};
                to: ${position.x} ${position.y + 0.05} ${position.z};
                dir: alternate;
                dur: 2000;
                loop: true;
                easing: easeInOutSine
            `);
        }, 700);
    }
    
    /**
     * Clear all placed models
     */
    clearModels() {
        console.log('🗑️ Clearing all models...');
        
        // Animate removal for each model
        this.placedModels.forEach((model, index) => {
            // Stagger the animation
            setTimeout(() => {
                model.setAttribute('animation__remove', `
                    property: scale;
                    to: 0 0 0;
                    dur: 300;
                    easing: easeInQuad
                `);
                
                // Remove after animation
                setTimeout(() => {
                    model.remove();
                }, 300);
            }, index * 50);
        });
        
        // Clear array
        this.placedModels = [];
        
        console.log('✅ All models cleared');
        this.updateStatus('All models cleared');
    }
    
    /**
     * Exit AR session
     */
    exitAR() {
        console.log('🚪 Exiting AR session...');
        
        // Exit AR/VR mode
        if (this.elements.scene.is('vr-mode')) {
            this.elements.scene.exitVR();
        }
        
        this.isARActive = false;
        
        // Clear models
        this.clearModels();
        
        // Hide AR UI
        this.elements.arControls.classList.add('hidden');
        this.elements.modelPanel.classList.add('hidden');
        this.elements.status.classList.add('hidden');
        this.elements.reticleElement.style.display = 'none';
        
        // Show instructions
        this.elements.instructions.classList.remove('hidden');
        
        console.log('👋 AR session ended');
    }
    
    /**
     * Handle AR session start
     */
    onARSessionStarted() {
        this.updateStatus('AR Active - Tap to place models');
        
        // Start render loop for hit testing if available
        if (this.hitTestSource) {
            this.startHitTestLoop();
        }
    }
    
    /**
     * Handle AR session end
     */
    onARSessionEnded() {
        this.updateStatus('AR session ended');
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
    }
    
    /**
     * Start hit test render loop for surface detection
     */
    startHitTestLoop() {
        const session = this.elements.scene.renderer?.xr?.getSession();
        if (!session) return;
        
        const onXRFrame = (time, frame) => {
            if (this.hitTestSource && frame) {
                const hitTestResults = frame.getHitTestResults(this.hitTestSource);
                
                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];
                    const pose = hit.getPose(frame.session.referenceSpace);
                    
                    if (pose && this.reticle) {
                        // Show and position reticle at hit point
                        this.reticle.setAttribute('visible', true);
                        this.reticle.setAttribute('position', {
                            x: pose.transform.position.x,
                            y: pose.transform.position.y,
                            z: pose.transform.position.z
                        });
                    }
                } else if (this.reticle) {
                    // Hide reticle if no hit detected
                    this.reticle.setAttribute('visible', false);
                }
            }
            
            // Continue loop if AR is active
            if (this.isARActive) {
                session.requestAnimationFrame(onXRFrame);
            }
        };
        
        // Start the loop
        session.requestAnimationFrame(onXRFrame);
    }
    
    /**
     * Update status display
     */
    updateStatus(message) {
        this.elements.statusText.textContent = message;
        console.log('📊 Status:', message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM loaded, initializing WebAR app...');
    window.arApp = new WebARApp();
});

// Handle orientation changes
window.addEventListener('orientationchange', () => {
    if (window.arApp && window.arApp.isARActive) {
        console.log('📱 Orientation changed, adjusting AR view');
        // A-Frame handles orientation changes automatically
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.arApp && window.arApp.isARActive) {
        console.log('⏸️ App hidden, pausing AR');
        // Optionally pause AR session
    }
});