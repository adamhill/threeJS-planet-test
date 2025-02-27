/**
 * Water module for the planet visualization
 * Creates a water layer with reflective and transparent properties
 */

class Water {
    /**
     * Creates a water layer for the planet
     * @param {THREE.Scene} scene - The scene to add the water to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Default configuration with option overrides
        this.config = {
            planetRadius: options.planetRadius || 5,
            waterLevel: options.waterLevel || 0.1,
            waterColor: options.waterColor || new THREE.Color(0x00a1d6),
            deepWaterColor: options.deepWaterColor || new THREE.Color(0x001a33),
            sunDirection: options.sunDirection || new THREE.Vector3(1, 0.5, 1).normalize(),
            opacity: options.opacity || 0.7,
            resolution: options.resolution || 256
        };
        
        this.time = 0;
        this.init();
    }
    
    /**
     * Initialize and create the water surface
     */
    init() {
        const waterRadius = this.config.planetRadius + this.config.waterLevel - 0.05;
        const waterGeometry = new THREE.SphereGeometry(
            waterRadius,
            this.config.resolution,
            this.config.resolution
        );
        
        this.waterMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waterColor: { value: this.config.waterColor },
                deepWaterColor: { value: this.config.deepWaterColor },
                sunDirection: { value: this.config.sunDirection },
            },
            vertexShader: WaterShaders.vertexShader,
            fragmentShader: WaterShaders.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
        });
        
        this.mesh = new THREE.Mesh(waterGeometry, this.waterMaterial);
        this.scene.add(this.mesh);
    }
    
    /**
     * Update the water surface animation
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.time += deltaTime;
        if (this.waterMaterial && this.waterMaterial.uniforms) {
            this.waterMaterial.uniforms.time.value = this.time;
        }
    }
    
    /**
     * Update water properties
     * @param {Object} options - Properties to update
     */
    updateProperties(options = {}) {
        if (options.waterLevel !== undefined) {
            this.recreateWithNewLevel(options.waterLevel);
        }
        
        if (options.sunDirection) {
            this.waterMaterial.uniforms.sunDirection.value.copy(options.sunDirection);
        }
        
        if (options.waterColor) {
            this.waterMaterial.uniforms.waterColor.value.copy(options.waterColor);
        }
        
        if (options.deepWaterColor) {
            this.waterMaterial.uniforms.deepWaterColor.value.copy(options.deepWaterColor);
        }
    }
    
    /**
     * Recreate the water mesh with a new water level
     * @param {number} waterLevel - New water level
     */
    recreateWithNewLevel(waterLevel) {
        // Remove the old mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
        }
        
        // Create a new mesh with the updated radius
        const waterRadius = this.config.planetRadius + waterLevel - 0.05;
        const waterGeometry = new THREE.SphereGeometry(
            waterRadius,
            this.config.resolution,
            this.config.resolution
        );
        
        this.mesh = new THREE.Mesh(waterGeometry, this.waterMaterial);
        this.scene.add(this.mesh);
        
        // Update the config
        this.config.waterLevel = waterLevel;
    }
    
    /**
     * Set the day or night mode
     * @param {boolean} isDaytime - Whether it's daytime
     */
    setDayNightMode(isDaytime) {
        const sunDirection = isDaytime ? 
            new THREE.Vector3(1, 0.5, 1) : 
            new THREE.Vector3(-1, -0.5, -1);
            
        sunDirection.normalize();
        this.waterMaterial.uniforms.sunDirection.value.copy(sunDirection);
    }
    
    /**
     * Get the water mesh
     * @returns {THREE.Mesh} The water mesh
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Dispose of resources when no longer needed
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}