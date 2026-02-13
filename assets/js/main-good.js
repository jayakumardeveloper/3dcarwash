import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

gsap.registerPlugin(ScrollTrigger);

let scene, camera, renderer, model, radius;
const target = new THREE.Vector3(0, 0, 0);
const screenMove = { x: 0, y: 0 };

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 2000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // document.body.appendChild(renderer.domElement);
  document.querySelector('.main-content').appendChild(renderer.domElement);

  // Add cursor style and mouse events
  renderer.domElement.style.cursor = 'grab';
  addMouseEvents();

  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const d = new THREE.DirectionalLight(0xffffff, 4);
  d.position.set(5, 10, 10);
  scene.add(d);

  new RGBELoader().load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/venice_sunset_1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
  });

  new GLTFLoader().load('models/scene.gltf', (gltf) => {
    model = gltf.scene;
    scene.add(model);

    radius = autoFit(model);

    // ⭐ store the TRUE centered position after autofit
    model.userData.basePosition = model.position.clone();

    createScrollAnimation();
  });

  window.addEventListener('resize', onResize);
}

function autoFit(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  object.position.sub(center);

  const max = Math.max(size.x, size.y, size.z);
  const dist = max * 2.2;

  camera.position.set(3, dist * 0.2, dist-5);
  camera.lookAt(0, 0, 0);

  return dist;
}

/* ⭐ convert screen % to world units based on camera */
function screenToWorldOffset(percentX, percentY) {
  const distance = camera.position.distanceTo(target);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const height = 2 * Math.tan(vFov / 2) * distance;
  const width = height * camera.aspect;

  return {
    worldX: width * percentX,
    worldY: height * percentY,
  };
}

/* ⭐ move model RELATIVE to its real center */
function moveModelScreen(percentX, percentY) {
  const { worldX, worldY } = screenToWorldOffset(percentX, percentY);

  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();

  camera.getWorldDirection(camRight);
  camRight.cross(camera.up).normalize();
  camUp.copy(camera.up).normalize();

  const offset = new THREE.Vector3().add(camRight.multiplyScalar(worldX)).add(camUp.multiplyScalar(worldY));

  const finalPos = model.userData.basePosition.clone().add(offset);

  model.position.copy(finalPos);
}

function createScrollAnimation() {
  // Initial Position: Right side
  screenMove.x = 0;
  screenMove.y = 0;

  const tl = gsap.timeline({
    scrollTrigger: {
      // trigger: document.body,
      trigger: document.querySelector('.main-content'),
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
    },
  });

  // Section 1 -> 2 (Front to Side) | Car: Right -> Center
  tl.to(
    camera.position,
    {
      x: -radius,
      y: radius * 0.2,
      z: 0,
      duration: 1,
      ease: 'power1.inOut',
    },
    's1'
  ).to(
    screenMove,
    {
      x: 0.2,
      y: 0,
      duration: 1,
      ease: 'power1.inOut',
    },
    's1'
  );

  // Section 2 -> 3 (Side to Top) | Car: Center -> Left
  tl.to(
    camera.position,
    {
      x: 0,
      y: radius,
      z: 0.1,
      duration: 1,
      ease: 'power1.inOut',
    },
    's2'
  ).to(
    screenMove,
    {
      x: -0.3,
      y: 0,
      duration: 1,
      ease: 'power1.inOut',
    },
    's2'
  );

  // Section 3 -> 4 (Top to Cinematic) | Car: Left -> Right
  tl.to(
    camera.position,
    {
      x: radius * 0.65,
      y: radius * 0.5,
      z: radius * -0.05,
      duration: 1,
      ease: 'power1.inOut',
    },
    's3'
  ).to(
    screenMove,
    {
      x: 0.2,
      y: 0,
      duration: 1,
      ease: 'power1.inOut',
    },
    's3'
  );
  tl.to(
    camera.position,
    {
      x: radius * 0.9,
      y: radius * 0.5,
      z: radius,
      duration: 1,
      ease: 'power1.inOut',
    },
    's4'
  ).to(
    screenMove,
    {
      x: 0.3,
      y: 0.15,
      duration: 1,
      ease: 'power1.inOut',
    },
    's4'
  );
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  camera.lookAt(target);
  if (model) moveModelScreen(screenMove.x, screenMove.y);
  renderer.render(scene, camera);
}

function addMouseEvents() {
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  renderer.domElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    renderer.domElement.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    renderer.domElement.style.cursor = 'grab';
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging && model) {
      const deltaX = e.clientX - previousMousePosition.x;
      model.rotation.y += deltaX * 0.005;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  });
}
