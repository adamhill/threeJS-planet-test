/**
 * Planet module for terrain generation and visualization
 * Creates a procedurally generated planet with realistic terrain features
 */

class Planet {
    /**
     * Creates a procedurally generated planet
     * @param {THREE.Scene} scene - The scene to add the planet to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.simplex = options.simplex || new SimplexNoise();
        
        // Default configuration with option overrides
        this.config = {
            radius: options.radius || 5,
            detail: options.detail || 256,
            heightScale: options.heightScale || 2.5,
            baseNoiseScale: options.baseNoiseScale || 0.4,
            mountainNoiseScale: options.mountainNoiseScale || 0.8,
            detailNoiseScale: options.detailNoiseScale || 3.0,
            biomeNoiseScale: options.biomeNoiseScale || 0.6,
            waterLevel: options.waterLevel || 0.1, 
            mountainScale: options.mountainScale || 2.0
        };
        
        // CLOD system variables
        this.currentDetailFactor = 1.0;
        this.previousVertices = null;
        this.terrainSeed = 12345; // Fixed seed for consistent terrain
        this.baseTerrainData = null; // Store base terrain data for consistent regeneration
        this.lastResolution = 0;
        this.isMorphing = false;
        
        this.init();
    }
    
    /**
     * Initialize and create the planet
     */
    init() {
        // Create Planet Base Geometry
        const planetGeometry = new THREE.SphereGeometry(
            this.config.radius,
            this.config.detail, 
            this.config.detail
        );
        
        const planetMaterial = new THREE.MeshStandardMaterial({ 
            vertexColors: true, 
            roughness: 0.8, 
            metalness: 0.1,
        });
        
        // Generate terrain data
        this.generateTerrain(planetGeometry);
        
        // Create the mesh and add to the scene
        this.mesh = new THREE.Mesh(planetGeometry, planetMaterial);
        this.scene.add(this.mesh);
        
        // Store base terrain data if not already stored
        if (!this.baseTerrainData) {
            this.storeBaseTerrainData();
        }
    }
    
    /**
     * Store base terrain data for consistent regeneration
     */
    storeBaseTerrainData() {
        console.log("Storing base terrain data for consistent LOD...");
        // Create a high-resolution reference terrain
        const referenceGeometry = new THREE.SphereGeometry(
            this.config.radius,
            512, // Always use highest resolution for reference
            512
        );
        
        const referenceMaterial = new THREE.MeshStandardMaterial({ 
            vertexColors: true, 
            roughness: 0.8, 
            metalness: 0.1,
        });
        
        // Generate terrain data
        this.generateTerrain(referenceGeometry);
        
        // Store the vertex positions and colors
        this.baseTerrainData = {
            positions: Array.from(referenceGeometry.attributes.position.array),
            colors: Array.from(referenceGeometry.attributes.color.array),
            resolution: 512
        };
        
        // Dispose of reference geometry
        referenceGeometry.dispose();
        referenceMaterial.dispose();
    }
    
    /**
     * Generate terrain features and colors for the planet
     * @param {THREE.BufferGeometry} geometry - The planet geometry to modify
     * @returns {THREE.BufferGeometry} The modified geometry
     */
    generateTerrain(geometry) {
        return this.generateTerrainWithSeed(geometry, this.terrainSeed);
    }
    
    /**
     * Generate terrain features and colors with a specific seed
     * @param {THREE.BufferGeometry} geometry - The planet geometry to modify
     * @param {number} seed - Seed for terrain generation
     * @returns {THREE.BufferGeometry} The modified geometry
     */
    generateTerrainWithSeed(geometry, seed) {
        
        const vertices = geometry.attributes.position.array;
        const colors = [];
        
        // Calculate scale values incorporating multipliers
        const baseNoiseScale = this.config.baseNoiseScale;
        const mountainNoiseScale = this.config.mountainNoiseScale;
        const detailNoiseScale = this.config.detailNoiseScale;
        const biomeNoiseScale = this.config.biomeNoiseScale;
        const mountainScaleValue = this.config.mountainScale;
        const heightScale = this.config.heightScale;
        const waterLevel = this.config.waterLevel;
        
        // Apply noise to vertices
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];
            
