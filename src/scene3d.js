import * as THREE from 'three';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer;
let bloomPass; 
let particleSystems = []; 
let basePositions = []; 
let spherePositions = []; 
let time = 0;

let targetOffsetX = 0;
let targetOffsetY = 0;
let currentOffsetX = 0;
let currentOffsetY = 0;

let mode = 'scatter'; 
let textPositions = [];
let heartPositions = [];
let currentTextString = "";

// Scale tracking variables
let baseFistZ = 0;
let targetScale = 1;
let currentScale = 1;

// Heart beat variables
let heartBeatPhase = 0;
let isBeating = false;
let beatStrength = 0;
let burstParticles = [];
let burstSystems = [];
let heartbeatTimer = 0;

export function initScene(container) {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 80;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const renderScene = new RenderPass(scene, camera);
  
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.5, 1.2, 0.1);
  bloomPass.threshold = 0.1;
  bloomPass.strength = 2.5;
  bloomPass.radius = 1.2;

  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  const textureLoader = new THREE.TextureLoader();

  const textures = [
  textureLoader.load('/Chin/glow.png'),
  textureLoader.load('/Chin/glow2.png'),
  textureLoader.load('/Chin/glow3.png'),
  textureLoader.load('/Chin/glow4.png')
  ];

  const totalParticles = 5000;
  const particlesPerTexture = Math.floor(totalParticles / textures.length);

  textures.forEach((texture) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesPerTexture * 3);
    const colors = new Float32Array(particlesPerTexture * 3);

    for (let i = 0; i < particlesPerTexture; i++) {
      const x = (Math.random() - 0.5) * 800;
      const y = (Math.random() - 0.5) * 800;
      const z = (Math.random() - 0.5) * 800;
      
      basePositions.push(x, y, z);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const radius = 25;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * radius;

      const sx = r * Math.sin(phi) * Math.cos(theta);
      const sy = r * Math.sin(phi) * Math.sin(theta);
      const sz = r * Math.cos(phi);
      
      spherePositions.push(sx, sy, sz);

      const brightness = 0.1 + Math.random() * 0.9;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({ 
      size: 2,
      map: texture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
    
    const particleMesh = new THREE.Points(geometry, material);
    particleSystems.push(particleMesh);
    scene.add(particleMesh);
  });

  createBurstSystem();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

function createBurstSystem() {
  const burstCount = 300;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(burstCount * 3);
  const colors = new Float32Array(burstCount * 3);
  const sizes = new Float32Array(burstCount);

  for (let i = 0; i < burstCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = -17.5; //fixing the center of the heart 
    positions[i * 3 + 2] = 0;
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 0;
    colors[i * 3 + 2] = 0;
    sizes[i] = 0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const textureLoader = new THREE.TextureLoader();
  const glowTexture = textureLoader.load('/Chin/glow.png');

  const material = new THREE.PointsMaterial({
    size: 2,
    map: glowTexture,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
    sizeAttenuation: true
  });

  const burstMesh = new THREE.Points(geometry, material);
  burstMesh.visible = false;
  scene.add(burstMesh);
  burstSystems.push(burstMesh);

  for (let i = 0; i < burstCount; i++) {
    burstParticles.push({
      active: false,
      life: 0,
      maxLife: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      startX: 0,
      startY: 0,
      startZ: 0
    });
  }
}

function generateTextVertices(text, isHeart = false) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  canvas.width = 400;
  canvas.height = 400;
  
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (isHeart) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;
    const scale = 3.5;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30 * scale);
    ctx.bezierCurveTo(cx - 50 * scale, cy - 70 * scale, cx - 100 * scale, cy - 20 * scale, cx, cy + 30 * scale);
    ctx.bezierCurveTo(cx + 100 * scale, cy - 20 * scale, cx + 50 * scale, cy - 70 * scale, cx, cy - 30 * scale);
    ctx.fill();
  } else {
    ctx.font = 'bold 80px Arial';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const validPixels = [];
  
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const index = (y * canvas.width + x) * 4;
      const alpha = imageData[index + 3];
      
      if (alpha > 128) {
        const posX = x - canvas.width / 2;
        const posY = -(y - canvas.height / 2);
        validPixels.push(new THREE.Vector3(posX * 0.35, posY * 0.35, 0));
      }
    }
  }

  const result = [];
  const totalParticles = 5000;
  
  if (validPixels.length === 0) return result;

  for (let i = 0; i < totalParticles; i++) {
    const randomPixel = validPixels[Math.floor(Math.random() * validPixels.length)];
    const jitterX = (Math.random() - 0.5) * 1.5;
    const jitterY = (Math.random() - 0.5) * 1.5;
    
    result.push(new THREE.Vector3(
      randomPixel.x + jitterX,
      randomPixel.y + jitterY,
      0
    ));
  }
  
  return result;
}

