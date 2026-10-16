# Custodia — Local Deepfake Detection Service

An Express server that scores uploaded images and video files for
"likelihood of being AI-generated" using a **local ONNX model** powered by
[`@xenova/transformers`](https://github.com/xenova/transformers.js).

- **100% Local Execution**: No external inference API calls, no paid credits, and no API tokens required.
- **Model**: [`onnx-community/deepfake_vs_real_image_detection-ONNX`](https://huggingface.co/onnx-community/deepfake_vs_real_image_detection-ONNX) (ONNX conversion of `dima806/deepfake_vs_real_image_detection`). Model weights are downloaded once on first launch and cached locally.
- **Image handling**: Processed directly by the local ONNX classification pipeline.
- **Video handling**: Up to 3 frames are extracted via ffmpeg (`ffmpeg-static` bundled — no system install needed) and their fake-probability scores are averaged.

## Setup & Run

```bash
cd server
npm install
npm run dev                 # http://localhost:4000
```

> [!IMPORTANT]
> This server must be running **alongside** `npm run dev` in `custodia/` for the AI check in the
> upload flow to work. If it isn't running, uploads still succeed — the evidence is stored with
> `aiFakeScore = 255` ("not checked") and the UI shows a warning toast.

## API

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/api/check-deepfake` | `multipart/form-data`, field `file` (image/* or video/*) | `{ "fakeScore": 0-100 }` or `{ "error": "..." }` |
| `GET`  | `/api/health` | — | `{ ok: true, engine: "local-onnx", model, modelReady, ffmpeg }` |

### Quick Test

```bash
# Test health
curl http://localhost:4000/api/health

# Test image classification
curl -F "file=@test.jpg" http://localhost:4000/api/check-deepfake
```

## Notes

- **One-time Download**: On the very first run, model weights (~300 MB) are downloaded once to the local HuggingFace cache and reused thereafter.
- **Offline / Network Resilience**: If the machine is offline during startup, the server logs a clear warning without crashing and attempts loading again when requests arrive.
- **Scoring**: The score (0–100%) represents the estimated probability that the media is AI-generated/deepfake. Treat it as a decision-support signal for the Intermediary's human review.
