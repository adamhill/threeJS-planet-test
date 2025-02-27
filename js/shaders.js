/**
 * This file contains all shader code used in the planet visualization.
 * Centralizing shaders here makes them easier to edit and maintain.
 */

// Water shader
const WaterShaders = {
    vertexShader: `
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
            // Apply gentle wave motion
            vec3 newPosition = position;
            
            // Calculate wave effect based on position and time
            float waveX = sin(position.x * 2.0 + time * 0.5) * 0.01;
            float waveZ = cos(position.z * 2.0 + time * 0.7) * 0.01;
            
            // Apply waves to y coordinate
            newPosition.y += waveX + waveZ;
            
            // Pass values to fragment shader
            vPosition = newPosition;
            vNormal = normalize(normalMatrix * normal);
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 waterColor;
        uniform vec3 deepWaterColor;
        uniform vec3 sunDirection;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
            // Fresnel effect for water edge transparency
            vec3 viewDirection = normalize(cameraPosition - vPosition);
            float fresnel = 0.5 + 0.5 * pow(1.0 - dot(viewDirection, vNormal), 3.0);
            
            // Add specular highlight for sun reflection
            vec3 halfDir = normalize(sunDirection + viewDirection);
            float specular = pow(max(dot(halfDir, vNormal), 0.0), 100.0) * 0.5;
            
            // Mix shallow and deep water colors
            vec3 finalColor = mix(waterColor, deepWaterColor, fresnel * 0.7);
            finalColor += specular * vec3(1.0, 1.0, 1.0);
            
            gl_FragColor = vec4(finalColor, 0.7); // Semi-transparent water
        }
    `
};

// Atmosphere shader
const AtmosphereShaders = {
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 sunPosition;
        uniform float planetRadius;
        uniform float atmosphereRadius;
        uniform vec3 dayColor;
        uniform vec3 nightColor;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            // Direction from fragment to camera
            vec3 viewDirection = normalize(cameraPosition - vPosition);
            
            // Direction from fragment to sun
            float sunInfluence = max(dot(vNormal, sunPosition), 0.0);
            
            // Atmospheric scattering effect (limb darkening)
            float atmosphereIntensity = pow(1.0 - abs(dot(viewDirection, vNormal)), 5.0);
            
            // Mix day and night colors based on sun position
            vec3 atmosphereColor = mix(nightColor, dayColor, sunInfluence);
            
            // Apply atmospheric scattering
            float alpha = atmosphereIntensity * 0.6;
            
            gl_FragColor = vec4(atmosphereColor, alpha);
        }
    `
};

// Cloud shader
const CloudShaders = {
    vertexShader: `
        attribute vec3 opacity;
        uniform float time;
        
        varying vec3 vNormal;
        varying float vOpacity;
        
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vOpacity = opacity.x; // Use x component for opacity
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 cloudColor;
        uniform vec3 sunDirection;
        
        varying vec3 vNormal;
        varying float vOpacity;
        
        void main() {
            // Add brighter highlights on sunlit side
            float sunlight = max(dot(vNormal, sunDirection), 0.0);
            vec3 litCloudColor = mix(cloudColor * 0.8, cloudColor * 1.2, sunlight);
            
            // Apply opacity based on vertex opacity attribute
            gl_FragColor = vec4(litCloudColor, vOpacity * 0.8);
        }
    `
};