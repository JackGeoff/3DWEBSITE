console.log("Three.js Loaded:", typeof THREE);

gsap.registerPlugin(ScrollTrigger);

// ------------------ SMOOTH SCROLL + GSAP SETUP ------------------
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ------------------ THREE.JS SCENE SETUP ------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfefdfd);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0xffffff, 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.5;

document.querySelector(".model").appendChild(renderer.domElement);

// ------------------ LOAD 3D MODEL ------------------
let model;
const loader = new THREE.GLTFLoader();

loader.load(
  "assets/josta.glb",
  function (gltf) {
    model = gltf.scene;

    model.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material.metalness = 0.3;
        node.material.roughness = 0.4;
        node.material.envMapIntensity = 1.5;
      }
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    scene.add(model);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.z = maxDim * 1.5;

    model.scale.set(0, 0, 0);
    playInitialAnimation();

    animate();
  },
  undefined,
  function (err) {
    console.error("GLB Load Error:", err);
  }
);

// ------------------ FLOATING & ANIMATION VARIABLES ------------------
const floatAmplitude = 0.2;
const floatSpeed = 1.5;
const rotationSpeed = 0.3;

let isFloating = true;
let currentScroll = 0;

const stickyHeight = window.innerHeight;
const scannerSection = document.querySelector(".scanner");
const scannerPosition = scannerSection.offsetTop;
const scanContainer = document.querySelector(".scan-container");
const scanSound = new Audio("assets/scan-audio.mp3");

gsap.set(scanContainer, { scale: 0 });

function playInitialAnimation() {
  if (model) {
    gsap.to(model.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1,
      ease: "power2.out",
    });
  }
  gsap.to(scanContainer, { scale: 1, duration: 1, ease: "power2.out" });
}

// ------------------ SCROLLTRIGGER HANDLERS ------------------
ScrollTrigger.create({
  trigger: "body",
  start: "top top",
  end: "top -10",
  onEnterBack: () => {
    if (model) {
      gsap.to(model.scale, {
        x: 1, y: 1, z: 1,
        duration: 1, ease: "power2.out",
      });
      isFloating = true;
    }
    gsap.to(scanContainer, { scale: 1, duration: 1, ease: "power2.out" });
  },
});

ScrollTrigger.create({
  trigger: ".scanner",
  start: "top top",
  end: `${stickyHeight}px`,
  pin: true,
  onEnter: () => {
    if (!model) return;

    isFloating = false;
    model.position.y = 0;

    setTimeout(() => {
      scanSound.currentTime = 0;
      scanSound.play();
    }, 500);

    gsap.to(model.rotation, {
      y: model.rotation.y + Math.PI * 2,
      duration: 1,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.to(model.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            gsap.to(scanContainer, {
              scale: 0,
              duration: 0.5,
              ease: "power2.in",
            });
          },
        });
      },
    });
  },
  onLeaveBack: () => {
    gsap.set(scanContainer, { scale: 0 });
    gsap.to(scanContainer, { scale: 1, duration: 1, ease: "power2.out" });
  },
});

// ------------------ LISTEN TO LENIS SCROLL ------------------
lenis.on("scroll", (e) => {
  currentScroll = e.scroll;
});

// ------------------ RENDER LOOP ------------------
function animate() {
  if (model) {
    if (isFloating) {
      const floatOffset =
        Math.sin(Date.now() * 0.001 * floatSpeed) * floatAmplitude;
      model.position.y = floatOffset;
    }

    const scrollProgress = Math.min(currentScroll / scannerPosition, 1);
    if (scrollProgress < 1) {
      model.rotation.x = scrollProgress * Math.PI * 2;
      model.rotation.y += 0.001 * rotationSpeed;
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ------------------ RESIZE HANDLER ------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
