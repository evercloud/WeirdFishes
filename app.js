/* eslint-disable no-plusplus */

// import * as THREE from './build/three.module.js';

import { GPUComputationRenderer } from './examples/jsm/misc/GPUComputationRenderer.js';

import { addTestCubeToScene } from './createObject.js';

import {
  fragmentShaderPosition, fragmentShaderVelocity, fishVS, fishFS,
} from './resources/shader.glsl.js';


// /////// GODRAYS VARIABLES /////////////////
import {
  GodRaysDepthMaskShader, GodRaysCombineShader, GodRaysGenerateShader,
} from './examples/jsm/shaders/GodRaysShader.js';


// INTRO MENU UI ////////
const startButton = document.getElementById('startButton');
let musicReady = false;
let soundReady = false;

// // wait 5 seconds before enabling overlay removal
setTimeout(function tryLaunchingGame() {
  if (musicReady && soundReady) {
    startButton.textContent = 'Press or touch to start';
    startButton.disabled = false;
  } else {
    setTimeout(tryLaunchingGame, 1000);
  }
}, 5000);

startButton.addEventListener('click', () => {
  const overlay = document.getElementById('overlay');
  // overlay.remove();

  overlay.style.opacity = 0;

  music.play();
  backgroundNoise.play();

  setTimeout(() => {
    overlay.remove();
  }, 6000);
}, false);
const postprocessing = { enabled: true };
const sunPosition = new THREE.Vector3(0, 1000, -1000);
// Use a smaller size for some of the god-ray render targets for better performance.
const godrayRenderTargetResolutionMultiplier = 1.0 / 12.0;
const screenSpacePosition = new THREE.Vector3();
// ////////////////////////


/* TEXTURE WIDTH FOR SIMULATION */
const WIDTH = 64;// 32;

const FISHES = WIDTH * WIDTH;

// Custom Geometry - using 3 triangles each. No UVs, no normals currently.
const FishGeometry = function () {
  const triangles = FISHES * 3;
  const points = triangles * 3;

  THREE.BufferGeometry.call(this);

  const vertices = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
  const fishColors = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
  const references = new THREE.BufferAttribute(new Float32Array(points * 2), 2);
  const fishVertex = new THREE.BufferAttribute(new Float32Array(points), 1);

  this.setAttribute('position', vertices);
  this.setAttribute('fishColor', fishColors);
  this.setAttribute('reference', references);
  this.setAttribute('fishVertex', fishVertex);

  // this.setAttribute( 'normal', new Float32Array( points * 3 ), 3 );


  let v = 0;

  function pushVertex() {
    for (let i = 0; i < arguments.length; i++) {
      vertices.array[v++] = arguments[i];
    }
  }


  for (let f = 0; f < FISHES; f++) {
    // Head
    pushVertex(
      0, -35, 0,
      0, 35, 0,
      0, 0, 30,
    );

    // Body
    pushVertex(
      0, 0, -60,
      0, 35, 0,
      0, -35, 0,
    );

    // Tail
    pushVertex(
      0, -25, -80,
      0, 25, -80,
      0, 0, -40,
    );
  }

  for (let v = 0; v < triangles * 3; v++) {
    const i = ~~(v / 3); // divde and floor vertexes in groups of 3 -> head, body, tail

    const x = (i % WIDTH) / WIDTH;
    const y = ~~(i / WIDTH) / WIDTH;

    // COLOR0 - ok only with shader mod
    // var c = new THREE.Color(0x444444 + ~ ~(v / 9) / FISHES * 0x666666);

    // this // // COLOR1 - white blue-ish
    const c = new THREE.Color(0xbbbbbb + (~~(v / 9) / 256) * 0xffffff);

    // // COLOR1 - white yellowish
    // var c = new THREE.Color(0xffffff + ~ ~(v / 9) / 8 * 0xffffff);

    // // COLOR2 - fucsia purple, GREENBLUE WEIRD
    // var c = new THREE.Color(0x010101 +
    // ~ ~(v / 9) / 16 * 0xffffff // ~ ~(v / 9) / 4096 * 0x1f1f1f
    // );

    // //WHITE YELLOW WEIRD, MOLTO BELLO, 2 ,3
    // var c = new THREE.Color(
    // ~ ~(v / 9) % FISHES * 0xffffff // ~ ~(v / 3) / FISHES * 0xffffff  // ~ ~(v) * 128 * 0xffffff // ~ ~(v / 9) / 4096 * thisColor
    // );

    fishColors.array[v * 3 + 0] = c.r;
    fishColors.array[v * 3 + 1] = c.g;
    fishColors.array[v * 3 + 2] = c.b;

    references.array[v * 2] = x;
    references.array[v * 2 + 1] = y;

    fishVertex.array[v] = v % 9;
  }

  this.scale(0.2, 0.2, 0.2);
};

FishGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);


let container;
let camera; let scene; let renderer; let audioLoader; let
  listener;
let mouseX = 0; let
  mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const BOUNDS = 1200; const
  BOUNDS_HALF = BOUNDS / 2; // 800

let last = performance.now();

let gpuCompute;
let velocityVariable;
let positionVariable;
let positionUniforms;
let velocityUniforms;
let fishUniforms;


let music;
let backgroundNoise;


let cube;


init();
animate();

function init() {
  container = document.createElement('div');
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.z = 350;// 350;

  scene = new THREE.Scene(); 2;
  scene.background = new THREE.Color(0x006080);// GOOD: (0x006994);//darker 004060


  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  initAudio();

  initComputeRenderer();

  initControls();

  window.addEventListener('resize', onWindowResize, false);


  const effectController = {
    separation: 10.0, // 20.0
    alignment: 80.0, // 20.0
    cohesion: 10.0, // 20.0
  };

  // createTestFloor();

  initFishes();

  initPostprocessing(window.innerWidth, window.innerHeight);
}


function initAudio() {
  // load a sound and set it as the Audio object's buffer
  audioLoader = new THREE.AudioLoader();
  listener = new THREE.AudioListener();
  camera.add(listener);

  music = new THREE.Audio(listener);

  audioLoader.load('audio/musicLoop.mp3', (buffer) => {
    music.setBuffer(buffer);
    music.setLoop(true);
    music.setVolume(1);
    musicReady = true;
    // music.play();
  });

  backgroundNoise = new THREE.Audio(listener);

  audioLoader.load('audio/fishTank.mp3', (buffer) => {
    backgroundNoise.setBuffer(buffer);
    backgroundNoise.setLoop(true);
    backgroundNoise.setVolume(0.3);
    soundReady = true;
    // music.play();
  });
}


// ////////////// GODRAYS FUNCTIONS  //////////////////
function initPostprocessing(renderTargetWidth, renderTargetHeight) {
  postprocessing.scene = new THREE.Scene();

  postprocessing.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
  postprocessing.camera.position.z = 100;

  postprocessing.scene.add(postprocessing.camera);

  const pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
  postprocessing.rtTextureColors = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, pars);

  postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, pars);
  postprocessing.rtTextureDepthMask = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, pars);

  // The ping-pong render targets can use an adjusted resolution to minimize cost

  const adjustedWidth = renderTargetWidth * godrayRenderTargetResolutionMultiplier;
  const adjustedHeight = renderTargetHeight * godrayRenderTargetResolutionMultiplier;
  postprocessing.rtTextureGodRays1 = new THREE.WebGLRenderTarget(adjustedWidth, adjustedHeight, pars);
  postprocessing.rtTextureGodRays2 = new THREE.WebGLRenderTarget(adjustedWidth, adjustedHeight, pars);

  // god-ray shaders

  const godraysMaskShader = GodRaysDepthMaskShader;
  postprocessing.godrayMaskUniforms = THREE.UniformsUtils.clone(godraysMaskShader.uniforms);
  postprocessing.materialGodraysDepthMask = new THREE.ShaderMaterial({

    uniforms: postprocessing.godrayMaskUniforms,
    vertexShader: godraysMaskShader.vertexShader,
    fragmentShader: godraysMaskShader.fragmentShader,

  });

  const godraysGenShader = GodRaysGenerateShader;
  postprocessing.godrayGenUniforms = THREE.UniformsUtils.clone(godraysGenShader.uniforms);
  postprocessing.materialGodraysGenerate = new THREE.ShaderMaterial({

    uniforms: postprocessing.godrayGenUniforms,
    vertexShader: godraysGenShader.vertexShader,
    fragmentShader: godraysGenShader.fragmentShader,

  });

  const godraysCombineShader = GodRaysCombineShader;
  postprocessing.godrayCombineUniforms = THREE.UniformsUtils.clone(godraysCombineShader.uniforms);
  postprocessing.materialGodraysCombine = new THREE.ShaderMaterial({

    uniforms: postprocessing.godrayCombineUniforms,
    vertexShader: godraysCombineShader.vertexShader,
    fragmentShader: godraysCombineShader.fragmentShader,

  });


  postprocessing.godrayCombineUniforms.fGodRayIntensity.value = 0.75;

  postprocessing.quad = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(1.0, 1.0),
    postprocessing.materialGodraysGenerate,
  );
  postprocessing.quad.position.z = -9900;
  postprocessing.scene.add(postprocessing.quad);
}

