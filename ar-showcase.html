<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebAR Model Placement</title>
    
    <!-- A-Frame Core - Latest Version 1.7.0 -->
    <script src="https://aframe.io/releases/1.7.0/aframe.min.js"></script>
    
    <!-- AR.js for A-Frame (includes WebXR support) -->
    <script src="https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/aframe/build/aframe-ar.js"></script>
    
    <!-- External Styles -->
    <link rel="stylesheet" href="css/test.css">
</head>
<body>
    <!-- Instructions Overlay -->
    <div id="instructions">
        <h2>WebAR Model Placement</h2>
        <p>📱 This app allows you to place 3D models in your real environment using AR</p>
        <p>✨ Select a model from the panel and tap to place it in your space</p>
        <p>🎯 Move your device to scan the environment for better tracking</p>
        <button id="startButton" class="ar-button">Start AR Experience</button>
    </div>

    <!-- Status Indicator -->
    <div id="status" class="hidden">
        <span class="status-dot"></span>
        <span id="statusText">Initializing AR...</span>
    </div>
<div class="ar-overlay">
    <!-- Model Selection Panel -->
    <div id="modelPanel" class="hidden">
        <h3>Select Model</h3>
        <!-- Primitive Models -->
        <div class="model-category">Shapes</div>
        <div class="model-option selected" data-model="cube" data-type="primitive">
            <div class="model-icon">📦</div>
            <div class="model-name">Cube</div>
        </div>
        <div class="model-option" data-model="sphere" data-type="primitive">
            <div class="model-icon">⭕</div>
            <div class="model-name">Sphere</div>
        </div>
        <div class="model-option" data-model="cylinder" data-type="primitive">
            <div class="model-icon">⚪</div>
            <div class="model-name">Cylinder</div>
        </div>
        <div class="model-option" data-model="torus" data-type="primitive">
            <div class="model-icon">🍩</div>
            <div class="model-name">Torus</div>
        </div>
        
        <!-- GLB Models -->
        <div class="model-category">3D Models</div>
        <div class="model-option" data-model="robot" data-type="gltf">
            <div class="model-icon">🤖</div>
            <div class="model-name">Robot</div>
        </div>
        <div class="model-option" data-model="fox" data-type="gltf">
            <div class="model-icon">🦊</div>
            <div class="model-name">Fox</div>
        </div>
        <div class="model-option" data-model="avocado" data-type="gltf">
            <div class="model-icon">🥑</div>
            <div class="model-name">Avocado</div>
        </div>
        <div class="model-option" data-model="duck" data-type="gltf">
            <div class="model-icon">🦆</div>
            <div class="model-name">Duck</div>
        </div>
    </div>

    <!-- AR Control Buttons -->
    <div id="arControls" class="hidden">
        <button id="placeButton" class="ar-button">Place Model</button>
        <button id="clearButton" class="ar-button secondary">Clear All</button>
        <button id="exitButton" class="ar-button secondary">Exit AR</button>
    </div>

 
</div>
    <!-- Placement Reticle -->
    <div id="reticle"></div>

    <!-- A-Frame Scene -->
    <a-scene
        id="scene"
        embedded
        arjs="sourceType: webcam; sourceWidth:1280; sourceHeight:960; displayWidth: 1280; displayHeight: 960; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
        vr-mode-ui="enabled: true"
        renderer="logarithmicDepthBuffer: true; precision: high; antialias: true; alpha: true; colorManagement: true;"
        webxr="requiredFeatures: hit-test,local-floor;
               optionalFeatures: dom-overlay,anchors,light-estimation,hand-tracking,depth-sensing,plane-detection;
               overlayElement: #arControls;"
        ar-hit-test="target: #reticle; type: map"
        ar-mode-ui="enabled: true"
        device-orientation-permission-ui="enabled: true">
        
        <!-- Camera Entity for mobile support -->
        <a-camera-static></a-camera-static>
        
        <!-- Assets -->
        <a-assets>
            <!-- GLB Models - Add your model URLs here -->
            <!-- Example models from CDN (replace with your own) -->
            <a-asset-item id="robotModel" src="assets/Astronaut.glb"></a-asset-item>
            <a-asset-item id="foxModel" src="assets/fox.glb"></a-asset-item>
            <a-asset-item id="avocadoModel" src="assets/adidas.glb"></a-asset-item>
            <a-asset-item id="duckModel" src="assets/duck.glb"></a-asset-item>
            
            <!-- Define reusable materials -->
            <a-mixin id="cube-material" material="color: #4CC3D9; metalness: 0.7; roughness: 0.3"></a-mixin>
            <a-mixin id="sphere-material" material="color: #EF2D5E; metalness: 0.8; roughness: 0.2"></a-mixin>
            <a-mixin id="cylinder-material" material="color: #7BC8A4; metalness: 0.6; roughness: 0.4"></a-mixin>
            <a-mixin id="torus-material" material="color: #FFC65D; metalness: 0.7; roughness: 0.3"></a-mixin>
        </a-assets>

        <!-- Camera with AR capabilities -->
        <a-entity camera position="0 1.6 0" look-controls wasd-controls ar-cursor>
            <a-entity 
                id="cursor"
                cursor="rayOrigin: mouse; fuse: true; fuseTimeout: 500"
                raycaster="objects: .clickable; far: 100"
                position="0 0 -1"
                geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03"
                material="color: white; shader: flat; opacity: 0.5"
                animation__click="property: scale; startEvents: click; easing: easeInOutCubic; dur: 150; from: 1 1 1; to: 1.5 1.5 1.5"
                animation__clickback="property: scale; startEvents: clickback; easing: easeInOutCubic; dur: 150; from: 1.5 1.5 1.5; to: 1 1 1"
                visible="false">
            </a-entity>
        </a-entity>

        <!-- Lighting setup for AR -->
        <a-light type="ambient" color="#ffffff" intensity="0.5"></a-light>
        <a-light type="directional" color="#ffffff" intensity="0.5" position="-0.5 1 1"></a-light>

        <!-- Container for placed models -->
        <a-entity id="modelContainer"></a-entity>

        <!-- Ground plane indicator (will be positioned via hit-test) -->
        <a-plane
            id="groundPlane"
            rotation="-90 0 0"
            width="0.5"
            height="0.5"
            material="color: white; opacity: 0.3"
            visible="false">
        </a-plane>
    </a-scene>

    <!-- External JavaScript -->
    <script src="js/ar-test.js"></script>
</body>
</html>