function generateCombinedILoveYou() {
  const textCanvas = document.createElement('canvas');
  const textCtx = textCanvas.getContext('2d', { willReadFrequently: true });
  textCanvas.width = 800;
  textCanvas.height = 400; // The true center is Y = 200
  
  textCtx.fillStyle = 'white';
  textCtx.font = 'bold 65px Arial';
  textCtx.textAlign = 'center';
  textCtx.textBaseline = 'middle';
  
  // Place text cleanly above the center line
  textCtx.fillText("I LOVE YOU", textCanvas.width / 2, 130);
  
  // Place heart cleanly underneath the center line, point facing down
  const cx = textCanvas.width / 2;
  const cy = 250; 
  const scale = 1.2;
    
  textCtx.beginPath();
  // Fixed right-side-up heart
  textCtx.moveTo(cx, cy - 30 * scale); // Top cleft
  textCtx.bezierCurveTo(cx - 50 * scale, cy - 70 * scale, cx - 100 * scale, cy - 20 * scale, cx, cy + 30 * scale); // Left side to bottom tip
  textCtx.bezierCurveTo(cx + 100 * scale, cy - 20 * scale, cx + 50 * scale, cy - 70 * scale, cx, cy - 30 * scale); // Right side back to cleft
  textCtx.fill();
  
  const imageData = textCtx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
  const validPixels = [];
  
  for (let y = 0; y < textCanvas.height; y += 2) {
    for (let x = 0; x < textCanvas.width; x += 2) {
      const index = (y * textCanvas.width + x) * 4;
      const alpha = imageData[index + 3];
      
      if (alpha > 128) {
        const posX = x - textCanvas.width / 2;
        const posY = -(y - textCanvas.height / 2);
        validPixels.push(new THREE.Vector3(posX * 0.35, posY * 0.35, 0));
      }
    }
  }

  textPositions = [];
  const totalParticles = 5000;
  
  if (validPixels.length === 0) return;

  for (let i = 0; i < totalParticles; i++) {
    const randomPixel = validPixels[Math.floor(Math.random() * validPixels.length)];
    const jitterX = (Math.random() - 0.5) * 1.5;
    const jitterY = (Math.random() - 0.5) * 1.5;
    
    textPositions.push(new THREE.Vector3(
      randomPixel.x + jitterX,
      randomPixel.y + jitterY,
      0
    ));
  }
}

function triggerHeartBeat() {
  isBeating = true;
  beatStrength = 1.0;
  emitBurst();
}

function emitBurst() {
  const burstMesh = burstSystems[0];
  burstMesh.visible = true;
  burstMesh.material.opacity = 1;

  const positions = burstMesh.geometry.attributes.position.array;
  const sizes = burstMesh.geometry.attributes.size.array;

  // Accurately targeting the mathematical center of the heart from the canvas
  // Center is Y=200, Heart is Y=250 -> Difference is -50. Scale is 0.35 -> -17.5
  const heartCenterX = 0
  const heartCenterY = -17.5; 

  for (let i = 0; i < burstParticles.length; i++) {
    const p = burstParticles[i];
    p.active = true;
    p.life = 0;
    p.maxLife = 0.5 + Math.random() * 1.0;
    
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 15 + Math.random() * 35;
    
    p.x = heartCenterX;
    p.y = heartCenterY;
    p.z = 0;
    p.vx = Math.sin(phi) * Math.cos(theta) * speed;
    p.vy = Math.sin(phi) * Math.sin(theta) * speed;
    p.vz = Math.cos(phi) * speed * 0.5;
    
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    sizes[i] = 1 + Math.random() * 3;
  }

  burstMesh.geometry.attributes.position.needsUpdate = true;
  burstMesh.geometry.attributes.size.needsUpdate = true;
}

