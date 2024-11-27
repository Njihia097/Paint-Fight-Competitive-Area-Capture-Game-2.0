import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Create the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Light blue sky

// Create the camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 25, 25);
camera.lookAt(0, 0, 0);

// Create the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('game-container').appendChild(renderer.domElement);

// Add OrbitControls for testing
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// Create custom grid lines
const gridSize = 50;
const divisions = 12;
const step = gridSize / divisions;
const halfSize = gridSize / 2;

const gridMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

const gridLines = new THREE.Group();

for (let i = -halfSize; i <= halfSize; i += step) {
  // Lines parallel to Z-axis
  const pointsZ = [
    new THREE.Vector3(i, 0.01, -halfSize),
    new THREE.Vector3(i, 0.01, halfSize),
  ];
  const geometryZ = new THREE.BufferGeometry().setFromPoints(pointsZ);
  const lineZ = new THREE.Line(geometryZ, gridMaterial);
  gridLines.add(lineZ);

  // Lines parallel to X-axis
  const pointsX = [
    new THREE.Vector3(-halfSize, 0.01, i),
    new THREE.Vector3(halfSize, 0.01, i),
  ];
  const geometryX = new THREE.BufferGeometry().setFromPoints(pointsX);
  const lineX = new THREE.Line(geometryX, gridMaterial);
  gridLines.add(lineX);
}

scene.add(gridLines);

// Add a ground plane
const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.receiveShadow = true;
scene.add(groundPlane);

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x228b22, 0.4);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight.position.set(30, 50, 30);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Add a spotlight for focused lighting on the players
const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(0, 60, 0);
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.3;
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 2048;
spotLight.shadow.mapSize.height = 2048;
scene.add(spotLight);

// Create grid state tracking
const gridState = {}; // To track ownership of cells
const cellMarkers = {}; // Track cell markers to remove when taken over

// Player initialization
let player1, player2;
let player1Ring, player2Ring;

player1 = new THREE.Mesh(
  new THREE.SphereGeometry(1, 16, 16),
  new THREE.MeshStandardMaterial({ color: player1Color })
);
player1.name = 'player1';

player1Ring = new THREE.Mesh(
  new THREE.TorusGeometry(1.2, 0.1, 16, 100),
  new THREE.MeshStandardMaterial({
    color: player1Color,
    emissive: player1Color,
  })
);
player1Ring.rotation.x = Math.PI / 2;
player1Ring.position.set(0, 0.5, 0);
player1.add(player1Ring);

player2 = new THREE.Mesh(
  new THREE.SphereGeometry(1, 16, 16),
  new THREE.MeshStandardMaterial({ color: player2Color })
);
player2.name = 'player2';

player2Ring = new THREE.Mesh(
  new THREE.TorusGeometry(1.2, 0.1, 16, 100),
  new THREE.MeshStandardMaterial({
    color: player2Color,
    emissive: player2Color,
  })
);
player2Ring.rotation.x = Math.PI / 2;
player2Ring.position.set(0, 0.5, 0);
player2.add(player2Ring);

// Initial positions for players
player1.position.set(-halfSize + step / 2, 1, -halfSize + step / 2);
player2.position.set(halfSize - step / 2, 1, halfSize - step / 2);

player1.castShadow = true;
player2.castShadow = true;

scene.add(player1, player2);

// Handle player movement
document.addEventListener('keydown', (event) => {
  const currentTime = Date.now();

  // Player 1 controls (WASD)
  if (['w', 'a', 's', 'd'].includes(event.key)) {
    if (currentTime - lastMoveTime.player1 > moveCooldowns.player1) {
      let moved = false;
      switch (event.key) {
        case 'w': // Move forward
          if (player1.position.z - step >= -halfSize) {
            player1.position.z -= step;
            moved = true;
          }
          break;
        case 's': // Move backward
          if (player1.position.z + step <= halfSize) {
            player1.position.z += step;
            moved = true;
          }
          break;
        case 'a': // Move left
          if (player1.position.x - step >= -halfSize) {
            player1.position.x -= step;
            moved = true;
          }
          break;
        case 'd': // Move right
          if (player1.position.x + step <= halfSize) {
            player1.position.x += step;
            moved = true;
          }
          break;
      }
      if (moved) {
        captureCell('player1', player1.position);
        lastMoveTime.player1 = currentTime;
        checkPowerUpCollection(player1);
      }
    }
  }

  // Player 2 controls (Arrow keys)
  else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    if (currentTime - lastMoveTime.player2 > moveCooldowns.player2) {
      let moved = false;
      switch (event.key) {
        case 'ArrowUp': // Move forward
          if (player2.position.z - step >= -halfSize) {
            player2.position.z -= step;
            moved = true;
          }
          break;
        case 'ArrowDown': // Move backward
          if (player2.position.z + step <= halfSize) {
            player2.position.z += step;
            moved = true;
          }
          break;
        case 'ArrowLeft': // Move left
          if (player2.position.x - step >= -halfSize) {
            player2.position.x -= step;
            moved = true;
          }
          break;
        case 'ArrowRight': // Move right
          if (player2.position.x + step <= halfSize) {
            player2.position.x += step;
            moved = true;
          }
          break;
      }
      if (moved) {
        captureCell('player2', player2.position);
        lastMoveTime.player2 = currentTime;
        checkPowerUpCollection(player2);
      }
    }
  }
});
```
