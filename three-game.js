const tapes = [
  { name: 'Tape 1', loops: 4, tempo: 1.0, distortion: 0.25 },
  { name: 'Tape 2', loops: 4, tempo: 1.3, distortion: 0.45 },
  { name: 'Final Tape', loops: 6, tempo: 1.1, distortion: 0.6, final: true }
];

const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const sleepButton = document.getElementById('sleepButton');
const resetButton = document.getElementById('resetButton');
const statusText = document.getElementById('statusText');
const scentBar = document.getElementById('scentBar');
const scentLabel = document.getElementById('scentLabel');
const cameraFeed = document.getElementById('cameraFeed');
const tapeButtons = document.querySelectorAll('.tape-button');
const vhsConsole = document.querySelector('.vhs-console');
const canvasContainer = document.getElementById('canvas-container');

let currentTapeIndex = 0;
let isPlaying = false;
let isKnock = false;
let isSleeping = false;
let scentValue = 0;
let loopCount = 0;
let songTimer = null;
let knockTimer = null;
let sleepTimer = null;
let audioContext = null;
let currentSource = null;

let scene, camera, renderer, room, bed, tv;
let mouseX = 0, mouseY = 0;

function initThreeScene() {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04080c);
  scene.fog = new THREE.Fog(0x04080c, 50, 200);

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 1.5, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasContainer.appendChild(renderer.domElement);

  createRoom();
  createLighting();
  animate();

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onWindowResize);
}

function createRoom() {
  room = new THREE.Group();
  scene.add(room);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x0e2132,
    metalness: 0.1,
    roughness: 0.9
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x081016,
    metalness: 0.05,
    roughness: 0.95
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), wallMaterial);
  backWall.position.z = -8;
  backWall.position.y = 5;
  room.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), wallMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.x = -8;
  leftWall.position.y = 5;
  room.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), wallMaterial);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.x = 8;
  rightWall.position.y = 5;
  room.add(rightWall);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  room.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), wallMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 10;
  room.add(ceiling);

  createBunkBed();
  createTV();
}

function createBunkBed() {
  bed = new THREE.Group();

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x546b7d,
    metalness: 0.3,
    roughness: 0.7
  });

  const mattressMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b5775,
    metalness: 0.1,
    roughness: 0.8
  });

  const frameGeometry = new THREE.BoxGeometry(3, 0.2, 2);
  const topFrame = new THREE.Mesh(frameGeometry, frameMaterial);
  topFrame.position.y = 4.8;
  topFrame.position.x = -3;
  bed.add(topFrame);

  const bottomFrame = new THREE.Mesh(frameGeometry, frameMaterial);
  bottomFrame.position.y = 2;
  bottomFrame.position.x = -3;
  bed.add(bottomFrame);

  const mattressGeometry = new THREE.BoxGeometry(2.8, 0.15, 1.8);
  const topMattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
  topMattress.position.y = 5;
  topMattress.position.x = -3;
  bed.add(topMattress);

  const bottomMattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
  bottomMattress.position.y = 2.2;
  bottomMattress.position.x = -3;
  bed.add(bottomMattress);

  room.add(bed);
}

function createTV() {
  tv = new THREE.Group();

  const tvBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a4a5a,
    metalness: 0.4,
    roughness: 0.6
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 0.3), tvBodyMaterial);
  body.position.set(5, 2.5, -2);
  tv.add(body);

  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d1420,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x1a3a5a
  });

  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 0.05), screenMaterial);
  screen.position.set(5, 2.5, -1.8);
  tv.add(screen);

  room.add(tv);
}

function createLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0x5a8ac8, 0.3);
  pointLight.position.set(5, 3, -1);
  scene.add(pointLight);
}

function onMouseMove(event) {
  const rect = canvasContainer.getBoundingClientRect();
  mouseX = (event.clientX - rect.left) / rect.width;
  mouseY = (event.clientY - rect.top) / rect.height;
}

