const el = (id) => document.getElementById(id);
const log = (event, data = {}) => {
  el("log").textContent += event + " " + JSON.stringify(data) + "\n";
};
const ms = (since) => Math.round(performance.now() - since);
const phrase = "我把十二平均分成三份，每份是四。";
const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const formats = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];
const recorderFormats = formats.filter((type) => window.MediaRecorder?.isTypeSupported(type));
log("device", {
  ua: navigator.userAgent, secure: isSecureContext, touch: navigator.maxTouchPoints,
  pixelRatio: devicePixelRatio, mediaDevices: Boolean(navigator.mediaDevices),
  recorderFormats, recognition: Boolean(Recognition),
  localRecognition: Boolean(Recognition?.available && "processLocally" in Recognition.prototype),
  synthesis: Boolean(window.speechSynthesis), pointer: Boolean(window.PointerEvent),
});

let recording;
let permissionRequest;
let clipUrl;
const clip = el("clip");

function clearClip() {
  clip.pause();
  clip.removeAttribute("src");
  clip.hidden = true;
  if (clipUrl) URL.revokeObjectURL(clipUrl);
  clipUrl = undefined;
}

function stopRecording(discard = false) {
  if (permissionRequest) permissionRequest.cancelled = true;
  if (!recording) return;
  recording.discard ||= discard;
  if (recording.recorder.state !== "inactive") recording.recorder.stop();
  recording.stream.getTracks().forEach((track) => track.stop());
  el("stop-record").disabled = true;
}

el("record").onclick = async () => {
  const started = performance.now();
  const request = { cancelled: false };
  permissionRequest = request;
  el("record").disabled = true;
  clearClip();
  let stream;
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      throw new Error("unsupported");
    }
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (request.cancelled || document.hidden) throw new Error("interrupted");
    const mimeType = recorderFormats[0];
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const session = { stream, recorder, discard: false };
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onerror = (event) => {
      log("record-error", { error: event.error?.name ?? "unknown" });
      stopRecording(true);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (!session.discard) {
        const audio = new Blob(chunks, { type: chunks.find((chunk) => chunk.type)?.type || recorder.mimeType });
        if (audio.size) {
          clipUrl = URL.createObjectURL(audio);
          clip.src = clipUrl;
          clip.hidden = false;
        }
        log("record-stop", { type: audio.type, bytes: audio.size, finalizeMs: ms(session.stoppedAt ?? started) });
      }
      recording = undefined;
      el("record").disabled = false;
      el("stop-record").disabled = true;
    };
    recorder.start();
    recording = session;
    stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => {
      log("record-interrupted", { reason: "track-ended" });
      stopRecording(true);
    }));
    el("stop-record").disabled = false;
    log("record-start", { startMs: ms(started), mime: recorder.mimeType });
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    log("record-error", { error: error.name === "Error" ? error.message : error.name, elapsedMs: ms(started) });
    el("record").disabled = false;
  } finally {
    permissionRequest = undefined;
  }
};

el("stop-record").onclick = () => {
  if (recording) recording.stoppedAt = performance.now();
  stopRecording();
};
clip.onplaying = () => log("record-playback-start");

const recognitionStatus = el("recognition-status");
const recognitionMessages = {
  "recognition-result": "识别完成。请检查结果，也可以直接输入文字。",
  "recognition-cancelled": "识别已取消，可以直接输入文字。",
  "recognition-timeout": "识别超时，可以直接输入文字。",
  "recognition-unavailable": "当前设备没有可用的普通话识别，可以直接输入文字。",
  "recognition-no-result": "没有识别到文字，可以重试或直接输入。",
  "recognition-error": "识别失败，可以重试或直接输入。",
};
let activeRecognition;
function cancelRecognition() {
  if (!activeRecognition) return;
  const { recognition, finish } = activeRecognition;
  finish("recognition-cancelled");
  try { recognition.abort(); } catch {}
}