function getStepSize(filterLen, tapsPerPass, pass) {
  return filterLen * Math.pow(tapsPerPass, -pass);
}

function filterGodRays(inputTex, renderTarget, stepSize) {
  postprocessing.scene.overrideMaterial = postprocessing.materialGodraysGenerate;

  postprocessing.godrayGenUniforms.fStepSize.value = stepSize;
  postprocessing.godrayGenUniforms.tInput.value = inputTex;

  renderer.setRenderTarget(renderTarget);
  renderer.render(postprocessing.scene, postprocessing.camera);
  postprocessing.scene.overrideMaterial = null;
}

function renderFX() {
  const time = Date.now() / 4000;


  if (postprocessing.enabled) {
    // Find the screenspace position of the sun

    screenSpacePosition.copy(sunPosition).project(camera);

    screenSpacePosition.x = (screenSpacePosition.x + 1) / 2;
    screenSpacePosition.y = (screenSpacePosition.y + 1) / 2;

    // Give it to the god-ray and sun shaders

    postprocessing.godrayGenUniforms.vSunPositionScreenSpace.value.x = screenSpacePosition.x;
    postprocessing.godrayGenUniforms.vSunPositionScreenSpace.value.y = screenSpacePosition.y;


    // -- Draw scene objects --

    // Colors

    scene.overrideMaterial = null;
    renderer.setRenderTarget(postprocessing.rtTextureColors);
    renderer.render(scene, camera);


    postprocessing.godrayMaskUniforms.tInput.value = postprocessing.rtTextureDepth.texture;

    postprocessing.scene.overrideMaterial = postprocessing.materialGodraysDepthMask;
    renderer.setRenderTarget(postprocessing.rtTextureDepthMask);
    renderer.render(postprocessing.scene, postprocessing.camera);

    // -- Render god-rays --

    // Maximum length of god-rays (in texture space [0,1]X[0,1])

    const filterLen = 1.0;

    // Samples taken by filter

    const TAPS_PER_PASS = 5;// 6.0;

    // Pass order could equivalently be 3,2,1 (instead of 1,2,3), which
    // would start with a small filter support and grow to large. however
    // the large-to-small order produces less objectionable aliasing artifacts that
    // appear as a glimmer along the length of the beams

    // pass 1 - render into first ping-pong target
    filterGodRays(postprocessing.rtTextureDepthMask.texture, postprocessing.rtTextureGodRays2,
      getStepSize(filterLen, TAPS_PER_PASS, 1.0));

    // pass 2 - render into second ping-pong target
    filterGodRays(postprocessing.rtTextureGodRays2.texture, postprocessing.rtTextureGodRays1,
      getStepSize(filterLen, TAPS_PER_PASS, 2.0));

    // pass 3 - 1st RT
    filterGodRays(postprocessing.rtTextureGodRays1.texture, postprocessing.rtTextureGodRays2,
      getStepSize(filterLen, TAPS_PER_PASS, 3.0));

    // final pass - composite god-rays onto colors

    postprocessing.godrayCombineUniforms.tColors.value = postprocessing.rtTextureColors.texture;
    postprocessing.godrayCombineUniforms.tGodRays.value = postprocessing.rtTextureGodRays2.texture;

    postprocessing.scene.overrideMaterial = postprocessing.materialGodraysCombine;

    renderer.setRenderTarget(null);
    renderer.render(postprocessing.scene, postprocessing.camera);
    postprocessing.scene.overrideMaterial = null;
  } else {
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
  }
}
// ///////////////////////