function updateBurst() {
  const burstMesh = burstSystems[0];
  const positions = burstMesh.geometry.attributes.position.array;
  const sizes = burstMesh.geometry.attributes.size.array;
  const colors = burstMesh.geometry.attributes.color.array;

  let anyActive = false;

  for (let i = 0; i < burstParticles.length; i++) {
    const p = burstParticles[i];
    
    if (p.active) {
      anyActive = true;
      p.life += 0.02;
      
      const lifeRatio = p.life / p.maxLife;
      
      if (lifeRatio >= 1) {
        p.active = false;
        positions[i * 3] = 0 + currentOffsetX;
        positions[i * 3 + 1] = -17.5 + currentOffsetY; // Reset to heart center
        positions[i * 3 + 2] = 0;
        sizes[i] = 0;
        continue;
      }

      p.x += p.vx * 0.02;
      p.y += p.vy * 0.02;
      p.z += p.vz * 0.02;
      
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.vz *= 0.995;
      
      const fade = 1 - lifeRatio;
      const sizeFade = fade * 4;
      
      positions[i * 3] = p.x + currentOffsetX;
      positions[i * 3 + 1] = p.y + currentOffsetY;
      positions[i * 3 + 2] = p.z;
      
      sizes[i] = sizeFade;
      
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.05 + 0.2 * (1 - fade);
      colors[i * 3 + 2] = 0.05 + 0.2 * (1 - fade);
    } else {
      positions[i * 3] = 0 + currentOffsetX;
      positions[i * 3 + 1] = -17.5 + currentOffsetY; // Reset to heart center
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
    }
  }

  burstMesh.geometry.attributes.position.needsUpdate = true;
  burstMesh.geometry.attributes.size.needsUpdate = true;
  burstMesh.geometry.attributes.color.needsUpdate = true;

  if (!anyActive) {
    burstMesh.visible = false;
    burstMesh.material.opacity = 0;
  } else {
    burstMesh.material.opacity = 1;
  }
}

export function setHandTarget(x, y, actionType, z = 0) {
  if (actionType === 'fist') {
    if (mode !== 'fist') {
      baseFistZ = z;
    }
    if (baseFistZ > 0.001) {
      targetScale = z / baseFistZ;
      targetScale = Math.max(0.3, Math.min(targetScale, 3.5));
    }
  } else {
    targetScale = 1;
  }

  mode = actionType;

  if (bloomPass && mode !== 'text' && mode !== 'ily') {
    bloomPass.strength = 2.5;
    bloomPass.radius = 1.2;
  }

  if (mode === 'navigate') {
    targetOffsetX = (x - 0.5) * 350;
    targetOffsetY = (y - 0.5) * 250;
  } else if (mode === 'fist') {
    targetOffsetX = (x - 0.5) * 150;
    targetOffsetY = (y - 0.5) * 100;
  } else if (mode === 'text') {
    targetOffsetX = (x - 0.5) * 250;
    targetOffsetY = (y - 0.5) * 150;
    
    if (bloomPass) {
      bloomPass.strength = 0.4;
      bloomPass.radius = 0.2;
    }
    
    const targetString = "PEACE";

    if (currentTextString !== targetString || textPositions.length === 0) {
      textPositions = generateTextVertices(targetString, false);
      currentTextString = targetString;
    }
    
    burstSystems.forEach(burst => {
      burst.visible = false;
      burst.material.opacity = 0;
    });
    burstParticles.forEach(p => p.active = false);
    
  } else if (mode === 'ily') {
    // added hand drag but the center does not follow fastly
    targetOffsetX = (x - 0.5) * 250;
    targetOffsetY = (y - 0.5) * 150;
    
    if (bloomPass) {
      bloomPass.strength = 0.4;
      bloomPass.radius = 0.2;
    }
    
    const targetString = "I LOVE YOU";

    if (currentTextString !== targetString || textPositions.length === 0) {
      generateCombinedILoveYou();
      currentTextString = targetString;
    }

    if (!isBeating) {
      triggerHeartBeat();
    }
  } else {
    targetOffsetX = 0;
    targetOffsetY = 0;
    textPositions = [];
    currentTextString = "";
    burstSystems.forEach(burst => {
      burst.visible = false;
      burst.material.opacity = 0;
    });
    burstParticles.forEach(p => p.active = false);
  }
}

