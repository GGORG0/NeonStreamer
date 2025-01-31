import "./style.css";
import mqtt, { MqttClient } from "mqtt";
import { Buffer } from "buffer";

const startButton = document.querySelector<HTMLButtonElement>("#start")!;
const brokerAddrEl = document.querySelector<HTMLInputElement>("#brokeraddr")!;
const topicEl = document.querySelector<HTMLInputElement>("#topic")!;
const frameDelayEl = document.querySelector<HTMLInputElement>("#frame-delay")!;

const mqttStatusEl = document.querySelector<HTMLDivElement>("#mqtt-status")!;
const frameTimeEl = document.querySelector<HTMLDivElement>("#frame-time")!;

const canvasEl = document.querySelector<HTMLCanvasElement>("#canvas")!;
const ctx = canvasEl.getContext("2d")!;

const tempCanvas = document.createElement("canvas");
const tempCtx = tempCanvas.getContext("2d")!;

const videoEl = document.querySelector<HTMLVideoElement>("#video")!;

let mqttClient: MqttClient | null = null;
let isRunning = false;

function convertCanvas16Bit(xres: number, yres: number) {
  let imgData = ctx.getImageData(0, 0, xres, yres);
  let pixels = imgData.data;

  let buff = new Uint8Array(xres * yres * 2);

  for (let y = 0; y < yres; y++) {
    const rowOffset = y * xres;

    for (let x = 0; x < xres; x++) {
      const pixelOffset = (x + rowOffset) * 4;

      // RGB565
      const r = pixels[pixelOffset + 0] >> 3;
      const g = pixels[pixelOffset + 1] >> 2;
      const b = pixels[pixelOffset + 2] >> 3;

      const packed = (r << 11) | (g << 5) | b;

      const byteOffset = (x + rowOffset) * 2;
      buff[byteOffset] = packed & 255;
      buff[byteOffset + 1] = packed >> 8;
    }
  }

  return buff;
}

function captureVideoFrame() {
  const targetWidth = canvasEl.width;
  const targetHeight = canvasEl.height;

  tempCanvas.width = videoEl.videoWidth;
  tempCanvas.height = videoEl.videoHeight;

  tempCtx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);

  ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
}

async function videoCB() {
  if (!isRunning) {
    return;
  }

  if (!mqttClient) {
    throw new Error("Missing mqttClient");
  }

  const start = performance.now();

  captureVideoFrame();

  const buff = convertCanvas16Bit(canvasEl.width, canvasEl.height);

  mqttClient.publish(topicEl.value, Buffer.from(buff));

  const end = performance.now();

  frameTimeEl.textContent = (end - start).toFixed(2);

  setTimeout(() => {
    videoEl.requestVideoFrameCallback(videoCB);
  }, frameDelayEl.valueAsNumber);
}

function connectMQTT() {
  if (mqttClient) {
    mqttClient.end();
  }

  console.log(`connecting to mqtt at ${brokerAddrEl.value}`);
  mqttStatusEl.textContent = "Connecting...";

  mqttStatusEl.classList.remove("disconnected");
  mqttStatusEl.classList.remove("connected");
  mqttStatusEl.classList.add("connecting");

  mqttClient = mqtt.connect(brokerAddrEl.value);

  mqttClient.on("connect", () => {
    console.log("mqtt connected");
    mqttStatusEl.textContent = "Connected";

    mqttStatusEl.classList.remove("disconnected");
    mqttStatusEl.classList.remove("connecting");
    mqttStatusEl.classList.add("connected");

    videoEl.requestVideoFrameCallback(videoCB);
  });

  mqttClient.on("error", (err) => {
    console.error(err);
    mqttStatusEl.textContent = `Error: ${err.message}`;

    mqttStatusEl.classList.remove("connected");
    mqttStatusEl.classList.remove("connecting");
    mqttStatusEl.classList.add("disconnected");
  });
}

async function startCapture() {
  if (!isRunning) {
    return;
  }

  console.log("requesting video stream");

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  videoEl.srcObject = stream;

  connectMQTT();
}

document.querySelector("#start")?.addEventListener("click", () => {
  isRunning = !isRunning;
  startButton.textContent = isRunning ? "Stop" : "Start";

  if (isRunning) {
    startCapture();
  } else {
    videoEl.pause();
    location.reload();
  }
});

brokerAddrEl.addEventListener("change", () => {
  localStorage.setItem("brokeraddr", brokerAddrEl.value);
});

topicEl.addEventListener("change", () => {
  localStorage.setItem("topic", topicEl.value);
});

frameDelayEl.addEventListener("change", () => {
  localStorage.setItem("frame-delay", frameDelayEl.value);
});

document.addEventListener("DOMContentLoaded", () => {
  brokerAddrEl.value = localStorage.getItem("brokeraddr") || "";
  topicEl.value = localStorage.getItem("topic") || "frame";
  frameDelayEl.value = localStorage.getItem("frame-delay") || "100";
});