function initComputeRenderer() {
  gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

  const dtPosition = gpuCompute.createTexture();
  const dtVelocity = gpuCompute.createTexture();
  fillPositionTexture(dtPosition);
  fillVelocityTexture(dtVelocity);

  velocityVariable = gpuCompute.addVariable('textureVelocity', fragmentShaderVelocity, dtVelocity);
  positionVariable = gpuCompute.addVariable('texturePosition', fragmentShaderPosition, dtPosition);

  gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);
  gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);

  positionUniforms = positionVariable.material.uniforms;
  velocityUniforms = velocityVariable.material.uniforms;

  positionUniforms.time = { value: 0.0 };
  positionUniforms.delta = { value: 0.0 };
  velocityUniforms.time = { value: 1.0 };
  velocityUniforms.delta = { value: 0.0 };
  velocityUniforms.separationDistance = { value: 20 }; // { value: 1.0 };
  velocityUniforms.alignmentDistance = { value: 20 }; // { value: 1.0 };
  velocityUniforms.cohesionDistance = { value: 50 }; // { value: 1.0 };
  velocityUniforms.predator = { value: new THREE.Vector3() };
  velocityUniforms.predatorCoeff = { value: 0.0 };
  velocityVariable.material.defines.BOUNDS = BOUNDS.toFixed(2);

  velocityVariable.wrapS = THREE.RepeatWrapping;
  velocityVariable.wrapT = THREE.RepeatWrapping;
  positionVariable.wrapS = THREE.RepeatWrapping;
  positionVariable.wrapT = THREE.RepeatWrapping;

  const error = gpuCompute.init();
  if (error !== null) {
    console.error(error);
  }
}

function fillPositionTexture(texture) {
  const theArray = texture.image.data;

  for (let k = 0, kl = theArray.length; k < kl; k += 4) {
    const x = Math.random() * BOUNDS - BOUNDS_HALF;
    const y = Math.random() * BOUNDS - BOUNDS_HALF;
    const z = Math.random() * BOUNDS - BOUNDS_HALF;

    theArray[k + 0] = x;
    theArray[k + 1] = y;
    theArray[k + 2] = z;
    theArray[k + 3] = 1;
  }
}

function fillVelocityTexture(texture) {
  const theArray = texture.image.data;

  for (let k = 0, kl = theArray.length; k < kl; k += 4) {
    const x = Math.random() - 0.5;
    const y = Math.random() - 0.5;
    const z = Math.random() - 0.5;

    theArray[k + 0] = x * 10;
    theArray[k + 1] = y * 10;
    theArray[k + 2] = z * 10;
    theArray[k + 3] = 1;
  }
}

function initControls() {
  document.addEventListener('mousemove', onDocumentMouseMove, false);
  document.addEventListener('touchstart', onDocumentTouchStart, false);
  document.addEventListener('touchmove', onDocumentTouchMove, false);

  document.addEventListener('contextmenu', preventBehavior, false);
  document.addEventListener('touchmove', preventBehavior, { passive: false });

  // Listen for mousedown
  document.addEventListener('mousedown', (e) => {
    switch (e.button) {
      case 0: // Primary button ("left")
        onDocumentMouseLeftClick();
        break;
      case 2: // Secondary button ("right")
        onDocumentMouseRightClick();
        break;
      default:
        break;
    }
  }, false);

  document.addEventListener('mouseup', (e) => {
    velocityUniforms.predatorCoeff = { value: 0.0 };
  }, false);

  document.addEventListener('touchend', (e) => {
    velocityUniforms.predatorCoeff = { value: 0.0 };
  }, false);
}

