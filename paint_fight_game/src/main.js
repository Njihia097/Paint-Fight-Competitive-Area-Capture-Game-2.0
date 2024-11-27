import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';

// Variables for Player Colors and Game Duration
let player1Color = 0xff0000;
let player2Color = 0x0000ff;
let gameDuration = 60; // Default to 60 seconds

let numberOfPowerUps;
let powerUpInterval;
let powerUpTimers = [];
let gameRunning = false;

let player1, player2;
let player1Ring, player2Ring;

let player1Score = 0;
let player2Score = 0;

let timerInterval;
let remainingTime = gameDuration; // This will be updated when the game starts

let powerUps = [];
const powerUpTypes = ['size', 'speed'];

const moveCooldowns = {
  player1: 200,
  player2: 200,
};

const lastMoveTime = {
  player1: 0,
  player2: 0,
};

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

// Get the background music element
const backgroundMusic = document.getElementById('background-music');

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

    // Play background music
    backgroundMusic.play();
});

// Function to initialize the game
function initGame() {
  // Create player characters with glowing rings
  // Player 1
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

  // Player 2
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

  // Set scoreboard colors
  document.getElementById('player1-score').style.color = `#${player1Color
    .toString(16)
    .padStart(6, '0')}`;
  document.getElementById('player2-score').style.color = `#${player2Color
    .toString(16)
    .padStart(6, '0')}`;

  // Start the timer
  startTimer();

  // Set game running state
  gameRunning = true;

  // Calculate number of power-ups and power-up interval
  numberOfPowerUps = Math.max(1, Math.floor(gameDuration / 10));
  powerUpInterval = gameDuration / numberOfPowerUps;

  // Start spawning power-ups
  spawnPowerUp();
}

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


