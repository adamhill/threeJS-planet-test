/**
 * Stars background module for the planet visualization
 * Creates a starfield background surrounding the scene
 */

class Stars {
    /**
     * Creates a starfield background
     * @param {THREE.Scene} scene - The scene to add stars to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Default configuration with option overrides
        this.config = {
            count: options.count || 2000,
            radius: options.radius || 80,
            radiusVariance: options.radiusVariance || 50,
            size: options.size || 0.15
        };
        
        this.init();
    }
    
    /**
     * Initialize and create the starfield
     */
    init() {
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        const starColors = [];
        
        for (let i = 0; i < this.config.count; i++) {
            // Random positions in a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = this.config.radius + Math.random() * this.config.radiusVariance;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            starPositions.push(x, y, z);
            
            // Randomize star colors (white to slightly blue/yellow)
            const colorChoice = Math.random();
            if (colorChoice > 0.9) {
                starColors.push(0.9, 0.9, 1.0); // Blue-ish
            } else if (colorChoice > 0.8) {
                starColors.push(1.0, 0.9, 0.8); // Yellow-ish
            } else {
                starColors.push(1.0, 1.0, 1.0); // White
            }
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: this.config.size,
            vertexColors: true,
            transparent: true,
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }
    
    /**
     * Update method for animation - can be extended for twinkling stars, etc.
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Can be expanded for animations, e.g. slow rotation or twinkling
    }
    
    /**
     * Dispose of resources when no longer needed
     */
    dispose() {
        if (this.stars) {
            this.scene.remove(this.stars);
            this.stars.geometry.dispose();
            this.stars.material.dispose();
        }
    }
}