function preventBehavior(e) {
  e.preventDefault();
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

function onDocumentMouseLeftClick(event) {
  velocityUniforms.predatorCoeff = { value: -1.0 };
}

function onDocumentMouseRightClick(event) {
  velocityUniforms.predatorCoeff = { value: 1.0 };
}

function onDocumentTouchStart(event) {
  if (event.touches.length === 1) {
    event.preventDefault();

    mouseX = event.touches[0].pageX - windowHalfX;
    mouseY = event.touches[0].pageY - windowHalfY;

    velocityUniforms.predatorCoeff = { value: -1.0 };
  } else if (event.touches.length > 1) {
    event.preventDefault();

    mouseX = ((event.touches[0].pageX + event.touches[1].pageX) / 2) - windowHalfX;
    mouseY = ((event.touches[0].pageY + event.touches[1].pageY) / 2) - windowHalfY;

    velocityUniforms.predatorCoeff = { value: 1.0 };
  }
}

function onDocumentTouchMove(event) {
  if (event.touches.length === 1) {
    event.preventDefault();

    mouseX = event.touches[0].pageX - windowHalfX;
    mouseY = event.touches[0].pageY - windowHalfY;

    velocityUniforms.predatorCoeff = { value: -1.0 };
  } else if (event.touches.length > 1) {
    event.preventDefault();

    mouseX = ((event.touches[0].pageX + event.touches[1].pageX) / 2) - windowHalfX;
    mouseY = ((event.touches[0].pageY + event.touches[1].pageY) / 2) - windowHalfY;

    velocityUniforms.predatorCoeff = { value: 1.0 };
  }
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createTestFloor() {
  cube = addTestCubeToScene(500, 1, 500, 0, -150, 0, new THREE.MeshLambertMaterial({ color: 0x00ccff }), scene);
}

function initFishes() {
  const geometry = new FishGeometry(new THREE.Color(Math.random() * 0xffffff));// 0x41c30e));

  // For Vertex and Fragment
  fishUniforms = {
    color: { value: new THREE.Color(0xffffff) }, // THREE.Color(Math.random() * 0xffffff)
    texturePosition: { value: null },
    textureVelocity: { value: null },
    time: { value: 1.0 },
    delta: { value: 0.0 },
  };

  // THREE.ShaderMaterial
  const material = new THREE.ShaderMaterial({
    uniforms: fishUniforms,
    vertexShader: fishVS,
    fragmentShader: fishFS,
    side: THREE.DoubleSide,

  });

  const fishMesh = new THREE.Mesh(geometry, material);
  fishMesh.rotation.y = Math.PI / 2;
  fishMesh.matrixAutoUpdate = false;
  fishMesh.updateMatrix();

  scene.add(fishMesh);
}


function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  updateFishes();

  // overwrite mouse value to disable free fishes if user did not perform further action
  mouseX = 10000;
  mouseY = 10000;

  gpuCompute.compute();

  updateFishesUniforms();

  // renderer.render(scene, camera);
  renderFX();
}

// UPDATE FUNCTIONS

function updateFishes() {
  const now = performance.now();
  let delta = (now - last) / 1000;

  if (delta > 1) delta = 1; // safety cap on large deltas
  last = now;

  positionUniforms.time.value = now;
  positionUniforms.delta.value = delta;
  velocityUniforms.time.value = now;
  velocityUniforms.delta.value = delta;
  fishUniforms.time.value = now;
  fishUniforms.delta.value = delta;

  velocityUniforms.predator.value.set(0.5 * mouseX / windowHalfX, -0.5 * mouseY / windowHalfY, 0);
}

function updateFishesUniforms() {
  fishUniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
  fishUniforms.textureVelocity.value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
}
