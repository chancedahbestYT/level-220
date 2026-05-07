const tapes = [
  { name: 'Tape 1', loops: 4, tempo: 1.0, distortion: 0.25, delay: 0.03 },
  { name: 'Tape 2', loops: 4, tempo: 1.3, distortion: 0.45, delay: 0.05 },
  { name: 'Final Tape', loops: 6, tempo: 1.1, distortion: 0.6, delay: 0.08, final: true }
];

const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const sleepButton = document.getElementById('sleepButton');
const resetButton = document.getElementById('resetButton');
const statusText = document.getElementById('statusText');
const scentBar = document.getElementById('scentBar');
const scentLabel = document.getElementById('scentLabel');
const cameraFeed = document.getElementById('cameraFeed');
const cameraScreen = document.getElementById('cameraScreen');
const tapeButtons = document.querySelectorAll('.tape-button');
const room = document.querySelector('.room');
const vhsConsole = document.querySelector('.vhs-console');
const scene = document.getElementById('scene');
const baseSceneTransform = 'rotateX(16deg) rotateY(-12deg) translateZ(-160px)';

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
let analyser = null;

function selectTape(index) {
  if (isPlaying) return;
  currentTapeIndex = index;
  tapeButtons.forEach((button, idx) => {
    button.classList.toggle('selected', idx === index);
  });
  updateStatus(`Selected ${tapes[index].name}. Press Play to begin.`);
}

function handleRoomMotion(event) {
  const rect = room.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const rotateY = (x - 0.5) * 18;
  const rotateX = (0.45 - y) * 14;
  scene.style.transform = `rotateX(${16 + rotateX}deg) rotateY(${-12 + rotateY}deg) translateZ(-160px)`;
}

function resetRoomMotion() {
  scene.style.transform = baseSceneTransform;
}

room.addEventListener('mousemove', handleRoomMotion);
room.addEventListener('mouseleave', resetRoomMotion);

function updateStatus(message) {
  statusText.textContent = message;
}

function setScent(level) {
  scentValue = Math.min(100, Math.max(0, level));
  scentBar.style.width = `${scentValue}%`;
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
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  return audioContext;
}

function startAudioTape(tape) {
  const ctx = createAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const noise = ctx.createBufferSource();

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.12;
  }
  noise.buffer = buffer;
  noise.loop = true;

  oscillator.type = 'triangle';
  oscillator.frequency.value = 110;
  oscillator.detune.value = tape.tempo * 18;

  filter.type = 'lowpass';
  filter.frequency.value = 600;
  filter.Q.value = 0.8;

  gain.gain.value = 0.2;
  const distortion = ctx.createWaveShaper();
  distortion.curve = makeDistortionCurve(tape.distortion * 100);
  distortion.oversample = '4x';

  oscillator.connect(distortion);
  distortion.connect(filter);
  filter.connect(gain);
  noise.connect(gain);
  gain.connect(analyser);
  analyser.connect(ctx.destination);

  oscillator.start();
  noise.start();
  currentSource = { oscillator, noise, gain, distortion, filter };
}

function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
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
  currentSource.noise.stop();
  currentSource = null;
}

function playTape() {
  if (isPlaying) return;
  const tape = tapes[currentTapeIndex];
  isPlaying = true;
  loopCount = 0;
  setScent(15);
  room.classList.add('knock');
  vhsConsole.classList.add('active');
  playButton.disabled = true;
  stopButton.disabled = false;
  sleepButton.disabled = true;
  cameraFeed.classList.add('hidden');

  updateStatus(`${tape.name} is playing. Listen. Do not stop early unless you want DADDY to notice.`);
  startAudioTape(tape);
  scheduleLoop(tape);
}

function scheduleLoop(tape) {
  const loopDuration = 3200 / tape.tempo;
  songTimer = setInterval(() => {
    loopCount += 1;
    incrementScent(tape);
    if (loopCount === 2 && tape.final) {
      showCameraFeed();
      updateStatus('Final tape camera feed is live. Match the room and lie still when the image shows the bed.');
    }
    if (loopCount >= tape.loops) {
      endTape(tape);
    }
  }, loopDuration);
}

