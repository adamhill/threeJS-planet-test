/**
 * Controls module for managing user interactions and UI controls
 */

class Controls {
    /**
     * Create controls for the planet visualization
     * @param {Object} options - Configuration options
     * @param {THREE.Camera} options.camera - The camera to control
     * @param {Planet} options.planet - The planet instance
     * @param {Clouds} options.clouds - The clouds instance
     * @param {Water} options.water - The water instance
     * @param {HTMLElement} options.domElement - The renderer's DOM element
     * @param {Atmosphere} options.atmosphere - The atmosphere instance
     * @param {THREE.DirectionalLight} options.sunLight - The directional light representing the sun
     * @param {THREE.AmbientLight} options.ambientLight - The ambient light
     * @param {Function} options.onRegenerate - Callback for planet regeneration
     */
    constructor(options) {
        // Store references to required components
        this.camera = options.camera;
        this.domElement = options.domElement;
        this.planet = options.planet;
        this.clouds = options.clouds;
        this.water = options.water;
        this.atmosphere = options.atmosphere;
        this.sunLight = options.sunLight;
        this.ambientLight = options.ambientLight;
        this.onRegenerate = options.onRegenerate;
        
        // Default configuration
        this.config = {
            rotationSpeed: 0.0005,
            zoomSpeed: 0.05,
            minZoom: 7,
            maxZoom: 20,
            defaultCameraPosition: new THREE.Vector3(0, 0, 15)
        };
        
        // State variables
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.targetPlanetRotation = new THREE.Quaternion();
        this.currentPlanetRotation = new THREE.Quaternion();
        this.rotating = true;
        this.isDaytime = true;

        // Bind methods to preserve context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Initialize controls
        this.initializeControls();
        this.setupEventListeners();
    }
    
    /**
     * Initialize UI controls
     */
    initializeControls() {
        // Get UI elements
        this.elements = {
            resetCamera: document.getElementById('resetCamera'),
            toggleDayNight: document.getElementById('toggleDayNight'),
            heightScale: document.getElementById('heightScale'),
            heightScaleValue: document.getElementById('heightScaleValue'),
            noiseScale: document.getElementById('noiseScale'),
            noiseScaleValue: document.getElementById('noiseScaleValue'),
            mountainScale: document.getElementById('mountainScale'),
            mountainScaleValue: document.getElementById('mountainScaleValue'),
            waterLevel: document.getElementById('waterLevel'),
            waterLevelValue: document.getElementById('waterLevelValue'),
            regeneratePlanet: document.getElementById('regeneratePlanet')
        };
        
        // Set initial values
        if (this.elements.heightScaleValue) {
            this.elements.heightScaleValue.textContent = this.elements.heightScale.value;
        }
        if (this.elements.noiseScaleValue) {
            this.elements.noiseScaleValue.textContent = this.elements.noiseScale.value;
        }
        if (this.elements.mountainScaleValue) {
            this.elements.mountainScaleValue.textContent = this.elements.mountainScale.value;
        }
        if (this.elements.waterLevelValue) {
            this.elements.waterLevelValue.textContent = this.elements.waterLevel.value;
        }
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyDown);
        
        // Mouse controls - attach to renderer's DOM element only, not document
        if (this.domElement) {
            this.domElement.addEventListener('mousedown', this.handleMouseDown);
            this.domElement.addEventListener('mousemove', this.handleMouseMove);
            this.domElement.addEventListener('mouseup', this.handleMouseUp);
            this.domElement.addEventListener('mouseleave', this.handleMouseUp);
            this.domElement.addEventListener('wheel', this.handleWheel, { passive: false });}
        
