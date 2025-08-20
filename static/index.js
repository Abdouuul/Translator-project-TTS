const btnRecord = document.getElementById("record-btn");
const btnStop = document.getElementById("stop-btn");
const statusEl = document.getElementById("status");
const playerEl = document.getElementById("player");
const transcriptionOutput = document.getElementById("transcription-output");

let recordChunks = [];
let mediaRecorder;

async function initMedia() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return stream;
}

btnRecord.addEventListener("click", async () => {
  const stream = await initMedia();
  recordChunks = [];

  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  mediaRecorder.ondataavailable = (rec) => {
    if (rec.data && rec.data.size > 0) {
      recordChunks.push(rec.data);
    }
  };

  mediaRecorder.onstart = () => {
    statusEl.textContent = "Speak!";
    btnStop.disabled = false;
    btnRecord.disabled = true;
  };

  mediaRecorder.onstop = async () => {
    statusEl.textContent = "Recording Stopped";
    btnStop.disabled = true;
    btnRecord.disabled = false;

    stream.getTracks().forEach((track) => {
      track.stop();
    });

    const blob = new Blob(recordChunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    playerEl.src = url;

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      const transcriptionResult = await fetch("/speech-to-text", {
        method: "POST",
        body: formData,
      });

      const transcriptionJson = await transcriptionResult.json();
      transcriptionOutput.innerText = transcriptionJson.text;

      const translatedResult = await fetch("/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: transcriptionJson.text }),
      });

      const translationJson = await translatedResult.json();

      transcriptionOutput.innerText += `\n\nTranslation: ${translationJson.message}`;
    } catch (error) {
      alert(error);
    }
  };

  mediaRecorder.start();
});

btnStop.addEventListener("click", () => {
  mediaRecorder.stop();
});
