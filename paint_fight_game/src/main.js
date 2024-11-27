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
}


);

// Function to get grid index from position
function getGridIndex(position) {
  const xIndex = Math.floor((position.x + halfSize) / step);
  const zIndex = Math.floor((position.z + halfSize) / step);
  return `${xIndex},${zIndex}`;
}

// Function to capture a cell
function captureCell(player, position) {
  const key = getGridIndex(position);

  if (!gridState[key] || gridState[key] !== player) {
    if (gridState[key]) {
      // Decrement opponent's score if taking over a cell
      if (gridState[key] === 'player1') player1Score--;
      if (gridState[key] === 'player2') player2Score--;

      // Remove previous marker
      scene.remove(cellMarkers[key]);
      delete cellMarkers[key];
    }

    // Update grid ownership
    gridState[key] = player;

    // Increment the player's score
    if (player === 'player1') player1Score++;
    if (player === 'player2') player2Score++;

    // Create a visual marker to show cell ownership
    const markerColor = player === 'player1' ? player1Color : player2Color;
    const markerMaterial = new THREE.MeshStandardMaterial({ color: markerColor });
    const markerGeometry = new THREE.BoxGeometry(step - 0.5, 0.5, step - 0.5);

    const indices = key.split(',').map(Number);
    const xPos = -halfSize + indices[0] * step + step / 2;
    const zPos = -halfSize + indices[1] * step + step / 2;

    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(xPos, 0.25, zPos);
    marker.receiveShadow = true;
    scene.add(marker);

    // Track the marker in the cellMarkers object
    cellMarkers[key] = marker;

    // Update the scoreboard
    document.getElementById('player1-score').textContent = `Player 1: ${player1Score}`;
    document.getElementById('player2-score').textContent = `Player 2: ${player2Score}`;
  }
}

// Function to check for power-up collection
function checkPowerUpCollection(player) {
  powerUps.forEach((powerUp, index) => {
    if (powerUp.mesh.position.distanceTo(player.position) < 1) {
      powerUp.collect(player);
      powerUps.splice(index, 1);
    }
  });
}

// Function to spawn power-ups
function spawnPowerUp() {
  const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  const randomX = (Math.floor(Math.random() * divisions) - divisions / 2) * step + step / 2;
  const randomZ = (Math.floor(Math.random() * divisions) - divisions / 2) * step + step / 2;
  const position = new THREE.Vector3(randomX, 0, randomZ);
  const powerUp = new PowerUp(randomType, position);
  powerUps.push(powerUp);

  // Schedule next power-up spawn
  const spawnInterval = Math.random() * 5000 + 10000; // 10 to 15 seconds
  setTimeout(spawnPowerUp, spawnInterval);
}

// Power-Up Class
class PowerUp {
  constructor(type, position) {
    this.type = type;
    const color = type === 'size' ? 0xffff00 : 0x00ff00; // Yellow for size, green for speed
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(position.x, 0.5, position.z);
    scene.add(this.mesh);
  }

  collect(player) {
    scene.remove(this.mesh);

    if (this.type === 'size') {
      player.scale.set(2, 2, 2);
      setTimeout(() => {
        player.scale.set(1, 1, 1);
      }, 5000); // Effect lasts 5 seconds
    } else if (this.type === 'speed') {
      moveCooldowns[player.name] = 100; // Faster movement
      setTimeout(() => {
        moveCooldowns[player.name] = 200; // Reset to normal speed
      }, 5000); // Effect lasts 5 seconds
    }
  }
}

// Function to Start the Game
document.getElementById('start-game-button').addEventListener('click', () => {
  // Get selected colors
  const player1ColorInput = document.getElementById('player1-color').value;
  const player2ColorInput = document.getElementById('player2-color').value;

  player1Color = parseInt(player1ColorInput.replace('#', '0x'));
  player2Color = parseInt(player2ColorInput.replace('#', '0x'));

  // Get game duration
  gameDuration = parseInt(document.getElementById('game-duration').value);

  // Hide the start screen
  document.getElementById('start-screen').style.display = 'none';

  // Initialize the game
  initGame();
});

// Function to initialize the game
function initGame() {
  // Set scoreboard colors
  document.getElementById('player1-score').style.color = `#${player1Color.toString(16).padStart(6, '0')}`;
  document.getElementById('player2-score').style.color = `#${player2Color.toString(16).padStart(6, '0')}`;

  // Start the timer
  startTimer();

  // Start spawning power-ups
  spawnPowerUp();
}

// Function to start the timer
function startTimer() {
  remainingTime = gameDuration;
  document.getElementById('timer').textContent = `Time Left: ${remainingTime}s`;

  timerInterval = setInterval(() => {
    remainingTime--;
    document.getElementById('timer').textContent = `Time Left: ${remainingTime}s`;
 if (remainingTime <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

// Function to end the game
function endGame() {
  // Display the game over screen
  document.getElementById('game-over-screen').style.display = 'flex';

  // Show final scores
  const finalScoresDiv = document.getElementById('final-scores');
  finalScoresDiv.innerHTML = `
    <p style="color: #${player1Color.toString(16).padStart(6, '0')}">Player 1 Score: ${player1Score}</p>
    <p style="color: #${player2Color.toString(16).padStart(6, '0')}">Player 2 Score: ${player2Score}</p>
  `;
 // Announce the winner
  if (player1Score > player2Score) {
    finalScoresDiv.innerHTML += `<p style="color: #${player1Color.toString(16).padStart(6, '0')}">Winner: Player 1!</p>`;
  } else if (player2Score > player1Score) {
    finalScoresDiv.innerHTML += `<p style="color: #${player2Color.toString(16).padStart(6, '0')}">Winner: Player 2!</p>`;
  } else {
    finalScoresDiv.innerHTML += '<p>It\'s a Tie!</p>';
  }
}

// Restart Game Functionality
document.getElementById('restart-game-button').addEventListener('click', () => {
  // Reload the page to restart the game
  location.reload();
});

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
// Basic render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