        // UI controls
        this.setupUIControls();
    }
    
    setupUIControls() {
        if (this.elements.resetCamera) {
            this.elements.resetCamera.addEventListener('click', this.resetCamera.bind(this));
        }
        if (this.elements.toggleDayNight) {
            this.elements.toggleDayNight.addEventListener('click', this.toggleDayNight.bind(this));
        }
        if (this.elements.regeneratePlanet) {
            this.elements.regeneratePlanet.addEventListener('click', this.regeneratePlanet.bind(this));
        }
        
        // Slider input events
        if (this.elements.heightScale) {
            this.elements.heightScale.addEventListener('input', this.updateHeightScaleValue.bind(this));
        }
        if (this.elements.noiseScale) {
            this.elements.noiseScale.addEventListener('input', this.updateNoiseScaleValue.bind(this));
        }
        if (this.elements.mountainScale) {
            this.elements.mountainScale.addEventListener('input', this.updateMountainScaleValue.bind(this));
        }
        if (this.elements.waterLevel) {
            this.elements.waterLevel.addEventListener('input', this.updateWaterLevelValue.bind(this));
        }
        
        // Window resize event
        window.addEventListener('resize', this.handleResize);
    }
    
    /**
     * Handle keyboard controls
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'ArrowUp':
                this.config.rotationSpeed = Math.min(this.config.rotationSpeed + 0.0001, 0.005);
                break;
            case 'ArrowDown':
                this.config.rotationSpeed = Math.max(this.config.rotationSpeed - 0.0001, 0);
                break;
            case ' ':
                this.rotating = !this.rotating;
                break;
        }
    }
    
    /**
     * Handle mouse down for rotation
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        // Skip if we're clicking on UI elements like sliders or buttons
        if (event.target.tagName.toLowerCase() === 'input' || 
            event.target.tagName.toLowerCase() === 'button' ||
            event.target.closest('#controls')) {
            return;
        }
        
        this.isDragging = true;
        this.previousMousePosition = {
            x: event.offsetX,
            y: event.offsetY
        };
    }
    
    /**
     * Handle mouse move for rotation
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        // Skip if we're interacting with UI elements
        if (event.target.tagName.toLowerCase() === 'input' || 
            event.target.closest('#controls')) {
            return;
        }
        
        if (this.isDragging) {
            const deltaMove = {
                x: event.offsetX - this.previousMousePosition.x,
                y: event.offsetY - this.previousMousePosition.y
            };
            
            const deltaRotationQuaternion = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    THREE.MathUtils.degToRad(deltaMove.y * 0.5),
                    THREE.MathUtils.degToRad(deltaMove.x * 0.5),
                    0,
                    'XYZ'
                )
            );
            
            this.targetPlanetRotation.multiplyQuaternions(deltaRotationQuaternion, this.targetPlanetRotation);
        }
        
        this.previousMousePosition = {
            x: event.offsetX,
            y: event.offsetY
        };
    }
    
    /**
     * Handle mouse up after rotation
     */
    handleMouseUp() {
        this.isDragging = false;
    }
    
    /**
     * Handle mouse wheel for zooming
     * @param {WheelEvent} event - Wheel event
     */
    handleWheel(event) {
        event.preventDefault();
        const direction = event.deltaY > 0 ? 1 : -1;
        const zoomAmount = direction * this.config.zoomSpeed;
        
        this.camera.position.z = Math.max(
            this.config.minZoom, 
            Math.min(this.camera.position.z + zoomAmount, this.config.maxZoom)
        );
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    /**
     * Reset camera to default position
     */
    resetCamera() {
        this.camera.position.copy(this.config.defaultCameraPosition);
        this.camera.lookAt(0, 0, 0);
        this.targetPlanetRotation.set(0, 0, 0, 1);
        this.config.rotationSpeed = 0.0005;
        this.rotating = true;
        
        // Reset planet and cloud rotation
        if (this.planet) {
            this.planet.resetRotation();
        }
        if (this.clouds) {
            this.clouds.resetRotation();
        }
    }
    
    /**
     * Toggle between day and night lighting
     */
    toggleDayNight() {
        this.isDaytime = !this.isDaytime;
        
        if (this.isDaytime) {
            // Day time settings
            if (this.sunLight) {
                this.sunLight.position.set(50, 20, 50);
                this.sunLight.position.normalize();
                this.sunLight.intensity = 1.2;
            }
            if (this.ambientLight) {
                this.ambientLight.intensity = 0.6;
            }
        } else {
            // Night time settings
            if (this.sunLight) {
                this.sunLight.position.set(-50, -20, -50);
                this.sunLight.position.normalize();
                this.sunLight.intensity = 0.1;
            }
            if (this.ambientLight) {
                this.ambientLight.intensity = 0.2;
            }
        }
        
        // Update components with new lighting
        if (this.atmosphere) {
            this.atmosphere.setDayNightMode(this.isDaytime);
        }
        if (this.water) {
            this.water.setDayNightMode(this.isDaytime);
        }
        if (this.clouds) {
            this.clouds.setDayNightMode(this.isDaytime);
        }
    }
    
    /**
     * Update height scale value display
     */
    updateHeightScaleValue() {
        if (this.elements.heightScaleValue && this.elements.heightScale) {
            this.elements.heightScaleValue.textContent = this.elements.heightScale.value;
        }
    }
    
    /**
     * Update noise scale value display
     */
    updateNoiseScaleValue() {
        if (this.elements.noiseScaleValue && this.elements.noiseScale) {
            this.elements.noiseScaleValue.textContent = this.elements.noiseScale.value;
        }
    }
    
    /**
     * Update mountain scale value display
     */
    updateMountainScaleValue() {
        if (this.elements.mountainScaleValue && this.elements.mountainScale) {
            this.elements.mountainScaleValue.textContent = this.elements.mountainScale.value;
        }
    }
    
    /**
     * Update water level value display
     */
    updateWaterLevelValue() {
        if (this.elements.waterLevelValue && this.elements.waterLevel) {
            this.elements.waterLevelValue.textContent = this.elements.waterLevel.value;
        }
    }
    
    /**
     * Regenerate the planet with current slider values
     */
    regeneratePlanet() {
        const planetOptions = {
            heightScale: parseFloat(this.elements.heightScale.value),
            noiseScale: parseFloat(this.elements.noiseScale.value),
            mountainScale: parseFloat(this.elements.mountainScale.value),
            waterLevel: parseFloat(this.elements.waterLevel.value)
        };
        
        if (this.onRegenerate) {
            this.onRegenerate(planetOptions);
        }
    }
    
    /**
     * Update planet rotation (called in animation loop)
     */
    update() {
        // Apply planet auto-rotation if enabled
        if (this.rotating && this.planet && this.planet.getMesh()) {
            this.planet.getMesh().rotation.y += this.config.rotationSpeed;
        }
        
        // Smooth interpolation for manual rotation
        if (this.planet && this.planet.getMesh()) {
            this.currentPlanetRotation.slerp(this.targetPlanetRotation, 0.1);
            this.planet.getMesh().quaternion.copy(this.currentPlanetRotation);
        }
    }
    
    /**
     * Clean up all event listeners
     */
    dispose() {
        document.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('resize', this.handleResize);

        if (this.domElement) {
            this.domElement.removeEventListener('mousedown', this.handleMouseDown);
            this.domElement.removeEventListener('mousemove', this.handleMouseMove);
            this.domElement.removeEventListener('mouseup', this.handleMouseUp);
            this.domElement.removeEventListener('mouseleave', this.handleMouseUp);
            this.domElement.removeEventListener('wheel', this.handleWheel);
        }
        if (this.elements.resetCamera) {
            this.elements.resetCamera.removeEventListener('click', this.resetCamera);
        }
        if (this.elements.toggleDayNight) {
            this.elements.toggleDayNight.removeEventListener('click', this.toggleDayNight);
        }
        if (this.elements.regeneratePlanet) {
            this.elements.regeneratePlanet.removeEventListener('click', this.regeneratePlanet);
        }
        
        if (this.elements.heightScale) {
            this.elements.heightScale.removeEventListener('input', this.updateHeightScaleValue);
        }
        if (this.elements.noiseScale) {
            this.elements.noiseScale.removeEventListener('input', this.updateNoiseScaleValue);
        }
        if (this.elements.mountainScale) {
            this.elements.mountainScale.removeEventListener('input', this.updateMountainScaleValue);
        }
        if (this.elements.waterLevel) {
            this.elements.waterLevel.removeEventListener('input', this.updateWaterLevelValue);
        }
    }
}