# Dynamic Terrain Detail Based on Zoom Level - Implementation Plan

## Current Application Analysis

The 3D planet visualization application currently has these interactive elements:

1. **Camera Controls**:
   - Zoom in/out with mouse wheel
   - Rotate view by dragging
   - Reset camera position with button
   - Adjust rotation speed with arrow keys
   - Pause/resume rotation with spacebar

2. **Terrain Controls**:
   - Terrain Height slider (affects elevation magnitude)
   - Terrain Detail slider (affects noise scale)
   - Mountain Scale slider (affects mountain prominence)
   - Water Level slider (adjusts ocean height)
   - Regenerate Planet button (recreates planet with current settings)

3. **Visual Controls**:
   - Toggle Day/Night button (changes lighting)

## Performance Considerations

The current implementation has these performance characteristics:

1. **Geometry Resolution**:
   - Planet: 512×512 vertices (recently doubled from 256×256)
   - Atmosphere, water, clouds: 256×256 vertices
   - This is already quite high-resolution and may impact performance on some systems

2. **Shader Complexity**:
   - Multiple shader materials for planet, water, atmosphere, and clouds
   - Relatively simple fragment shaders without expensive operations

3. **Scene Complexity**:
   - ~5 major objects (planet, water, atmosphere, clouds, stars)
   - No complex physics simulations

4. **Current Performance Bottlenecks**:
   - The main bottleneck is likely the planet geometry regeneration when parameters change
   - Each regeneration requires recalculating noise for all vertices and rebuilding the mesh

## Feasibility Assessment

Implementing dynamic terrain detail based on zoom level is feasible with the current structure, but requires careful design to maintain performance. The main challenge is balancing visual quality with performance, especially during transitions between detail levels.

## Recommended Approach: Continuous Level of Detail (CLOD) System

I recommend implementing a hybrid LOD (Level of Detail) system that changes the planet's detail level based on camera distance:

### 1. Define Detail Levels

Create 3-4 detail levels with decreasing geometry resolution and noise complexity:

| Level | Distance Range | Geometry Resolution | Noise Detail |
|-------|---------------|---------------------|--------------|
| High  | 5-10 units    | 512×512             | 100%         |
| Medium| 10-15 units   | 256×256             | 75%          |
| Low   | 15-20 units   | 128×128             | 50%          |
| Far   | 20+ units     | 64×64               | 25%          |

### Continuous LOD Enhancement

To eliminate popping artifacts when transitioning between detail levels, we'll implement a continuous LOD approach:

1. **Vertex Morphing**: Instead of abruptly switching between detail levels, we'll interpolate vertex positions between the current and target detail levels based on camera distance.

2. **Adaptive Detail Factor**: Replace discrete detail levels with a continuous detail factor (0.0-1.0) based on camera distance.

3. **Smooth Transitions**: Implement a gradual transition system that blends between detail levels over time.

### 2. Camera Distance Tracking

Add a distance tracking mechanism to the Controls class:

```javascript
// In Controls class
trackCameraDistance() {
    const distance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    const detailFactor = this.getDetailFactorForDistance(distance);
    
    // Only update if detail factor changed significantly (avoid constant small updates)
    if (Math.abs(detailFactor - this.lastDetailFactor) > 0.05) {
        this.lastDetailFactor = detailFactor;
        this.updatePlanetDetail(detailFactor);
    }
}

getDetailFactorForDistance(distance) {
    // Map distance to a detail factor between 0.0 (far) and 1.0 (close)
    const minDistance = 5;  // Full detail at this distance
    const maxDistance = 25; // Minimum detail at this distance
    
    // Clamp and invert the normalized distance to get detail factor
    return 1.0 - Math.min(1.0, Math.max(0.0, (distance - minDistance) / (maxDistance - minDistance)));
}
```

### 3. Optimized Planet Regeneration

Modify the Planet class to support different detail levels:

