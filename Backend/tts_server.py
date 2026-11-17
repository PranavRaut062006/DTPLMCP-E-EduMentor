"""
Free Voice Cloning Server for DTPLMCP-E-EduMentor
Uses Coqui XTTS-v2 — 100% free, no API key needed.

Setup:
  pip install coqui-tts fastapi uvicorn python-multipart

Run:
  python tts_server.py

This exposes:
  POST /synthesize  — clone a voice and return audio as base64
  GET  /health      — health check
"""

import os
import base64
import tempfile
from fastapi import FastAPI, Form, UploadFile, File
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="EduMentor Free TTS Server")

# Load model once at startup (downloads ~1.8GB on first run, then cached)
print("[TTS Server] Loading XTTS-v2 model...")
try:
    import torch
    from TTS.api import TTS
    gpu_avail = torch.cuda.is_available()
    print(f"[TTS Server] GPU acceleration active: {gpu_avail}")
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=gpu_avail)
    print("[TTS Server] ✅ XTTS-v2 model loaded successfully!")
    USE_XTTS = True
except Exception as e:
    print(f"[TTS Server] ⚠️  XTTS-v2 failed to load: {e}")
    print("[TTS Server] Falling back to basic TTS (no voice cloning)...")
    USE_XTTS = False
    try:
        from TTS.api import TTS as TTS2
        tts = TTS2("tts_models/en/ljspeech/tacotron2-DDC")
        print("[TTS Server] ✅ Basic TTS loaded.")
    except Exception as e2:
        print(f"[TTS Server] ❌ All TTS models failed: {e2}")
        tts = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "voice_cloning": USE_XTTS,
        "model": "xtts_v2" if USE_XTTS else "tacotron2 (no cloning)"
    }


@app.post("/synthesize")
async def synthesize(
    text: str = Form(...),
    language: str = Form(default="en"),
    speaker_wav: UploadFile = File(default=None),  # Optional voice sample for cloning
):
    """
    Synthesize speech. If speaker_wav is provided and XTTS is loaded,
    it clones that voice. Otherwise uses default voice.
    """
    if tts is None:
        return JSONResponse(status_code=500, content={"error": "TTS model not loaded"})

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = os.path.join(tmpdir, "output.wav")
            speaker_path = None

            # Save the uploaded voice sample if provided
            if speaker_wav and speaker_wav.filename:
                ext = os.path.splitext(speaker_wav.filename)[1] or ".wav"
                speaker_path = os.path.join(tmpdir, f"speaker{ext}")
                content = await speaker_wav.read()
                with open(speaker_path, "wb") as f:
                    f.write(content)

            if USE_XTTS and speaker_path:
                # Voice cloning mode
                tts.tts_to_file(
                    text=text,
                    speaker_wav=speaker_path,
                    language=language,
                    file_path=out_path
                )
            elif USE_XTTS:
                # XTTS with default speaker
                tts.tts_to_file(text=text, language=language, file_path=out_path)
            else:
                # Basic TTS (no cloning)
                tts.tts_to_file(text=text, file_path=out_path)

            with open(out_path, "rb") as f:
                audio_b64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "success": True,
            "audio_base64": audio_b64,
            "format": "wav",
            "cloning_used": bool(USE_XTTS and speaker_path)
        }

    except Exception as e:
        print(f"[TTS Server] Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    print("[TTS Server] Starting on http://localhost:8020")
    uvicorn.run(app, host="0.0.0.0", port=8020)