            // Normalize position for consistent noise sampling
            const distance = Math.sqrt(x * x + y * y + z * z);
            const nx = x / distance;
            const ny = y / distance;
            const nz = z / distance;
            
            // Calculate latitude for biome distribution (0 at equator, 1 at poles)
            const latitude = Math.abs(Math.asin(ny) / (Math.PI / 2));
            
            // Multi-octave noise for varied terrain (Minecraft-inspired approach)
            // Base continent shapes
            const continentNoise = this.simplex.noise3D(nx * 0.4, ny * 0.4, nz * 0.4);
            
            // Medium-scale terrain features
            const mediumNoise = this.simplex.noise3D(nx * baseNoiseScale * 2, ny * baseNoiseScale * 2, nz * baseNoiseScale * 2);
            
            // Large mountains and valleys
            const mountainNoise = this.simplex.noise3D(nx * mountainNoiseScale * 2, ny * mountainNoiseScale * 2, nz * mountainNoiseScale * 2);
            
            // Small details and roughness
            const detailNoise = this.simplex.noise3D(nx * detailNoiseScale * 2, ny * detailNoiseScale * 2, nz * detailNoiseScale * 2);
            
            // Biome variation noise
            const biomeNoise = this.simplex.noise3D(nx * biomeNoiseScale, ny * biomeNoiseScale, nz * biomeNoiseScale) * 0.4;
            
            // Create more pronounced mountain ranges
            let mountainRangeNoise = Math.pow(Math.abs(mountainNoise), 0.8) * mountainScaleValue;
            if (mountainNoise < 0) mountainRangeNoise *= -1;
            
            // Combined multi-octave noise for complex terrain
            // Weight the different noise layers for natural-looking terrain
            const combinedNoise = continentNoise * 0.35 + mediumNoise * 0.2 + mountainRangeNoise * 0.3 + detailNoise * 0.15;
            
            // Apply temperature variation based on latitude
            const temperatureVariation = Math.pow(1 - latitude, 1.2) + biomeNoise * 0.4;
            
            // Apply height variation - significantly increased for more dramatic terrain
            const heightVariation = combinedNoise * heightScale;
            
            // Apply height variation to vertex - increased multiplier for more dramatic effect
            vertices[i] = x * (1 + heightVariation * 0.25);
            vertices[i + 1] = y * (1 + heightVariation * 0.25);
            vertices[i + 2] = z * (1 + heightVariation * 0.25);
            
            // Calculate elevation from center for biome determination
            const newDistance = Math.sqrt(
                vertices[i] * vertices[i] + 
                vertices[i + 1] * vertices[i + 1] + 
                vertices[i + 2] * vertices[i + 2]
            );
            
            const elevationFromCenter = newDistance - this.config.radius;
            
            // Biome color selection based on elevation, latitude, and noise
            let color;
            
            // Different biome types
            if (elevationFromCenter < -0.2) {
                // Deep ocean
                color = new THREE.Color(0x001a33);
            } else if (elevationFromCenter < waterLevel) {
                // Shallow water
                const depthFactor = (waterLevel - elevationFromCenter) / (waterLevel + 0.2);
                color = new THREE.Color(0x0077be).lerp(new THREE.Color(0x00a1d6), 1 - depthFactor);
            } else if (elevationFromCenter < waterLevel + 0.1) {
                // Beach/coast
                color = new THREE.Color(0xdeb887);
            } else if (elevationFromCenter < waterLevel + 0.3) {
                // Low elevation terrain varies by temperature (latitude)
                if (temperatureVariation > 0.7) {
                    // Tropical/warm regions
                    color = new THREE.Color(0x228b22); // Forest green
                } else if (temperatureVariation > 0.4) {
                    // Temperate regions
                    color = new THREE.Color(0x95a167); // Mixed grassland
                } else {
                    // Cold regions
                    color = new THREE.Color(0xa69374); // Tundra
                }
            } else if (elevationFromCenter < waterLevel + 0.7) {
                // Mid elevation terrain
                if (temperatureVariation > 0.6) {
                    color = new THREE.Color(0x156734); // Dense forest
                } else if (temperatureVariation > 0.4) {
                    color = new THREE.Color(0x6a7f3c); // Highland regions
                } else {
                    color = new THREE.Color(0x8e9e82); // Alpine regions
                }
            } else if (elevationFromCenter < waterLevel + 1.0) {
                // High elevation
                if (temperatureVariation > 0.7) {
                    color = new THREE.Color(0x968772); // Rocky mountains in warm regions
                } else {
                    color = new THREE.Color(0xc9c2b6); // Rocky mountain
                }
            } else {
                // Peaks (snowy or rocky based on temperature)
                if (temperatureVariation > 0.8) {
                    color = new THREE.Color(0xa09e8c); // High warm peaks
                } else {
                    color = new THREE.Color(0xf8f8ff); // Snow
                }
            }
            