async function recognize(local) {
  const mode = local ? "local" : "online";
  if (!Recognition) {
    recognitionStatus.textContent = recognitionMessages["recognition-unavailable"];
    return log("recognition-unavailable", { mode });
  }
  if (recording || permissionRequest || activeRecognition) {
    recognitionStatus.textContent = activeRecognition ? "正在识别，请稍候。" : "请先结束上面的录音，再开始识别。";
    return log("recognition-busy", { mode });
  }
  if (!local && !confirm("允许浏览器语音服务处理这句测试用语？")) {
    recognitionStatus.textContent = "已跳过在线识别，可以直接输入文字。";
    return;
  }
  recognitionStatus.textContent = local ? "正在检查设备端识别…" : "正在启动在线识别…";

  el("transcript").textContent = "";
  el("use-transcript").disabled = true;
  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  const started = performance.now();
  const finish = (event, data = {}) => {
    if (activeRecognition?.recognition !== recognition) return;
    clearTimeout(timeout);
    activeRecognition = undefined;
    recognitionStatus.textContent = data.error === "network"
      ? "浏览器语音服务连不上，可以直接输入文字。"
      : recognitionMessages[event];
    log(event, { mode, elapsedMs: ms(started), ...data });
  };
  const timeout = setTimeout(() => {
    finish("recognition-timeout");
    try { recognition.abort(); } catch {}
  }, 12000);
  activeRecognition = { recognition, finish };
  recognition.onstart = () => {
    recognitionStatus.textContent = "正在听，请说上面的测试短句。";
    log("recognition-start", { mode, startMs: ms(started) });
  };
  recognition.onresult = (event) => {
    if (activeRecognition?.recognition !== recognition) return;
    const result = event.results[event.resultIndex][0];
    const transcript = result.transcript.trim();
    if (!transcript) return finish("recognition-no-result");
    el("transcript").textContent = transcript;
    el("use-transcript").disabled = false;
    const normalize = (value) => value.replace(/十二/g, "12").replace(/三/g, "3")
      .replace(/四/g, "4").replace(/[\p{P}\p{Z}]/gu, "");
    finish("recognition-result", { fixtureMatch: normalize(transcript) === normalize(phrase) });
  };
  recognition.onerror = (event) => finish("recognition-error", { error: event.error });
  recognition.onend = () => finish("recognition-no-result");
  try {
    if (local) {
      if (!Recognition.available || !("processLocally" in recognition)) {
        return finish("recognition-unavailable");
      }
      const availability = await Recognition.available({ langs: ["zh-CN"], processLocally: true });
      if (activeRecognition?.recognition !== recognition) return;
      if (availability !== "available") return finish("recognition-unavailable", { availability });
      recognition.processLocally = true;
    }
    recognition.start();
  } catch (error) {
    finish("recognition-error", { error: error.name });
  }
}
el("recognize-local").onclick = () => recognize(true);
el("recognize-online").onclick = () => recognize(false);
el("use-transcript").onclick = () => {
  el("answer").value = el("transcript").textContent;
  el("answer").focus();
};

const speechStatus = el("speech-status");
const sample = el("sample");
let currentSpeech;
let speechTimer;

function stopSpeech() {
  sampleRequest++;
  currentSpeech = undefined;
  clearTimeout(speechTimer);
  window.speechSynthesis?.cancel();
  sample.pause();
  sample.currentTime = 0;
}

function speak() {
  stopSpeech();
  const synth = window.speechSynthesis;
  const voices = synth?.getVoices() ?? [];
  const voice = voices.find((entry) => /^zh(?:-Hans)?(?:-CN)?$/i.test(entry.lang) && entry.localService);
  if (!voice) {
    speechStatus.textContent = "当前没有可用的本地普通话声音。请试试预录示例。";
    return log(synth ? "speech-no-local-mandarin-voice" : "speech-unavailable", { voices: voices.length });
  }

  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.lang = "zh-CN";
  utterance.voice = voice;
  currentSpeech = utterance;
  const started = performance.now();
  const finish = (event, message, data = {}) => {
    if (currentSpeech !== utterance) return;
    currentSpeech = undefined;
    clearTimeout(speechTimer);
    speechStatus.textContent = message;
    log(event, { elapsedMs: ms(started), ...data });
  };
  utterance.onstart = () => {
    if (currentSpeech !== utterance) return;
    clearTimeout(speechTimer);
    speechStatus.textContent = "正在朗读。";
    log("speech-start", { voice: voice.name, lang: voice.lang, startMs: ms(started) });
  };
  utterance.onend = () => finish("speech-end", "朗读结束。");
  utterance.onerror = (event) => finish("speech-error", "朗读失败。请试试预录示例。", { error: event.error });
  speechStatus.textContent = "正在启动朗读…";
  speechTimer = setTimeout(() => {
    finish("speech-timeout", "朗读没有启动。请试试预录示例。");
    synth.cancel();
  }, 3000);
  synth.speak(utterance);
}

