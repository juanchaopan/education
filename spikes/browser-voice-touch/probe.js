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

let activeRecognition;
function cancelRecognition() {
  if (!activeRecognition) return;
  const { recognition, finish } = activeRecognition;
  finish("recognition-cancelled");
  try { recognition.abort(); } catch {}
}

async function recognize(local) {
  const mode = local ? "local" : "online";
  if (!Recognition) return log("recognition-unavailable", { mode });
  if (recording || permissionRequest || activeRecognition) return log("recognition-busy", { mode });
  if (!local && !confirm("允许浏览器语音服务处理这句测试用语？")) return;

  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  const started = performance.now();
  const finish = (event, data = {}) => {
    if (activeRecognition?.recognition !== recognition) return;
    clearTimeout(timeout);
    activeRecognition = undefined;
    log(event, { mode, elapsedMs: ms(started), ...data });
  };
  const timeout = setTimeout(() => {
    finish("recognition-timeout");
    try { recognition.abort(); } catch {}
  }, 12000);
  activeRecognition = { recognition, finish };
  recognition.onstart = () => log("recognition-start", { mode, startMs: ms(started) });
  recognition.onresult = (event) => {
    if (activeRecognition?.recognition !== recognition) return;
    const result = event.results[event.resultIndex][0];
    el("answer").value = result.transcript;
    const normalize = (value) => value.replace(/十二/g, "12").replace(/三/g, "3")
      .replace(/四/g, "4").replace(/[\p{P}\p{Z}]/gu, "");
    finish("recognition-result", { fixtureMatch: normalize(result.transcript) === normalize(phrase) });
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

function speak() {
  if (!window.speechSynthesis) return log("speech-unavailable");
  const synth = window.speechSynthesis;
  const voices = synth.getVoices().filter((voice) => /^zh([-_]CN)?$/i.test(voice.lang) && voice.localService);
  if (!voices.length) return log("speech-no-local-mandarin-voice", { voices: synth.getVoices().length });
  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.lang = "zh-CN";
  utterance.voice = voices[0];
  synth.cancel();
  const started = performance.now();
  utterance.onstart = () => log("speech-start", { voice: voices[0].name, lang: voices[0].lang, startMs: ms(started) });
  utterance.onend = () => log("speech-end", { elapsedMs: ms(started) });
  utterance.onerror = (event) => log("speech-error", { error: event.error, elapsedMs: ms(started) });
  synth.speak(utterance);
}
el("speak").onclick = speak;
el("stop-speak").onclick = () => {
  window.speechSynthesis?.cancel();
  log("speech-stop");
};

const canvas = el("drawing");
const ctx = canvas.getContext("2d");
let stroke;

function resizeDrawing() {
  canvas.width = Math.round(canvas.clientWidth * devicePixelRatio);
  canvas.height = Math.round(canvas.clientHeight * devicePixelRatio);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#125492";
}
resizeDrawing();
window.addEventListener("resize", resizeDrawing);
canvas.onpointerdown = (event) => {
  if (stroke || event.button !== 0) return;
  canvas.setPointerCapture(event.pointerId);
  stroke = { id: event.pointerId, start: performance.now(), samples: 0 };
  ctx.beginPath();
  ctx.moveTo(event.offsetX, event.offsetY);
};
canvas.onpointermove = (event) => {
  if (stroke?.id !== event.pointerId) return;
  ctx.lineTo(event.offsetX, event.offsetY);
  ctx.stroke();
  stroke.samples++;
};
function finishStroke(event) {
  if (stroke?.id !== event.pointerId) return;
  log("drawing", { type: event.pointerType, event: event.type, samples: stroke.samples, elapsedMs: ms(stroke.start) });
  stroke = undefined;
}
canvas.onpointerup = finishStroke;
canvas.onpointercancel = finishStroke;
canvas.onlostpointercapture = finishStroke;
el("clear").onclick = () => ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

function leavePage() {
  if (recording || permissionRequest) log("record-interrupted", { reason: "page-hidden" });
  stopRecording(true);
  cancelRecognition();
  window.speechSynthesis?.cancel();
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

