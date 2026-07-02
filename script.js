const camera = document.getElementById("camera");
const imageInput = document.getElementById("imageInput");
const overlayImage = document.getElementById("overlayImage");
const canvas = document.getElementById("canvas");

const opacityControl = document.getElementById("opacityControl");
const scaleControl = document.getElementById("scaleControl");
const rotateControl = document.getElementById("rotateControl");
const edgeControl = document.getElementById("edgeControl");

const sketchButton = document.getElementById("sketchButton");
const originalButton = document.getElementById("originalButton");
const lockButton = document.getElementById("lockButton");

let originalImageUrl = null;
let currentImage = new Image();

let scale = 1;
let rotation = 0;
let opacity = 0.55;

let posX = window.innerWidth / 2;
let posY = window.innerHeight / 2;

let isDragging = false;
let isLocked = false;
let startX = 0;
let startY = 0;

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
    alert("Не вдалося отримати доступ до камери. Перевір дозвіл у браузері.");
    console.error(error);
  }
}

function updateImageTransform() {
  overlayImage.style.left = `${posX}px`;
  overlayImage.style.top = `${posY}px`;
  overlayImage.style.opacity = opacity;

  overlayImage.style.transform = `
    translate(-50%, -50%)
    scale(${scale})
    rotate(${rotation}deg)
  `;
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) return;

  originalImageUrl = URL.createObjectURL(file);

  currentImage = new Image();
  currentImage.onload = () => {
    overlayImage.src = originalImageUrl;
    overlayImage.style.display = "block";

    posX = window.innerWidth / 2;
    posY = window.innerHeight / 2;
    scale = 1;
    rotation = 0;
    opacity = 0.55;

    scaleControl.value = scale;
    rotateControl.value = rotation;
    opacityControl.value = opacity;

    updateImageTransform();
  };

  currentImage.src = originalImageUrl;
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
});

originalButton.addEventListener("click", () => {
  if (!originalImageUrl) return;

  overlayImage.src = originalImageUrl;
});

sketchButton.addEventListener("click", () => {
  if (!originalImageUrl) {
    alert("Спочатку обери фото.");
    return;
  }

  createSketch();
});

function createSketch() {
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

    const gray = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const value = 0.299 * r + 0.587 * g + 0.114 * b;
      gray.push(value);
    }

    const threshold = Number(edgeControl.value);
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

        const color = magnitude > threshold ? 0 : 255;

        const pixelIndex = index * 4;

        outputData[pixelIndex] = color;
        outputData[pixelIndex + 1] = color;
        outputData[pixelIndex + 2] = color;
        outputData[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(output, 0, 0);

    const sketchUrl = canvas.toDataURL("image/png");
    overlayImage.src = sketchUrl;
  };

  img.src = originalImageUrl;
}

startCamera();
