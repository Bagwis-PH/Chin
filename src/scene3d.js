import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

let scene, camera, renderer, particles, targetPositions = [];

export function initScene(container) {
  // Setup boilerplate
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 50;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Create particle geometry
  const particleCount = 5000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 100; // random scatter
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  animate();
}

export function morphToPeace() {
  const loader = new FontLoader();
  loader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
    const textGeo = new TextGeometry('PEACE', {
      font: font,
      size: 10,
      height: 1,
    });

    textGeo.computeBoundingBox();
    const positionAttr = textGeo.getAttribute('position');

    targetPositions = [];
    for (let i = 0; i < positionAttr.count; i++) {
      targetPositions.push(
        new THREE.Vector3(
          positionAttr.getX(i),
          positionAttr.getY(i),
          positionAttr.getZ(i)
        )
      );
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (targetPositions.length > 0) {
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < targetPositions.length && i < positions.length / 3; i++) {
      const tx = targetPositions[i].x;
      const ty = targetPositions[i].y;
      const tz = targetPositions[i].z;

      // linear interpolation (lerp)
      positions[i * 3] += (tx - positions[i * 3]) * 0.05;
      positions[i * 3 + 1] += (ty - positions[i * 3 + 1]) * 0.05;
      positions[i * 3 + 2] += (tz - positions[i * 3 + 2]) * 0.05;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
