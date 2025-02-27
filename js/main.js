/**
 * Main application entry point
 * Initializes all planet visualization components and manages the render loop
 */

// Set up global variables
let scene, camera, renderer;
let planet, water, atmosphere, clouds, stars, controls;
let sunLight, ambientLight;
const clock = new THREE.Clock();
const simplex = new SimplexNoise();

// Configuration
const config = {
    planetRadius: 5,
    terrainDetail: 512,
};

// Initialize the application
function init() {
    // Create Three.js scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
    
    // Position camera
    camera.position.z = 15;
    
    // Set up lighting
    setupLighting();
    
    // Create starfield background
    stars = new Stars(scene);
    
    // Create planet and related components
    createPlanetSystem();
    
    // Set up user controls
    setupControls();
    
    // Start animation loop
    animate();
}

/**
 * Set up scene lighting
 */
function setupLighting() {
    // Directional light (sun)
    sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(50, 20, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);
    
    // Ambient light for shadowed areas
    ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
}

/**
 * Create the planet and its related components
 */
function createPlanetSystem() {
    // Create the planet with terrain
    planet = new Planet(scene, {
        simplex: simplex,
        radius: config.planetRadius,
        detail: config.terrainDetail,
        heightScale: parseFloat(document.getElementById('heightScale').value || 2.5),
        waterLevel: parseFloat(document.getElementById('waterLevel').value || 0.1),
        mountainScale: parseFloat(document.getElementById('mountainScale').value || 2.0)
    });
    
    // Create water layer
    water = new Water(scene, {
        simplex: simplex,
        planetRadius: config.planetRadius,
        waterLevel: parseFloat(document.getElementById('waterLevel').value || 0.1)
    });
    
    // Create atmosphere
    atmosphere = new Atmosphere(scene, {
        planetRadius: config.planetRadius,
        sunPosition: sunLight.position.clone().normalize()
    });
    
    // Create clouds
    clouds = new Clouds(scene, {
        simplex: simplex,
        planetRadius: config.planetRadius,
        sunDirection: sunLight.position.clone().normalize()
    });
}

/**
 * Set up user controls
 */
function setupControls() {
    controls = new Controls({
        camera: camera,
        domElement: renderer.domElement,
        renderer: renderer,
        planet: planet,
        clouds: clouds,
        water: water,
        atmosphere: atmosphere,
        sunLight: sunLight,
        ambientLight: ambientLight,
        onRegenerate: regeneratePlanet
    });
}

/**
 * Regenerate the planet system with new parameters
 * @param {Object} options - New planet parameters
 */
function regeneratePlanet(options) {
    // Update noise scale multiplier
    const noiseScaleMultiplier = options.noiseScale || 1.0;
    
    // Regenerate planet with new parameters
    planet.regenerate({
        heightScale: options.heightScale || 2.5,
        baseNoiseScale: 0.8 * noiseScaleMultiplier,
        mountainNoiseScale: 1.6 * noiseScaleMultiplier,
        detailNoiseScale: 6.0 * noiseScaleMultiplier,
        biomeNoiseScale: 0.6 * noiseScaleMultiplier,
        mountainScale: options.mountainScale || 2.0,
        waterLevel: options.waterLevel || 0.1
    });
    
    // Update water level
    water.updateProperties({
        waterLevel: options.waterLevel || 0.1
    });
}

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Update water animation
    water.update(deltaTime);
    
    // Update cloud animation
    clouds.update(deltaTime);
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize the application when the document is loaded
window.addEventListener('DOMContentLoaded', init);

// Clean up resources when window is closed or refreshed
window.addEventListener('beforeunload', () => {
    if (controls) controls.dispose();
    if (planet) planet.dispose();
    if (water) water.dispose();
    if (clouds) clouds.dispose();
    if (atmosphere) atmosphere.dispose();
    if (stars) stars.dispose();
    
    if (renderer) renderer.dispose();
    if (scene) {
        scene.clear();
    }
});