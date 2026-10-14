// Extracted from the user sapphire_gold_planet.html; see vendor/user-sapphire-planet/provenance.json.
// Original palette/nebula/ring design retained; r161 and spatial continuity adaptations below.

export const SimplexNoiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractional Brownian Motion (4 octaves) for flowing nebula
float fbm(vec3 p) {
    float total = 0.0;
    float amp = 0.52;
    float freq = 1.0;
    for(int i = 0; i < 4; i++) {
        total += amp * snoise(p * freq);
        freq *= 2.05;
        amp *= 0.48;
    }
    return total;
}
        `;

export const PlanetVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vModelPosition;
varying vec3 vViewDir;

void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vModelPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
        `;

export const PlanetFragmentShader = `
uniform float uTime;
uniform vec3 uLightDir;
uniform vec3 uDeepBlue;
uniform vec3 uSapphireBlue;
uniform vec3 uLightBlue;
uniform vec3 uGoldCore;
uniform vec3 uGoldEdge;
uniform vec3 uFresnelColor;
uniform float uFlowSpeed;
uniform float uSparkleIntensity;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vModelPosition;
varying vec3 vViewDir;

${SimplexNoiseGLSL}

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(vViewDir);

    // Model space coordinates for seamless spherical continuity
    vec3 p = normalize(vModelPosition);

    // --- 1. Helical Coordinates for Organic Golden Filaments ---
    float phi = asin(clamp(p.y, -1.0, 1.0));
    float theta = atan(p.z, p.x);
    float t = uTime * 0.045 * uFlowSpeed;

    vec3 warpCoord1 = p * 1.8 + vec3(sin(t * 0.35), cos(t * 0.4), t * 0.25);
    float distortion1 = fbm(warpCoord1);

    vec3 warpCoord2 = p * 3.0 + vec3(distortion1 * 1.3, t * 0.45, distortion1 * 0.7);
    float distortion2 = fbm(warpCoord2);

    float spiralCurvature = phi * 2.6 + theta * 2.0 + distortion2 * 2.2;
    float stream1 = smoothstep(0.44, 0.84, sin(spiralCurvature) * 0.5 + 0.5 + distortion1 * 0.32);
    float stream2 = smoothstep(0.52, 0.92, sin(phi * 3.51 + theta * 3.0 + distortion2 * 2.97 + 2.3) * 0.5 + 0.5 + distortion2 * 0.28);

    // Confine golden filaments to tropical/temperate zones; poles remain peaceful deep sapphire
    float bandMask = (1.0 - smoothstep(0.32, 0.90, abs(p.y))) * smoothstep(-0.95, -0.2, p.y + distortion1 * 0.25);
    float goldDensity = max(stream1 * 0.92, stream2 * 0.78) * bandMask;

    // --- 2. Matte Velvet Sheen & Atmospheric Subsurface (No Harsh Specular) ---
    // Replace harsh Blinn-Phong hot-spot with a soft anisotropic velvet sheen
    vec3 H = normalize(L + V);
    float NdotH = max(0.0, dot(N, H));
    float NdotL = dot(N, L);
    float NdotV = max(0.0, dot(N, V));

    // Silky planetary sheen: grazing backlight effect rather than glossy plastic reflection
    float velvetSheen = pow(1.0 - NdotV, 2.5) * pow(max(0.0, NdotL), 0.8) * 0.28;
    // Subdued micro-sheen on gold filaments only
    float softGoldGloss = pow(NdotH, 14.0) * 0.16 * goldDensity;

    // Restrained microscopic diamond dust shimmer (subtle twinkle, no HDR blown-out sparks)
    float microNoise = snoise(p * 95.0 + vec3(uTime * 0.03));
    float sparkle = pow(clamp(microNoise, 0.0, 1.0), 6.0) * 0.4 * uSparkleIntensity;

    // --- 3. Deep Sapphire Base Surface ---
    // Wrapped diffuse light creates smooth, natural terminator without plastic sharpness or dead black
    float wrapDiff = clamp((NdotL + 0.35) / 1.35, 0.0, 1.0);
    float diffFactor = smoothstep(0.0, 1.0, wrapDiff);

    // Deep ambient back-illumination keeping the dark hemisphere luminous and mystic
    float nightRim = pow(1.0 - NdotV, 2.6) * max(0.0, -NdotL) * 0.42;
    vec3 baseDeep = mix(uDeepBlue, uSapphireBlue * 0.95, nightRim);
    vec3 baseLit = mix(uSapphireBlue * 0.9, uLightBlue * 0.85, pow(max(0.0, NdotL), 1.6) * 0.35);
    
    vec3 planetBaseColor = mix(baseDeep, baseLit, diffFactor);
    // Subtle convection current depth beneath the atmosphere
    float deepOceanVariation = fbm(p * 4.2) * 0.08;
    planetBaseColor += uLightBlue * deepOceanVariation * diffFactor;

    // --- 4. Golden Nebula Color Synthesis (Velvet Liquid Gold) ---
    vec3 goldColor = mix(uGoldEdge, uGoldCore, smoothstep(0.48, 0.90, goldDensity));
    // Add gentle velvet radiance (soft and matte)
    goldColor += uGoldCore * (velvetSheen + softGoldGloss) * diffFactor;
    // Add delicate micro-crystalline twinkle
    goldColor += vec3(1.0, 0.95, 0.82) * sparkle * goldDensity * (0.3 + 0.7 * diffFactor);

    // Phosphorescent emission in the planetary nightside
    float nightGlow = (1.0 - diffFactor) * 0.32;
    vec3 nebulaRendered = goldColor * (diffFactor + nightGlow);

    // Blend base ocean with gold nebula
    vec3 finalSurface = mix(planetBaseColor, nebulaRendered, smoothstep(0.20, 0.74, goldDensity));

    // --- 5. Atmospheric Rim Fresnel ---
    float fresnel = 1.0 - NdotV;
    float fresnelTerm = pow(fresnel, 4.2);
    
    // Muted ultramarine halo, preventing blinding over-exposure
    vec3 dynamicFresnel = mix(uDeepBlue * 1.4, uFresnelColor * 0.85, clamp(NdotL * 0.6 + 0.4, 0.0, 1.0));
    
    // Microscopic golden dust catching light along the rim
    float goldRimDust = pow(fresnel, 6.0) * goldDensity * 0.75;
    dynamicFresnel = mix(dynamicFresnel, uGoldCore, goldRimDust);

    vec3 finalColor = finalSurface + dynamicFresnel * (fresnelTerm * 0.95);

    gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
        `;