            // Slight color variation for more natural look
            const variationNoise = this.simplex.noise3D(nx * 20, ny * 20, nz * 20) * 0.05;
            color.r = Math.max(0, Math.min(1, color.r + variationNoise));
            color.g = Math.max(0, Math.min(1, color.g + variationNoise));
            color.b = Math.max(0, Math.min(1, color.b + variationNoise));
            
            colors.push(color.r, color.g, color.b);
        }
        
        // Update geometry and apply colors
        geometry.attributes.position.needsUpdate = true;
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    /**
     * Regenerate the planet with a specific detail factor
     * @param {number} detailFactor - Detail factor between 0.0 and 1.0
     * @returns {THREE.Mesh} The updated planet mesh
     */
    regenerateWithDetailFactor(detailFactor) {
        console.log(`Adjusting detail level to: ${detailFactor.toFixed(2)} (higher = more detail)`);
        // Store current detail factor
        this.currentDetailFactor = detailFactor;
        
        // Calculate resolution based on detail factor (continuous)
        // Map 0.0-1.0 to resolution range (64-512)
        const minResolution = 64;
        const maxResolution = 512;
        
        // Calculate resolution - ensure it's a power of 2 for best results
        const resolutionRange = Math.log2(maxResolution) - Math.log2(minResolution);
        const resolution = Math.pow(2, Math.log2(minResolution) + resolutionRange * detailFactor);
        
        // Round to nearest power of 2
        const roundedResolution = Math.pow(2, Math.round(Math.log2(resolution)));
        
        // Only regenerate if resolution changed significantly
        if (this.lastResolution === roundedResolution) {
            console.log(`Keeping current resolution: ${roundedResolution}x${roundedResolution}`);
            return this.mesh;
        }
        
        this.lastResolution = roundedResolution;
        console.log(`New resolution: ${roundedResolution}x${roundedResolution} vertices`);
        
        // Calculate noise multipliers based on detail factor (continuous)
        const noiseMultiplier = 0.25 + (detailFactor * 0.75);
        
        // If we have base terrain data, use it for consistent regeneration
        console.log(`Base terrain data available: ${this.baseTerrainData !== null}`);
        if (this.baseTerrainData) {
            return this.regenerateFromBaseData(roundedResolution, noiseMultiplier);
        } else {
            // Fallback to regular regeneration
            return this.regenerate({
                detail: roundedResolution,
                baseNoiseScale: this.config.baseNoiseScale * noiseMultiplier,
                mountainNoiseScale: this.config.mountainNoiseScale * noiseMultiplier,
                detailNoiseScale: this.config.detailNoiseScale * noiseMultiplier,
                biomeNoiseScale: this.config.biomeNoiseScale * noiseMultiplier
            });
        }
    }
    
    /**
     * Regenerate planet using base terrain data for consistency
     * @param {number} resolution - Target resolution
     * @param {number} noiseMultiplier - Noise multiplier for detail
     * @returns {THREE.Mesh} The updated planet mesh
     */
    regenerateFromBaseData(resolution, noiseMultiplier) {
        console.log("Regenerating from base terrain data for consistency");
        // Remove old mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        
        // Create new geometry at target resolution
        const newGeometry = new THREE.SphereGeometry(
            this.config.radius,
            resolution,
            resolution
        );
        
        // Sample from base terrain data
        this.sampleFromBaseData(newGeometry, resolution);
        
        // Create new material
        const newMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create new mesh
        this.mesh = new THREE.Mesh(newGeometry, newMaterial);
        this.scene.add(this.mesh);
        
        return this.mesh;
    }
    
    /**
     * Sample vertex positions and colors from base terrain data
     * @param {THREE.BufferGeometry} geometry - Target geometry
     * @param {number} resolution - Target resolution
     */
    sampleFromBaseData(geometry, resolution) {
        if (!this.baseTerrainData) {
            console.error("Base terrain data not available for sampling");
            return;
        }
        
        const basePositions = this.baseTerrainData.positions;
        const baseColors = this.baseTerrainData.colors;
        const baseResolution = this.baseTerrainData.resolution;
        
        const vertices = geometry.attributes.position.array;
        const colors = [];
        
        // For each vertex in the new geometry
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];

            // Find the closest vertex in the base terrain data
            const direction = new THREE.Vector3(x, y, z).normalize();
            
            // Find the corresponding vertex in the base terrain
            let closestIndex = -1;
            let closestDistance = Infinity;
            
            // Sample a subset of base vertices for efficiency (skip some vertices)
            const sampleStep = Math.max(1, Math.floor(baseResolution / resolution));
            
            for (let j = 0; j < basePositions.length; j += 3 * sampleStep) {
                const bx = basePositions[j];
                const by = basePositions[j + 1];
                const bz = basePositions[j + 2];
                
                // Create normalized direction vector
                const baseLength = Math.sqrt(bx * bx + by * by + bz * bz);
                const baseDirection = new THREE.Vector3(bx / baseLength, by / baseLength, bz / baseLength);
                const distance = direction.distanceTo(baseDirection);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = j;
                }
            }
            
            if (closestIndex >= 0) {
                // Get the elevation from the base terrain
                const bx = basePositions[closestIndex];
                const by = basePositions[closestIndex + 1];
                const bz = basePositions[closestIndex + 2];
                
                const baseLength = Math.sqrt(bx * bx + by * by + bz * bz);
                
                // Apply the same elevation to the new vertex
                const elevationFactor = baseLength / this.config.radius;
                vertices[i] = x * elevationFactor;
                vertices[i + 1] = y * elevationFactor;
                vertices[i + 2] = z * elevationFactor;
                
                // Copy the color from the base terrain
                const colorIndex = Math.floor(closestIndex / 3) * 3;
                colors.push(
                    baseColors[colorIndex],
                    baseColors[colorIndex + 1],
                    baseColors[colorIndex + 2]
                );
            } else {
                // Fallback - should never happen
                colors.push(0.5, 0.5, 0.5);
            }
        }
        
        // Update geometry
        geometry.attributes.position.needsUpdate = true;
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
    }
    
    /**
     * Morph between detail levels for smooth transitions
     * @param {number} targetDetailFactor - Target detail factor to morph to
     * @param {number} duration - Duration of the morph in milliseconds
     */
    morphToNewDetail(targetDetailFactor, duration = 500) {
        // Store start time and detail factors
        this.morphStartTime = performance.now();
        this.morphDuration = duration;
        this.morphStartFactor = this.currentDetailFactor;
        this.morphTargetFactor = targetDetailFactor;
        this.isMorphing = true;
        
        // Start morphing animation
        this.updateMorph();
    }
    
    /**
     * Update the morphing animation
     */
    updateMorph() {
        if (!this.isMorphing) return;
        
        const elapsed = performance.now() - this.morphStartTime;
        const progress = Math.min(1.0, elapsed / this.morphDuration);
        
        // Interpolate between detail levels
        const currentFactor = this.morphStartFactor + (this.morphTargetFactor - this.morphStartFactor) * progress;
        this.regenerateWithDetailFactor(currentFactor);
        
        if (progress < 1.0) {
            requestAnimationFrame(() => this.updateMorph());
        } else {
            this.isMorphing = false;
        }
    }
    
    /**
     * Regenerate the planet with new parameters
     * @param {Object} options - New terrain parameters
     */
    regenerate(options = {}) {
        // Update config with new options
        Object.assign(this.config, options);
        
        // Remove old mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        
        // Reinitialize with new config
        this.init();
        
        return this.mesh;
    }
    
    /**
     * Get the planet's mesh
     * @returns {THREE.Mesh} The planet mesh
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Set rotation of the planet
     * @param {THREE.Euler} rotation - Rotation to set
     */
    setRotation(rotation) {
        if (this.mesh) {
            this.mesh.rotation.copy(rotation);
        }
    }
    
    /**
     * Reset planet rotation
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