function incrementScent(tape) {
  setScent(scentValue + 17);
  if (scentValue >= 85) {
    room.classList.add('sleeping');
  }
}

function endTape(tape) {
  clearInterval(songTimer);
  songTimer = null;
  stopAudioTape();
  isPlaying = false;
  playButton.disabled = true;
  stopButton.disabled = true;
  room.classList.remove('knock');
  vhsConsole.classList.remove('active');

  if (tape.final) {
    updateStatus('The final tape ended. The live feed shows the bed. Act asleep and close your eyes during the last loop to escape.');
    triggerKnock(true);
  } else {
    updateStatus('Tape finished. DADDY heard the song echo through the walls. Act asleep to survive and prepare for the next tape.');
    triggerKnock(false);
  }
}

function stopTapeEarly() {
  if (!isPlaying) return;
  clearInterval(songTimer);
  songTimer = null;
  stopAudioTape();
  isPlaying = false;
  playButton.disabled = true;
  stopButton.disabled = true;
  vhsConsole.classList.remove('active');
  updateStatus('The tape cut off abruptly. DADDY is coming. Act asleep now.');
  triggerKnock(false, true);
}

function triggerKnock(isFinal, abrupt = false) {
  isKnock = true;
  room.classList.add('knock');
  sleepButton.disabled = false;
  const delay = abrupt ? 1800 : 1200;

  knockTimer = setTimeout(() => {
    updateStatus('Knocking starts. Climb into the bunk bed and lie still.');
    if (!isSleeping) {
      if (isFinal) {
        failRitual('DADDY found you moving during the final ritual. The level resets to Tape 1.');
      } else {
        failRitual('The scent spiked and the ritual failed. You must start over from Tape 1.');
      }
    }
  }, delay);
}

function actAsleep() {
  if (!isKnock) return;
  isSleeping = true;
  sleepButton.disabled = true;
  room.classList.add('sleeping');
  updateStatus('You are lying still in the bed. The scent is heavy; hold still until it fades.');
  let holdTime = 0;
  sleepTimer = setInterval(() => {
    holdTime += 1;
    setScent(scentValue - 10);
    if (holdTime === 5) {
      clearInterval(sleepTimer);
      sleepTimer = null;
      completeSleep();
    }
  }, 800);
}

function completeSleep() {
  isKnock = false;
  room.classList.remove('knock');
  room.classList.remove('sleeping');
  isSleeping = false;
  setScent(0);
  updateStatus('The scent has vanished. The ritual resets and the level shifts.');
  if (currentTapeIndex === 2) {
    completeEscape();
  } else {
    loadNextTape();
  }
}

function completeEscape() {
  updateStatus('You matched the feed and closed your eyes. The scent disappears. Level 220 releases you into another Backrooms level.');
  cameraFeed.classList.add('hidden');
  sleepButton.disabled = true;
  playButton.disabled = true;
  stopButton.disabled = true;
}

function failRitual(reason) {
  clearAllTimers();
  isSleeping = false;
  isKnock = false;
  room.classList.remove('knock');
  room.classList.remove('sleeping');
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
  currentTapeIndex = Math.min(tapes.length - 1, currentTapeIndex + 1);
  selectTape(currentTapeIndex);
  playButton.disabled = false;
  stopButton.disabled = true;
  sleepButton.disabled = true;
  cameraFeed.classList.add('hidden');
}

function showCameraFeed() {
  cameraFeed.classList.remove('hidden');
}

function clearAllTimers() {
  clearInterval(songTimer);
  clearInterval(sleepTimer);
  clearTimeout(knockTimer);
  songTimer = null;
  sleepTimer = null;
  knockTimer = null;
}

function resetGame() {
  clearAllTimers();
  stopAudioTape();
  isPlaying = false;
  isKnock = false;
  isSleeping = false;
  room.classList.remove('knock');
  room.classList.remove('sleeping');
  vhsConsole.classList.remove('active');
  cameraFeed.classList.add('hidden');
  selectTape(0);
  playButton.disabled = false;
  stopButton.disabled = true;
  sleepButton.disabled = true;
  setScent(0);
  updateStatus('Reset. Choose the first tape and press Play.');
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