// Handle player movement
document.addEventListener('keydown', (event) => {
  if (!player1 || !player2) return; // Wait until the game is initialized

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


// Function to check for power-up collection
function checkPowerUpCollection(player) {
  powerUps.forEach((powerUp, index) => {
    if (powerUp.mesh.position.distanceTo(player.position) < 1) {
      powerUp.collect(player);
      powerUps.splice(index, 1);
    }
  });
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
  gameRunning = false;

  // Clear all power-up timers
  powerUpTimers.forEach((timer) => {
    clearTimeout(timer);
  });
  powerUpTimers = [];

  // Remove any existing power-ups
  powerUps.forEach((powerUp) => {
    scene.remove(powerUp.mesh);
    const index = animatedObjects.indexOf(powerUp);
    if (index > -1) {
      animatedObjects.splice(index, 1);
    }
  });
  powerUps = [];

  // Reset players if they have power-up effects
  if (player1.scale.x !== 1) {
    player1.scale.set(1, 1, 1);
  }
  if (player2.scale.x !== 1) {
    player2.scale.set(1, 1, 1);
  }
  moveCooldowns.player1 = 200;
  moveCooldowns.player2 = 200;

    // Stop the background music
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;

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



// Function to spawn power-ups
function spawnPowerUp() {
  if (!gameRunning) return; // Stop spawning if the game is over

  // Remove any existing power-ups
  powerUps.forEach((powerUp) => {
    scene.remove(powerUp.mesh);

    // Remove from animated objects
    const index = animatedObjects.indexOf(powerUp);
    if (index > -1) {
      animatedObjects.splice(index, 1);
    }
  });
  powerUps = [];

  // Create and spawn a new power-up
  const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  const randomX =
    (Math.floor(Math.random() * divisions) - divisions / 2) * step + step / 2;
  const randomZ =
    (Math.floor(Math.random() * divisions) - divisions / 2) * step + step / 2;
  const position = new THREE.Vector3(randomX, 0, randomZ);
  const powerUp = new PowerUp(randomType, position);
  powerUps.push(powerUp);

  // Schedule next power-up spawn
  const spawnTimer = setTimeout(spawnPowerUp, powerUpInterval * 1000);
  powerUpTimers.push(spawnTimer);
}





// Power-Up Class with Distinct Animations for 'size' and 'speed'
class PowerUp {
  constructor(type, position) {
    this.type = type;
    const color = type === 'size' ? 0xffff00 : 0x00ff00; // Yellow for size, green for speed

    // Create the power-up mesh
    const geometry = new THREE.IcosahedronGeometry(1.5, 0);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5, // Adds a glowing effect
      transparent: true,
      opacity: 0.8,
      metalness: 0.5,
      roughness: 0.5,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(position.x, 1, position.z);
    scene.add(this.mesh);

    // Create a particle system around the power-up for visual effect
    this.particles = this.createParticleSystem(color);
    this.mesh.add(this.particles);

    // Add to the animation loop
    animatedObjects.push(this);
  }

  // Function to create a simple star particle system
  createParticleSystem(color) {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];

    for (let i = 0; i < particleCount; i++) {
      // Random positions around the power-up
      const angle = Math.random() * Math.PI * 2;
      const distance = 2 + Math.random() * 2;
      const x = Math.cos(angle) * distance;
      const y = Math.random() * 0.5;
      const z = Math.sin(angle) * distance;
      positions.push(x, y, z);

      sizes.push(0.2 + Math.random() * 0.3);
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute(
      'size',
      new THREE.Float32BufferAttribute(sizes, 1)
    );

    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.5,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6,
    });

    const particles = new THREE.Points(geometry, material);
    return particles;
  }

  animate(delta) {
    // Pulsate by scaling
    const scale = 1 + 0.3 * Math.sin(performance.now() * 0.005);
    this.mesh.scale.set(scale, scale, scale);

    // Rotate around multiple axes
    this.mesh.rotation.x += delta * 0.5;
    this.mesh.rotation.y += delta * 0.3;
    this.mesh.rotation.z += delta * 0.2;

    // Rotate particles to create a dynamic effect
    this.particles.rotation.y += delta * 1;
  }

  collect(player) {
    scene.remove(this.mesh);

    // Remove from animated objects
    const index = animatedObjects.indexOf(this);
    if (index > -1) {
      animatedObjects.splice(index, 1);
    }

    if (this.type === 'size') {
      // Directly scale the player up without animation
      player.scale.set(2, 2, 2);

      // Revert back to original size when next power-up appears
      const revertTimer = setTimeout(() => {
        player.scale.set(1, 1, 1);
      }, powerUpInterval * 1000);
      powerUpTimers.push(revertTimer);
    } else if (this.type === 'speed') {
      // Create a star trail effect
      const trail = new StarTrail(player);
      trail.start();

      // Faster movement
      moveCooldowns[player.name] = 100; // Increased speed

      // Reset speed and remove trail when next power-up appears
      const speedTimer = setTimeout(() => {
        moveCooldowns[player.name] = 200; // Reset to normal speed
        trail.stop();
      }, powerUpInterval * 1000);
      powerUpTimers.push(speedTimer);
    }
  }

  // Function to emit speed stars around the player
  emitSpeedStars(player) {
    // This method is no longer needed as we're using StarTrail
    // It can be removed or kept for additional effects
  }
}

// StarTrail Class to Create a Dynamic Trail Effect
class StarTrail {
  constructor(player) {
    this.player = player;
    this.particles = [];

    // Create a Points object for the trail
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    const particleCount = 50; // Number of particles in the trail

    for (let i = 0; i < particleCount; i++) {
      // Initialize all particles at the player's position
      positions.push(this.player.position.x, this.player.position.y, this.player.position.z);
      colors.push(1, 1, 1); // White stars
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    scene.add(this.points);
  }

  start() {
    this.animation = true;
    this.update();
  }

  stop() {
    this.animation = false;
    scene.remove(this.points);
  }

  update() {
    if (!this.animation) return;

    // Shift particles back and add a new one at the player's current position
    const positions = this.points.geometry.attributes.position.array;
    for (let i = positions.length - 3; i >= 3; i -= 3) {
      positions[i] = positions[i - 3];
      positions[i + 1] = positions[i - 2];
      positions[i + 2] = positions[i - 1];
    }

    // Set the first particle to the player's current position
    positions[0] = this.player.position.x;
    positions[1] = this.player.position.y;
    positions[2] = this.player.position.z;

    // Update the positions
    this.points.geometry.attributes.position.needsUpdate = true;

    // Schedule the next update
    requestAnimationFrame(() => this.update());
  }
}

// Array to keep track of animated objects
const animatedObjects = [];

// Clock for delta time
const clock = new THREE.Clock();

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update TWEEN animations
  TWEEN.update(time);

  // Update custom animations
  animatedObjects.forEach((obj) => {
    obj.animate(delta);
  });

  renderer.render(scene, camera);
}

// Start the animation loop
animate();
