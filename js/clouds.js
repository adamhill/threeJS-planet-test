/**
 * Clouds module for the planet visualization
 * Creates a cloud layer with dynamic patterns
 */

class Clouds {
    /**
     * Creates a cloud layer for the planet
     * @param {THREE.Scene} scene - The scene to add the clouds to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.simplex = options.simplex || new SimplexNoise();
        
        // Default configuration with option overrides
        this.config = {
            planetRadius: options.planetRadius || 5,
            cloudHeight: options.cloudHeight || 0.6,
            cloudColor: options.cloudColor || new THREE.Color(0xffffff),
            sunDirection: options.sunDirection || new THREE.Vector3(1, 0.5, 1).normalize(),
            scale: options.scale || 1.0,
            threshold: options.threshold || 0.1,
            resolution: options.resolution || 256
        };
        
        this.time = 0;
        this.rotationSpeed = options.rotationSpeed || 0.02;
        this.init();
    }
    
    /**
     * Initialize and create the cloud layer
     */
    init() {
        const cloudRadius = this.config.planetRadius + this.config.cloudHeight;
        const cloudGeometry = new THREE.SphereGeometry(
            cloudRadius,
            this.config.resolution,
            this.config.resolution
        );
        
        // Generate dynamic cloud patterns
        const cloudVertices = cloudGeometry.attributes.position.array;
        const cloudOpacity = [];
        
        for (let i = 0; i < cloudVertices.length; i += 3) {
            const x = cloudVertices[i];
            const y = cloudVertices[i + 1];
            const z = cloudVertices[i + 2];
            
            const distance = Math.sqrt(x * x + y * y + z * z);
            const nx = x / distance;
            const ny = y / distance;
            const nz = z / distance;
            
            // Generate cloud patterns with multiple noise layers
            const cloudBaseNoise = this.simplex.noise3D(
                nx * this.config.scale, 
                ny * this.config.scale, 
                nz * this.config.scale
            );
            
            const cloudDetailNoise = this.simplex.noise3D(
                nx * this.config.scale * 6, 
                ny * this.config.scale * 6, 
                nz * this.config.scale * 6
            ) * 0.3;
            
            let cloudPattern = cloudBaseNoise + cloudDetailNoise;
            
            // Latitude-based cloud distribution (more near equator, less at poles)
            const latitude = Math.asin(ny / distance) / (Math.PI / 2);
            const latitudeInfluence = 1.0 - Math.pow(Math.abs(latitude), 1.5) * 0.8;
            
            // Apply cloud elevation variation
            cloudVertices[i] += nx * cloudPattern * 0.05;
            cloudVertices[i + 1] += ny * cloudPattern * 0.05;
            cloudVertices[i + 2] += nz * cloudPattern * 0.05;
            
            // Calculate cloud opacity based on noise and latitude
            let opacity = (cloudPattern > this.config.threshold) ? 
                        Math.min(1.0, (cloudPattern - this.config.threshold) * 2.5) * latitudeInfluence : 
                        0.0;
            
            // Push opacity for each vertex
            cloudOpacity.push(opacity, opacity, opacity);
        }
        
        cloudGeometry.attributes.position.needsUpdate = true;
        cloudGeometry.setAttribute('opacity', new THREE.Float32BufferAttribute(cloudOpacity, 3));
        cloudGeometry.computeVertexNormals();
        
        this.cloudMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                cloudColor: { value: this.config.cloudColor },
                sunDirection: { value: this.config.sunDirection },
            },
            vertexShader: CloudShaders.vertexShader,
            fragmentShader: CloudShaders.fragmentShader,
            transparent: true,
            depthWrite: false,
        });
        
        this.mesh = new THREE.Mesh(cloudGeometry, this.cloudMaterial);
        this.scene.add(this.mesh);
    }
    
    /**
     * Update the clouds animation
     * @param {number} deltaTime - Time since last update 
     */
    update(deltaTime) {
        this.time += deltaTime;
        
        if (this.cloudMaterial && this.cloudMaterial.uniforms) {
            this.cloudMaterial.uniforms.time.value = this.time;
        }
        
        if (this.mesh) {
            this.mesh.rotation.y += deltaTime * this.rotationSpeed;
        }
    }
    
    /**
     * Regenerate clouds with new parameters
     * @param {Object} options - New cloud parameters
     */
    regenerate(options = {}) {
        // Update config with new options
        Object.assign(this.config, options);
        
        // Dispose of old resources
        this.dispose();
        
        // Initialize with new config
        this.init();
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
        
        if (this.cloudMaterial && this.cloudMaterial.uniforms) {
            this.cloudMaterial.uniforms.sunDirection.value.copy(sunDirection);
        }
    }
    
    /**
     * Get the clouds mesh
     * @returns {THREE.Mesh} The clouds mesh
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Set rotation of the cloud layer
     * @param {THREE.Euler} rotation - Rotation to set
     */
    setRotation(rotation) {
        if (this.mesh) {
            this.mesh.rotation.copy(rotation);
        }
    }
    
    /**
     * Reset the cloud rotation
     */
    resetRotation() {
        if (this.mesh) {
            this.mesh.rotation.set(0, 0, 0);
        }
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