export const AtmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;

void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
        `;

export const AtmosphereFragmentShader = `
uniform vec3 uLightDir;
uniform vec3 uAtmosphereColor;
uniform vec3 uSunHaloColor;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uLightDir);

    // Inverted fresnel for soft back-scattering shell
    float rim = 1.0 - abs(dot(N, V));
    float alpha = pow(rim, 4.2);

    // Enhance atmosphere brightness on the day-side terminator
    float lightAlignment = max(0.0, dot(N, L));
    vec3 color = mix(uAtmosphereColor, uSunHaloColor, pow(lightAlignment, 2.0) * 0.5);

    gl_FragColor = vec4(color, alpha * 0.85);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
        `;

export const RingVertexShader = `
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vNormal;

void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vLocalPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
        `;

export const RingFragmentShader = `
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uPlanetRadius;
uniform vec3 uPlanetCenter;
uniform vec3 uLightDir;
uniform vec3 uRingColorCore;
uniform vec3 uRingColorEdge;
uniform vec3 uRingColorIndigo;
uniform float uTime;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vNormal;

${SimplexNoiseGLSL}

void main() {
    // Correct radial distance in the ring plane (XZ coordinates)
    float dist = length(vLocalPosition.xz);
    if (dist < uInnerRadius || dist > uOuterRadius) {
        discard;
    }

    // Normalized radius [0.0 = inner edge, 1.0 = outer edge]
    float u = (dist - uInnerRadius) / (uOuterRadius - uInnerRadius);
    float angle = atan(vLocalPosition.z, vLocalPosition.x);

    // --- 1. Multi-Tier Ring Structure (Saturn-Class Scientific Hierarchy) ---
    // C-Ring (Inner gossamer veil, u in [0.0, 0.22]): ethereal, translucent, whispering
    float cRingMask = smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.18, 0.24, u));
    
    // B-Ring (Dense Royal Core, u in [0.22, 0.64]): highest opacity, rich golden stardust
    float bRingMask = smoothstep(0.20, 0.26, u) * (1.0 - smoothstep(0.62, 0.66, u));
    
    // Cassini Division (Major Resonant Gap, u in [0.63, 0.69]): distinct gap with faint micro-filaments
    float cassiniGap = smoothstep(0.005, 0.035, abs(u - 0.655));

    // A-Ring (Outer Stardust Sheaf, u in [0.67, 0.94]): luminous, fine texture
    float aRingMask = smoothstep(0.66, 0.70, u) * (1.0 - smoothstep(0.90, 0.96, u));
    
    // Encke Gap (Narrow outer gap inside A-Ring at u ≈ 0.85)
    float enckeGap = smoothstep(0.003, 0.012, abs(u - 0.845));

    // F-Ring & Outer Gossamer Envelope (u in [0.94, 1.0]): soft celestial feathering
    float outerFeather = (1.0 - smoothstep(0.92, 1.0, u));
    float innerFeather = smoothstep(0.0, 0.06, u);

    // --- 2. High-Frequency Harmonic Ringlets & Micro-Grooves ---
    // Multiscale resonant oscillations mimicking millions of gravitational orbital ripples
    float r1 = 0.5 + 0.5 * sin(u * 580.0) * (1.0 - smoothstep(1.0, 3.0, fwidth(u) * 580.0));
    float r2 = 0.5 + 0.5 * sin(u * 260.0 + 1.2) * (1.0 - smoothstep(1.0, 3.0, fwidth(u) * 260.0));
    float r3 = 0.5 + 0.5 * sin(u * 96.0 - 0.6) * (1.0 - smoothstep(1.0, 3.0, fwidth(u) * 96.0));
    float r4 = 0.5 + 0.5 * sin(u * 42.0 + 2.0) * (1.0 - smoothstep(1.0, 3.0, fwidth(u) * 42.0));
    float microGrooves = r1 * 0.28 + r2 * 0.32 + r3 * 0.24 + r4 * 0.16;

    // Subtle orbital stardust density fluctuations along azimuth
    float dustNoise = snoise(vec3(cos(angle) * 10.0, sin(angle) * 10.0, u * 24.0 + uTime * 0.004)) * 0.12 + 0.88;

    // Synthesize macroscopic density
    float baseDensity = (cRingMask * 0.28 + bRingMask * 0.88 + aRingMask * 0.55) * cassiniGap * enckeGap;
    float density = baseDensity * (0.65 + 0.35 * microGrooves) * dustNoise * innerFeather * outerFeather;

    if (density < 0.01) {
        discard;
    }

    // --- 3. Planetary Shadow with Atmospheric Twilight Penumbra ---
    vec3 P = vWorldPosition;
    vec3 C = uPlanetCenter;
    vec3 L = normalize(uLightDir);
    vec3 V_PC = C - P;
    
    float proj = dot(V_PC, L);
    float shadow = 1.0;
    float penumbraFactor = 1.0;

    // Planet is between star and ring fragment
    if (proj > 0.0) {
        float distSqToRay = dot(V_PC, V_PC) - proj * proj;
        float planetRSq = uPlanetRadius * uPlanetRadius;
        // Atmospheric haze radius casting soft penumbral shadow
        float atmosRSq = (uPlanetRadius * 1.06) * (uPlanetRadius * 1.06);

        // Soft eclipse penumbra
        shadow = smoothstep(planetRSq, atmosRSq, distSqToRay);
        penumbraFactor = smoothstep(planetRSq * 0.95, atmosRSq * 1.05, distSqToRay);
    }

    // --- 4. Optical Phase Function & Backlit Mie Scattering ---
    vec3 camDir = normalize(cameraPosition - vWorldPosition);
    // When looking towards the illuminating star through the dust ring, fine particles exhibit intense forward scattering
    float cosAngle = dot(camDir, -L);
    float forwardScatter = pow(max(0.0, cosAngle), 4.0) * 1.6;
    float backScatter = pow(max(0.0, dot(camDir, L)), 2.5) * 0.35;
    float phaseGlow = 0.55 + forwardScatter + backScatter;

    // Dual-side lighting
    float ringFacing = max(0.25, abs(dot(normalize(vNormal), L)));

    // --- 5. Color Palettes Across Ring Spectrum ---
    // Inner veil: subtle indigo-bronze; Core: luminous royal gold; Outer: pale stardust aurum
    vec3 colorInner = mix(uRingColorIndigo, uRingColorEdge, smoothstep(0.0, 0.25, u));
    vec3 colorCore = mix(uRingColorEdge, uRingColorCore, microGrooves);
    vec3 ringColor = mix(colorInner, colorCore, smoothstep(0.15, 0.45, u));

    // Apply optical scattering
    ringColor *= (ringFacing * phaseGlow);

    // Planet shadow dims ring; penumbra boundary receives sapphire dusk refraction
    vec3 shadowColor = mix(vec3(0.03, 0.07, 0.16), vec3(1.0), shadow);
    ringColor *= shadowColor;

    // Alpha blending with density and shadow
    float alpha = clamp(density * mix(0.25, 0.85, shadow), 0.0, 0.82);

    gl_FragColor = vec4(ringColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
        `;