function onWindowResize() {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function updateCamera() {
  camera.position.x = (mouseX - 0.5) * 2;
  camera.position.y = 1.5 + (mouseY - 0.5) * 0.8;
  camera.lookAt(0, 2, 0);
}

function selectTape(index) {
  if (isPlaying) return;
  currentTapeIndex = index;
  tapeButtons.forEach((button, idx) => {
    button.classList.toggle('selected', idx === index);
  });
  updateStatus(\`Selected \${tapes[index].name}. Press Play to begin.\`);
}

function updateStatus(message) {
  statusText.textContent = message;
}

function setScent(level) {
  scentValue = Math.min(100, Math.max(0, level));
  scentBar.style.width = \`\${scentValue}%\`;
  if (scentValue < 30) {
    scentBar.style.background = 'linear-gradient(90deg, #7cd6c8, #92e4ff)';
    scentLabel.textContent = 'Quiet';
  } else if (scentValue < 65) {
    scentBar.style.background = 'linear-gradient(90deg, #f4a2b2, #f4d5ab)';
    scentLabel.textContent = 'Strong';
  } else {
    scentBar.style.background = 'linear-gradient(90deg, #b24b67, #7f2c3b)';
    scentLabel.textContent = 'Overwhelming';
  }
}

function createAudioContext() {
  if (audioContext) return audioContext;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

function startAudioTape(tape) {
  const ctx = createAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator.type = 'triangle';
  oscillator.frequency.value = 110;
  oscillator.detune.value = tape.tempo * 18;

  filter.type = 'lowpass';
  filter.frequency.value = 600;

  const distortion = ctx.createWaveShaper();
  distortion.curve = makeDistortionCurve(tape.distortion * 100);

  gain.gain.value = 0.18;

  oscillator.connect(distortion);
  distortion.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  currentSource = { oscillator, gain };
}

function makeDistortionCurve(amount) {
  const k = amount || 50;
  const n = 44100;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; ++i) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function stopAudioTape() {
  if (!currentSource) return;
  currentSource.oscillator.stop();
  currentSource = null;
}

function playTape() {
  if (isPlaying) return;
  const tape = tapes[currentTapeIndex];
  isPlaying = true;
  loopCount = 0;
  setScent(15);
  playButton.disabled = true;
  stopButton.disabled = false;
  sleepButton.disabled = true;
  cameraFeed.classList.add('hidden');
  vhsConsole.classList.add('active');

  updateStatus(\`\${tape.name} is playing. Listen...\`);
  startAudioTape(tape);
  scheduleLoop(tape);
}

function scheduleLoop(tape) {
  const loopDuration = 3200 / tape.tempo;
  songTimer = setInterval(() => {
    loopCount += 1;
    setScent(scentValue + 17);
    if (loopCount === 2 && tape.final) {
      showCameraFeed();
      updateStatus('Final tape live. Match the bed position. Lie still to escape.');
    }
    if (loopCount >= tape.loops) {
      endTape(tape);
    }
  }, loopDuration);
}

function endTape(tape) {
  clearInterval(songTimer);
  stopAudioTape();
  isPlaying = false;
  playButton.disabled = true;
  stopButton.disabled = true;
  vhsConsole.classList.remove('active');

  if (tape.final) {
    updateStatus('The final tape ended. Act asleep now to escape.');
    triggerKnock(true);
  } else {
    updateStatus('Tape finished. DADDY heard it. Act asleep to survive.');
    triggerKnock(false);
  }
}

function stopTapeEarly() {
  if (!isPlaying) return;
  clearInterval(songTimer);
  stopAudioTape();
  isPlaying = false;
  playButton.disabled = true;
  stopButton.disabled = true;
  vhsConsole.classList.remove('active');
  updateStatus('The tape cut off. DADDY is coming.');
  triggerKnock(false, true);
}

function triggerKnock(isFinal, abrupt = false) {
  isKnock = true;
  sleepButton.disabled = false;
  const delay = abrupt ? 1800 : 1200;

  knockTimer = setTimeout(() => {
    updateStatus('Knocking starts. Act asleep now.');
    if (!isSleeping) {
      failRitual('DADDY found you. The ritual failed. Starting over...');
    }
  }, delay);
}

function actAsleep() {
  if (!isKnock) return;
  isSleeping = true;
  sleepButton.disabled = true;
  updateStatus('You are lying still. Waiting for the scent to fade...');
  let holdTime = 0;
  sleepTimer = setInterval(() => {
    holdTime += 1;
    setScent(Math.max(0, scentValue - 10));
    if (holdTime === 5) {
      clearInterval(sleepTimer);
      completeSleep();
    }
  }, 800);
}

function completeSleep() {
  isKnock = false;
  isSleeping = false;
  setScent(0);
  if (currentTapeIndex === 2) {
    completeEscape();
  } else {
    loadNextTape();
  }
}

function completeEscape() {
  updateStatus('The scent vanishes. Level 220 releases you into another Backrooms level. ESCAPED.');
  cameraFeed.classList.add('hidden');
  sleepButton.disabled = true;
  playButton.disabled = true;
}

function failRitual(reason) {
  clearAllTimers();
  isSleeping = false;
  isKnock = false;
  cameraFeed.classList.add('hidden');
  setScent(15);
  playButton.disabled = false;
  stopButton.disabled = true;
  sleepButton.disabled = true;
  updateStatus(reason);
  currentTapeIndex = 0;
  selectTape(0);
}

function loadNextTape() {
  updateStatus('The ritual resets. Prepare the next tape.');
  currentTapeIndex = Math.min(2, currentTapeIndex + 1);
  selectTape(currentTapeIndex);
  playButton.disabled = false;
  stopButton.disabled = true;
  sleepButton.disabled = true;
}

function showCameraFeed() {
  cameraFeed.classList.remove('hidden');
}

function clearAllTimers() {
  clearInterval(songTimer);
  clearInterval(sleepTimer);
  clearTimeout(knockTimer);
}

function resetGame() {
  clearAllTimers();
  stopAudioTape();
  isPlaying = false;
  isKnock = false;
  isSleeping = false;
  vhsConsole.classList.remove('active');
  cameraFeed.classList.add('hidden');
  selectTape(0);
  playButton.disabled = false;
  stopButton.disabled = true;
  sleepButton.disabled = true;
  setScent(0);
  updateStatus('Reset. Choose the first tape and press Play.');
}

function animate() {
  requestAnimationFrame(animate);
  updateCamera();
  renderer.render(scene, camera);
}

playButton.addEventListener('click', playTape);
stopButton.addEventListener('click', stopTapeEarly);
sleepButton.addEventListener('click', actAsleep);
resetButton.addEventListener('click', resetGame);

tapeButtons.forEach((button, index) => {
  button.addEventListener('click', () => selectTape(index));
});

selectTape(0);
setScent(0);
initThreeScene();