```javascript
// In Planet class
regenerateWithDetailFactor(detailFactor) {
    // Calculate resolution based on detail factor (continuous)
    // Map 0.0-1.0 to resolution range (64-512)
    const minResolution = 64;
    const maxResolution = 512;
    
    // Calculate resolution - ensure it's a power of 2 for best results
    const resolutionRange = Math.log2(maxResolution) - Math.log2(minResolution);
    const resolution = Math.pow(2, Math.log2(minResolution) + resolutionRange * detailFactor);
    
    // Round to nearest power of 2
    const roundedResolution = Math.pow(2, Math.round(Math.log2(resolution)));
    
    // Calculate noise multipliers based on detail factor (continuous)
    const noiseMultiplier = 0.25 + (detailFactor * 0.75);
    
    // Store current vertices for morphing if needed
    if (this.mesh) {
        this.previousVertices = [...this.mesh.geometry.attributes.position.array];
    }
    
    // Regenerate with appropriate detail
    this.regenerate({
        detail: roundedResolution,
        baseNoiseScale: this.config.baseNoiseScale * noiseMultiplier,
        mountainNoiseScale: this.config.mountainNoiseScale * noiseMultiplier,
        detailNoiseScale: this.config.detailNoiseScale * noiseMultiplier
    });
}
```

### 4. Loading Indicator

Add a simple loading indicator during regeneration:

```javascript
// In main.js or Controls class
function updatePlanetDetail(detailFactor) {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.textContent = 'Updating terrain...';
    document.body.appendChild(loadingIndicator);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
        planet.regenerateWithDetailLevel(detailLevel);
        
        // Also update related components
        water.updateResolution(detailLevel);
        clouds.updateResolution(detailLevel);
        atmosphere.updateResolution(detailLevel);
        
        // Remove loading indicator
        document.body.removeChild(loadingIndicator);
    }, 10);
}
```

### 5. Vertex Morphing for Smooth Transitions

Add a morphing system to smoothly transition between detail levels:

```javascript
// In Planet class
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

updateMorph() {
    if (!this.isMorphing) return;
    
    const elapsed = performance.now() - this.morphStartTime;
    const progress = Math.min(1.0, elapsed / this.morphDuration);
    
    // Interpolate between detail levels
    const currentFactor = this.morphStartFactor + (this.morphTargetFactor - this.morphStartFactor) * progress;
    this.updateGeometryDetail(currentFactor);
    
    if (progress < 1.0) {
        requestAnimationFrame(() => this.updateMorph());
    } else {
        this.isMorphing = false;
    }
}
```

### 5. Throttling and Debouncing

Implement throttling to prevent too frequent regeneration:

```javascript
// In Controls class
constructor() {
    // ...existing code...
    this.detailUpdateThrottled = this.throttle(this.updatePlanetDetail, 500);
}

throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
```

### 6. CSS for Loading Indicator

Add CSS for the loading indicator:

```css
#loading-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    z-index: 100;
}
```

## Implementation Steps

1. Add continuous distance tracking to the Controls class
2. Implement detail factor calculation based on distance
3. Modify Planet class to support continuous detail levels
4. Implement vertex morphing system for smooth transitions
5. Update Water, Clouds, and Atmosphere classes to support variable resolution
6. Add loading indicator and CSS
7. Implement throttling to prevent performance spikes
8. Add caching for different detail levels
7. Test and optimize performance

## Performance Optimization Tips

1. **Caching**: Cache generated geometries for each detail level to avoid regeneration
2. **Asynchronous Generation**: Use Web Workers for planet generation to prevent UI freezing
3. **Progressive Loading**: Show low-detail version first, then upgrade to higher detail
4. **Frustum Culling**: Only render what's visible in the camera's view
5. **Adaptive Subdivision**: Only increase detail in areas facing the camera
5. **Shader Optimization**: Simplify shaders at lower detail levels

## Expected Results

With this implementation, users should experience:
- Smooth performance at all zoom levels
- Higher detail when examining specific areas of the planet
- Lower detail when viewing the entire planet from a distance
- Minimal stuttering during detail transitions
- Acceptable memory usage

## Potential Challenges

1. **Memory Management**: Multiple detail levels could increase memory usage
2. **Transition Artifacts**: Visible "popping" when switching detail levels
3. **Biome Consistency**: Ensuring biome boundaries remain consistent across detail levels
4. **Performance on Lower-End Devices**: May need additional optimizations

## Alternative Approaches

If performance is still an issue, consider:

1. **GPU Tessellation**: Use WebGL2 tessellation for dynamic detail (more complex but most efficient)
2. **Chunked Planet**: Divide planet into chunks with independent detail levels
3. **Simplified Far View**: Use impostor/billboard techniques for distant views

This plan provides a balanced approach that should work well on most modern computers while providing the requested dynamic detail based on zoom level.