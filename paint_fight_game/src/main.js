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
