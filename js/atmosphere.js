/**
 * Atmosphere module for the planet visualization
 * Creates a glowing atmospheric layer around the planet
 */

class Atmosphere {
    /**
     * Creates an atmospheric layer for the planet
     * @param {THREE.Scene} scene - The scene to add the atmosphere to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Default configuration with option overrides
        this.config = {
            planetRadius: options.planetRadius || 5,
            atmosphereRadius: options.atmosphereRadius || options.planetRadius + 1.2 || 6.2,
            dayColor: options.dayColor || new THREE.Color(0x3b95d3),
            nightColor: options.nightColor || new THREE.Color(0x0c1445),
            sunPosition: options.sunPosition || new THREE.Vector3(50, 20, 50).normalize()
        };
        
        // Current detail level
        this.currentDetailFactor = 1.0;
        
        this.init();
    }
    
    /**
     * Initialize and create the atmosphere
     */
    init() {
        const atmosphereGeometry = new THREE.SphereGeometry(
            this.config.atmosphereRadius, 
            256, 
            256
        );
        
        this.atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunPosition: { value: this.config.sunPosition },
                planetRadius: { value: this.config.planetRadius },
                atmosphereRadius: { value: this.config.atmosphereRadius },
                dayColor: { value: this.config.dayColor },
                nightColor: { value: this.config.nightColor },
            },
            vertexShader: AtmosphereShaders.vertexShader,
            fragmentShader: AtmosphereShaders.fragmentShader,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
        });
        
        this.mesh = new THREE.Mesh(atmosphereGeometry, this.atmosphereMaterial);
        this.scene.add(this.mesh);
    }
    
    /**
     * Update the atmosphere resolution based on detail factor
     * @param {number} detailFactor - Detail factor between 0.0 and 1.0
     */
    updateResolution(detailFactor) {
        // Only update if detail factor changed significantly
        if (Math.abs(detailFactor - this.currentDetailFactor) < 0.1) return;
        
        this.currentDetailFactor = detailFactor;
        
        // Calculate resolution based on detail factor
        const minResolution = 64;
        const maxResolution = 256;
        
        // Calculate resolution - ensure it's a power of 2
        const resolutionRange = Math.log2(maxResolution) - Math.log2(minResolution);
        const resolution = Math.pow(2, Math.log2(minResolution) + resolutionRange * detailFactor);
        
        // Round to nearest power of 2
        const roundedResolution = Math.pow(2, Math.round(Math.log2(resolution)));
        
        // Only recreate if resolution changed significantly
        if (Math.abs(roundedResolution - 256) > 16) {
            // Remove old mesh
            this.dispose();
            
            // Reinitialize with new resolution
            this.init();
        }
    }
    
    /**
     * Update the atmosphere properties
     * @param {Object} options - Properties to update
     */
    update(options = {}) {
        if (options.sunPosition) {
            this.atmosphereMaterial.uniforms.sunPosition.value.copy(options.sunPosition);
        }
        
        if (options.dayColor) {
            this.atmosphereMaterial.uniforms.dayColor.value.copy(options.dayColor);
        }
        
        if (options.nightColor) {
            this.atmosphereMaterial.uniforms.nightColor.value.copy(options.nightColor);
        }
    }
    
    /**
     * Set the day or night mode
     * @param {boolean} isDaytime - Whether it's daytime
     */
    setDayNightMode(isDaytime) {
        const sunPosition = isDaytime ? 
            new THREE.Vector3(50, 20, 50) : 
            new THREE.Vector3(-50, -20, -50);
            
        sunPosition.normalize();
        this.atmosphereMaterial.uniforms.sunPosition.value.copy(sunPosition);
    }
    
    /**
     * Get the atmosphere mesh
     * @returns {THREE.Mesh} The atmosphere mesh
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