el("speak").onclick = speak;
let sampleRequest = 0;
el("play-sample").onclick = async () => {
  stopSpeech();
  const request = ++sampleRequest;
  speechStatus.textContent = "正在加载预录示例…";
  const started = performance.now();
  try {
    await sample.play();
    if (request !== sampleRequest) return;
    speechStatus.textContent = "正在播放预录示例。";
    log("sample-start", { startMs: ms(started) });
  } catch (error) {
    if (request !== sampleRequest) return;
    speechStatus.textContent = "预录示例播放失败，可以阅读短句。";
    log("sample-error", { error: error.name });
  }
};
sample.onended = () => {
  speechStatus.textContent = "预录示例播放结束。";
  log("sample-end");
};
el("stop-speak").onclick = () => {
  stopSpeech();
  speechStatus.textContent = "播放已停止。";
  log("speech-stop");
};

const canvas = el("drawing");
const ctx = canvas.getContext("2d");
let stroke;
const paths = [];

function paintPath(points) {
  if (points.length < 2) return;
  const [first, ...rest] = points;
  ctx.beginPath();
  ctx.moveTo(first.x * canvas.clientWidth, first.y * canvas.clientHeight);
  for (const point of rest) {
    ctx.lineTo(point.x * canvas.clientWidth, point.y * canvas.clientHeight);
  }
  ctx.stroke();
}

function resizeDrawing() {
  const width = Math.round(canvas.clientWidth * devicePixelRatio);
  const height = Math.round(canvas.clientHeight * devicePixelRatio);
  if (!width || !height || (canvas.width === width && canvas.height === height)) return;
  canvas.width = width;
  canvas.height = height;
  ctx.setTransform(width / canvas.clientWidth, 0, 0, height / canvas.clientHeight, 0, 0);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#125492";
  paths.forEach(paintPath);
}
canvas.width = 0;
resizeDrawing();
new ResizeObserver(resizeDrawing).observe(canvas);
window.addEventListener("resize", resizeDrawing);

function drawingPoint(event) {
  return { x: event.offsetX / canvas.clientWidth, y: event.offsetY / canvas.clientHeight };
}
canvas.onpointerdown = (event) => {
  if (stroke || event.button !== 0) return;
  canvas.setPointerCapture(event.pointerId);
  const points = [drawingPoint(event)];
  paths.push(points);
  stroke = { id: event.pointerId, start: performance.now(), points };
};
canvas.onpointermove = (event) => {
  if (stroke?.id !== event.pointerId) return;
  const next = drawingPoint(event);
  paintPath([stroke.points.at(-1), next]);
  stroke.points.push(next);
};
function finishStroke(event) {
  if (stroke?.id !== event.pointerId) return;
  log("drawing", { type: event.pointerType, event: event.type, samples: stroke.points.length - 1, elapsedMs: ms(stroke.start) });
  stroke = undefined;
}
canvas.onpointerup = finishStroke;
canvas.onpointercancel = finishStroke;
canvas.onlostpointercapture = finishStroke;
el("clear").onclick = () => {
  paths.length = 0;
  stroke = undefined;
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
};

function leavePage() {
  if (recording || permissionRequest) log("record-interrupted", { reason: "page-hidden" });
  stopRecording(true);
  cancelRecognition();
  stopSpeech();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) leavePage();
});
window.addEventListener("pagehide", () => {
  leavePage();
  clearClip();
});
el("copy").onclick = async () => {
  try { await navigator.clipboard.writeText(el("log").textContent); } catch { log("copy-unavailable"); }
};