function animate() {
  requestAnimationFrame(animate);
  
  time += 0.02;

  currentOffsetX += (targetOffsetX - currentOffsetX) * 0.1;
  currentOffsetY += (targetOffsetY - currentOffsetY) * 0.1;
  currentScale += (targetScale - currentScale) * 0.15;

  // Single Source Heart beat animation
  if (mode === 'ily') {
    heartbeatTimer += 0.02;
    if (heartbeatTimer >= 1.5) {
      triggerHeartBeat();
      heartbeatTimer = 0;
    }

    if (isBeating) {
      beatStrength *= 0.95;
      if (beatStrength < 0.01) {
        beatStrength = 0;
        isBeating = false;
      }
    }
    
    updateBurst();
  }

  let globalParticleIndex = 0;

  particleSystems.forEach(particles => {
    const positions = particles.geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length / 3; i++) {
      let tx, ty, tz;
      const gIdx = globalParticleIndex;
      
      const isBackground = ((mode === 'text' || mode === 'ily') && gIdx > 3500);

      if (mode === 'scatter' || mode === 'navigate' || isBackground) {
        basePositions[gIdx * 3 + 2] += 0.4;

        if (basePositions[gIdx * 3 + 2] > 100) {
          basePositions[gIdx * 3 + 2] = -500 - Math.random() * 500;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 600;
          basePositions[gIdx * 3] = Math.cos(angle) * radius;
          basePositions[gIdx * 3 + 1] = Math.sin(angle) * radius;
        }
        
        tx = basePositions[gIdx * 3] + currentOffsetX;
        ty = basePositions[gIdx * 3 + 1] + currentOffsetY;
        tz = basePositions[gIdx * 3 + 2];
        
      } else if ((mode === 'text' || mode === 'ily') && textPositions.length > 0) {
        const targetPos = textPositions[gIdx % textPositions.length];
        
        let heartBeatScale = 1;
        if (mode === 'ily') {
          // Relies strictly on beatStrength (only 1 pulse source)
          heartBeatScale = 1 + (beatStrength * 0.15); 
        }
        
        const floatX = Math.cos(time * 1.5 + gIdx * 0.1) * 1.5;
        const floatY = Math.sin(time * 1.5 + gIdx * 0.1) * 1.5;

        tx = targetPos.x * heartBeatScale + currentOffsetX + floatX;
        ty = targetPos.y * heartBeatScale + currentOffsetY + floatY;
        tz = targetPos.z;
        
      } else if (mode === 'fist') {
        tx = spherePositions[gIdx * 3] * 0.3 * currentScale + currentOffsetX;
        ty = spherePositions[gIdx * 3 + 1] * 0.3 * currentScale + currentOffsetY;
        tz = spherePositions[gIdx * 3 + 2] * 0.3 * currentScale;
      }

      positions[i * 3] += (tx - positions[i * 3]) * 0.08;
      positions[i * 3 + 1] += (ty - positions[i * 3 + 1]) * 0.08;
      positions[i * 3 + 2] += (tz - positions[i * 3 + 2]) * 0.08;

      globalParticleIndex++;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    
    if (mode === 'scatter' || mode === 'navigate') {
      particles.rotation.z = time * 0.05;
    } else {
      particles.rotation.z += (0 - particles.rotation.z) * 0.1;
    }
  });

  composer.render();
}