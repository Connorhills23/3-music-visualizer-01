import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";

/* -----------------------------
   SCENE SETUP
----------------------------- */
const canvas = document.getElementById("three");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  80,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 15, 60);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

/* -----------------------------
   LIGHTING
----------------------------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const directionalLight = new THREE.DirectionalLight(0xffffff, 10);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

/* -----------------------------
   AUDIO SETUP
----------------------------- */
const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 128;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

let source = null;
let audioBufferGlobal = null;
let isPlaying = false;
let startTimeOffset = 0;
let startTimestamp = 0;

/* -----------------------------
   LOAD AUDIO
----------------------------- */
document.getElementById("audioFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  audioBufferGlobal = await audioCtx.decodeAudioData(arrayBuffer);

  createSource();
});

/* -----------------------------
   CREATE AUDIO SOURCE
----------------------------- */
function createSource(startTime = 0) {
  if (source) source.disconnect();

  source = audioCtx.createBufferSource();
  source.buffer = audioBufferGlobal;

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  source.start(0, startTime);
  isPlaying = true;
  startTimeOffset = startTime;
  startTimestamp = audioCtx.currentTime;
}

/* -----------------------------
   PLAY / PAUSE BUTTONS
----------------------------- */
document.getElementById("playBtn").addEventListener("click", () => {
  if (!audioBufferGlobal) return;
  if (!isPlaying) {
    const elapsed = startTimeOffset + (audioCtx.currentTime - startTimestamp);
    createSource(elapsed);
  }
});

document.getElementById("pauseBtn").addEventListener("click", () => {
  if (isPlaying && source) {
    source.stop();
    startTimeOffset += audioCtx.currentTime - startTimestamp;
    isPlaying = false;
  }
});

/* -----------------------------
   CREATE 3D BARS
----------------------------- */
const bars = [];
const spacing = 1.2;
for (let i = 0; i < bufferLength; i++) {
  const geometry = new THREE.BoxGeometry(0.6, 1, 2);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(`hsl(${(i / bufferLength) * 1800}, 100%, 50%)`),
    metalness: 0.4,
    roughness: 0.4,
  });
  const bar = new THREE.Mesh(geometry, material);
  bar.position.set((i - bufferLength / 2) * spacing, 0, 0);
  scene.add(bar);
  bars.push(bar);
}

/* -----------------------------
   CREATE VIDEO TEXTURES 
----------------------------- */

// Background video
const bgVideo = document.createElement("video");
bgVideo.src = "./gif/rick-roll.mp4";
bgVideo.loop = true;
bgVideo.muted = true;
bgVideo.play();

const bgTexture = new THREE.VideoTexture(bgVideo);
bgTexture.minFilter = THREE.LinearFilter;
bgTexture.magFilter = THREE.LinearFilter;
bgTexture.format = THREE.RGBAFormat;

const bgPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 105),
  new THREE.MeshBasicMaterial({ map: bgTexture, transparent: true }),
);
bgPlane.position.set(0, 10, -20);
scene.add(bgPlane);

/* -----------------------------
   ANIMATION LOOP
----------------------------- */
function animate() {
  requestAnimationFrame(animate);

  if (isPlaying) {
    analyser.getByteFrequencyData(dataArray);

    // average frequency
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
    const avg = sum / bufferLength;

    // Bars animation
    bars.forEach((bar, i) => {
      const value = dataArray[i] / 255;
      bar.scale.y = 0.2 + value * 12;
      bar.scale.z = 1 + value * 4;
      bar.position.y = bar.scale.y / 3;
    });

    // Background video: subtle zoom + wavy motion
    bgPlane.scale.set(1 + avg / 200, 1 + avg / 200, 1);
    bgPlane.position.x = Math.sin(avg / 20 + performance.now() * 0.001) * 10;
    bgPlane.position.y =
      10 + Math.cos(avg / 25 + performance.now() * 0.001) * 5;
    bgPlane.rotation.z = Math.sin(avg / 50) * 0.2;
    bgPlane.rotation.y += 0.000001;
  }

  // slowly rotate entire scene
  scene.rotation.y += 0.000001;

  renderer.render(scene, camera);
}

animate();

/* -----------------------------
   HANDLE RESIZE
----------------------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
