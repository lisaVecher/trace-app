const camera = document.getElementById("camera");
const imageInput = document.getElementById("imageInput");
const overlayImage = document.getElementById("overlayImage");
const canvas = document.getElementById("canvas");

const controls = document.getElementById("controls");
const toggleControls = document.getElementById("toggleControls");
const hideControlsButton = document.getElementById("hideControlsButton");

const opacityControl = document.getElementById("opacityControl");
const scaleControl = document.getElementById("scaleControl");
const rotateControl = document.getElementById("rotateControl");

const softSketchButton = document.getElementById("softSketchButton");
const strongSketchButton = document.getElementById("strongSketchButton");
const blackWhiteButton = document.getElementById("blackWhiteButton");
const lineOnlyButton = document.getElementById("lineOnlyButton");
const highContrastButton = document.getElementById("highContrastButton");
const originalButton = document.getElementById("originalButton");

const flipHorizontalButton = document.getElementById("flipHorizontalButton");
const flipVerticalButton = document.getElementById("flipVerticalButton");

const lockButton = document.getElementById("lockButton");
const traceModeButton = document.getElementById("traceModeButton");
const exitTraceModeButton = document.getElementById("exitTraceModeButton");

const traceInstruction = document.getElementById("traceInstruction");
const closeInstructionButton = document.getElementById(
  "closeInstructionButton",
);

let originalImageUrl = null;
let currentImageDataUrl = null;

let scale = 1;
let rotation = 0;
let opacity = 0.55;

let flipX = 1;
let flipY = 1;

let posX = window.innerWidth / 2;
let posY = window.innerHeight / 2;

let isDragging = false;
let isLocked = false;
let startX = 0;
let startY = 0;

let threeFingerTapTimes = [];

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
      },
      audio: false,
    });

    camera.srcObject = stream;
  } catch (error) {
    alert("Не вдалося отримати доступ до камери.");
    console.error(error);
  }
}

function updateImageTransform() {
  overlayImage.style.left = `${posX}px`;
  overlayImage.style.top = `${posY}px`;
  overlayImage.style.opacity = opacity;

  overlayImage.style.transform = `
    translate(-50%, -50%)
    scale(${scale * flipX}, ${scale * flipY})
    rotate(${rotation}deg)
  `;

  saveState();
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    originalImageUrl = reader.result;
    currentImageDataUrl = reader.result;

    overlayImage.src = currentImageDataUrl;
    overlayImage.style.display = "block";

    posX = window.innerWidth / 2;
    posY = window.innerHeight / 2;

    scale = 1;
    rotation = 0;
    opacity = 0.55;
    flipX = 1;
    flipY = 1;
    isLocked = false;

    scaleControl.value = scale;
    rotateControl.value = rotation;
    opacityControl.value = opacity;
    lockButton.textContent = "Зафіксувати фото";

    updateImageTransform();
    saveState();
  };

  reader.readAsDataURL(file);
});

opacityControl.addEventListener("input", () => {
  opacity = Number(opacityControl.value);
  updateImageTransform();
});

scaleControl.addEventListener("input", () => {
  scale = Number(scaleControl.value);
  updateImageTransform();
});

rotateControl.addEventListener("input", () => {
  rotation = Number(rotateControl.value);
  updateImageTransform();
});

flipHorizontalButton.addEventListener("click", () => {
  flipX *= -1;
  updateImageTransform();
});

flipVerticalButton.addEventListener("click", () => {
  flipY *= -1;
  updateImageTransform();
});

overlayImage.addEventListener("pointerdown", (event) => {
  if (isLocked) return;

  isDragging = true;
  startX = event.clientX - posX;
  startY = event.clientY - posY;

  overlayImage.setPointerCapture(event.pointerId);
});

overlayImage.addEventListener("pointermove", (event) => {
  if (!isDragging || isLocked) return;

  posX = event.clientX - startX;
  posY = event.clientY - startY;

  updateImageTransform();
});

overlayImage.addEventListener("pointerup", () => {
  isDragging = false;
});

overlayImage.addEventListener("pointercancel", () => {
  isDragging = false;
});

lockButton.addEventListener("click", () => {
  isLocked = !isLocked;

  lockButton.textContent = isLocked ? "Розблокувати фото" : "Зафіксувати фото";

  saveState();
});

originalButton.addEventListener("click", () => {
  if (!originalImageUrl) return;

  currentImageDataUrl = originalImageUrl;
  overlayImage.src = currentImageDataUrl;

  saveState();
});

softSketchButton.addEventListener("click", () => {
  createSketch("soft");
});

strongSketchButton.addEventListener("click", () => {
  createSketch("strong");
});

blackWhiteButton.addEventListener("click", () => {
  createSketch("blackWhite");
});

lineOnlyButton.addEventListener("click", () => {
  createSketch("lineOnly");
});

highContrastButton.addEventListener("click", () => {
  createSketch("highContrast");
});

