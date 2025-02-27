Testing out Claude 3.7 - Thinking with 16K thinking token limit

Initial Prompt:
### Objective: 
Create a realistic, procedurally generated 3D planet in Three.js that includes detailed terrain, biomes, and atmospheric effects. The planet should be visually appealing and optimized for performance.

### Requirements: 
- 1. Planet Geometry: • Use a spherical geometry (THREE.SphereGeometry) as the base. • Modify the sphere's surface with noise (e.g., Perlin or Simplex) to create realistic terrain features like mountains, valleys, and plains. Use a minecraft caves and cliffs style approach to make realistic terrain.

- 2. Biomes and Textures: • Divide the planet into biomes (e.g., deserts, forests, tundras, oceans) based on elevation and latitude. • Use procedural color mapping to assign textures based on biome (e.g., sandy textures for deserts, green for forests, blue for oceans). • Consider blending textures smoothly between biomes.

- 3. Atmosphere: • Add a semi-transparent atmospheric layer around the planet using THREE.ShaderMaterial. • Implement a gradient color effect for the atmosphere (e.g., blue near the surface fading to black in space). • Add subtle glow effects for realism.

- 4. Lighting: • Use a directional light to simulate the sun, casting realistic shadows across the planet's surface. • Add ambient lighting to ensure details are visible in shadowed regions. • Implement dynamic lighting to simulate day-night cycles as the planet rotates.

- 5. Water: • Include procedural ocean with reflective and slightly transparent materials. • Simulate waves or surface distortion using shaders or displacement maps.

- 6. Clouds: • Add a separate spherical layer above the surface for clouds. • Use procedural noise to generate cloud patterns. • Animate the clouds to move slowly across the planet.

- 7. Rotation: • Make the planet rotate on its axis at a realistic speed. • Allow the user to pause or adjust the rotation speed.

- 8. Camera and Interaction: • Position the camera to give a clear view of the planet. • Allow the user to zoom in and out and rotate the camera around the planet for exploration. • Add the option to reset the camera to the default position.

Use this snippit as a starting point to build a single html file

```javascript
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/simplex-noise/2.4.0/simplex-noise.min.js"></script> 
<script> 
  const scene = new THREE.Scene(); 
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); 
  const renderer = new THREE.WebGLRenderer({ antialias: true }); 
</script>
```
OrbitControls has been deprecated, so don't use that.

Implement a single html file that satisfies all of the above requirements

Implement this in a file called roo-sonnet37-thinking.html