function createSketch(mode) {
  if (!originalImageUrl) {
    alert("Спочатку обери фото.");
    return;
  }

  const img = new Image();

  img.onload = () => {
    const ctx = canvas.getContext("2d");

    const maxSize = 1200;
    let width = img.width;
    let height = img.height;

    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    if (mode === "blackWhite") {
      applyBlackWhite(data);
      ctx.putImageData(imageData, 0, 0);
      setCanvasAsOverlay();
      return;
    }

    if (mode === "highContrast") {
      applyHighContrast(data);
      ctx.putImageData(imageData, 0, 0);
      setCanvasAsOverlay();
      return;
    }

    if (mode === "soft") {
      createEdgeImage(ctx, width, height, 90, false);
      return;
    }

    if (mode === "strong") {
      createEdgeImage(ctx, width, height, 45, false);
      return;
    }

    if (mode === "lineOnly") {
      createEdgeImage(ctx, width, height, 55, true);
      return;
    }
  };

  img.src = originalImageUrl;
}

function setCanvasAsOverlay() {
  currentImageDataUrl = canvas.toDataURL("image/png");
  overlayImage.src = currentImageDataUrl;
  saveState();
}

function applyBlackWhite(data) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

function applyHighContrast(data) {
  for (let i = 0; i < data.length; i += 4) {
    let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    gray = gray > 135 ? 255 : 0;

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

function createEdgeImage(ctx, width, height, threshold, lineOnly) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const gray = [];

  for (let i = 0; i < data.length; i += 4) {
    const value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray.push(value);
  }

  const output = ctx.createImageData(width, height);
  const outputData = output.data;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;

      const gx =
        -gray[index - width - 1] +
        gray[index - width + 1] -
        2 * gray[index - 1] +
        2 * gray[index + 1] -
        gray[index + width - 1] +
        gray[index + width + 1];

      const gy =
        -gray[index - width - 1] -
        2 * gray[index - width] -
        gray[index - width + 1] +
        gray[index + width - 1] +
        2 * gray[index + width] +
        gray[index + width + 1];

      const magnitude = Math.sqrt(gx * gx + gy * gy);

      let color;

      if (lineOnly) {
        color = magnitude > threshold ? 0 : 255;
      } else {
        color = magnitude > threshold ? 25 : 255;
      }

      const pixelIndex = index * 4;

      outputData[pixelIndex] = color;
      outputData[pixelIndex + 1] = color;
      outputData[pixelIndex + 2] = color;
      outputData[pixelIndex + 3] = 255;
    }
  }

  ctx.putImageData(output, 0, 0);
  setCanvasAsOverlay();
}

toggleControls.addEventListener("click", () => {
  controls.classList.toggle("hidden");

  toggleControls.textContent = controls.classList.contains("hidden")
    ? "☰ Меню"
    : "✕ Закрити";
});

hideControlsButton.addEventListener("click", () => {
  controls.classList.add("hidden");
  toggleControls.textContent = "☰ Меню";
});

traceModeButton.addEventListener("click", () => {
  enterTraceMode();
});

exitTraceModeButton.addEventListener("click", () => {
  exitTraceMode();
});

function enterTraceMode() {
  controls.classList.add("hidden");
  toggleControls.classList.add("hidden");
  exitTraceModeButton.classList.remove("hidden");

  isLocked = true;
  opacity = 0.45;
  opacityControl.value = opacity;

  updateImageTransform();

  if (!sessionStorage.getItem("traceInstructionClosed")) {
    traceInstruction.classList.remove("hidden");
  }
}

function exitTraceMode() {
  controls.classList.remove("hidden");
  toggleControls.classList.remove("hidden");
  exitTraceModeButton.classList.add("hidden");
  traceInstruction.classList.add("hidden");

  isLocked = false;
  lockButton.textContent = "Зафіксувати фото";

  updateImageTransform();
}

closeInstructionButton.addEventListener("click", () => {
  traceInstruction.classList.add("hidden");
  sessionStorage.setItem("traceInstructionClosed", "true");
});

document.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 3) return;

  const now = Date.now();

  threeFingerTapTimes.push(now);

  threeFingerTapTimes = threeFingerTapTimes.filter((time) => {
    return now - time < 1600;
  });

  if (threeFingerTapTimes.length >= 3) {
    threeFingerTapTimes = [];

    if (!exitTraceModeButton.classList.contains("hidden")) {
      exitTraceMode();
    }
  }
});

function saveState() {
  if (!currentImageDataUrl) return;

  const state = {
    currentImageDataUrl,
    originalImageUrl,
    scale,
    rotation,
    opacity,
    flipX,
    flipY,
    posX,
    posY,
    isLocked,
  };

  sessionStorage.setItem("traceCamState", JSON.stringify(state));
}

function loadState() {
  const savedState = sessionStorage.getItem("traceCamState");

  if (!savedState) return;

  try {
    const state = JSON.parse(savedState);

    currentImageDataUrl = state.currentImageDataUrl;
    originalImageUrl = state.originalImageUrl;

    scale = state.scale ?? 1;
    rotation = state.rotation ?? 0;
    opacity = state.opacity ?? 0.55;
    flipX = state.flipX ?? 1;
    flipY = state.flipY ?? 1;
    posX = state.posX ?? window.innerWidth / 2;
    posY = state.posY ?? window.innerHeight / 2;
    isLocked = state.isLocked ?? false;

    overlayImage.src = currentImageDataUrl;
    overlayImage.style.display = "block";

    scaleControl.value = scale;
    rotateControl.value = rotation;
    opacityControl.value = opacity;

    lockButton.textContent = isLocked
      ? "Розблокувати фото"
      : "Зафіксувати фото";

    updateImageTransform();
  } catch (error) {
    console.error("Не вдалося відновити стан:", error);
  }
}

loadState();
startCamera();
