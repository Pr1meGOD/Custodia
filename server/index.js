/**
 * Custodia deepfake-detection proxy
 *
 * Runs locally using @xenova/transformers (ONNX Runtime in Node.js)
 * No paid external inference APIs or API tokens required.
 *
 * POST /api/check-deepfake   (multipart/form-data, field name "file")
 *   - image/*  -> classified directly by local ONNX model
 *   - video/*  -> 1-3 frames extracted with ffmpeg, each classified, fake-probability averaged
 *   -> { "fakeScore": <0-100 integer> }
 */
import dns from "node:dns";
// Resolve IPv4 first to avoid IPv6 socket resets on some Windows networks
dns.setDefaultResultOrder?.("ipv4first");

import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { pipeline } from "@xenova/transformers";
import fs from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PORT) || 4000;
const MAX_FRAMES = 3;
const MODEL_NAME =
  process.env.LOCAL_MODEL_NAME ||
  "onnx-community/deepfake_vs_real_image_detection-ONNX";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((s) => s.trim());

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

// ── Upload handling ────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(os.tmpdir(), "custodia-uploads");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
    cb(ok ? null : new Error("Only image or video files can be checked"), ok);
  },
});

// ── Local Model Management ───────────────────────────────────────────────
let classifier = null;
let classifierPromise = null;
let modelError = null;

/**
 * Loads and returns the local ONNX classification pipeline.
 * Caches the loaded pipeline in memory for subsequent calls.
 */
async function getClassifier() {
  if (classifier) return classifier;
  if (classifierPromise) return classifierPromise;

  classifierPromise = (async () => {
    try {
      console.log(`[local-model] Loading model "${MODEL_NAME}"...`);
      classifier = await pipeline("image-classification", MODEL_NAME);
      modelError = null;
      console.log(`[local-model] Model "${MODEL_NAME}" loaded successfully and ready.`);
      return classifier;
    } catch (err) {
      modelError = err;
      classifier = null;
      console.error(`[local-model] Failed to load model "${MODEL_NAME}":`, err.message);
      throw new Error(`Local deepfake detection model unavailable: ${err.message}`);
    } finally {
      classifierPromise = null;
    }
  })();

  return classifierPromise;
}

/** Returns the probability (0-1) that a single image/frame is fake */
async function classifyImage(filePath) {
  const model = await getClassifier();
  const preds = await model(filePath, { topk: 2 });
  if (!Array.isArray(preds) || preds.length === 0) {
    throw new Error("Model returned invalid predictions: " + JSON.stringify(preds));
  }

  // Model outputs [{ label: "Fake", score: ... }, { label: "Real", score: ... }]
  const fake = preds.find((p) => /fake/i.test(p.label));
  if (fake) return fake.score;
  const real = preds.find((p) => /real/i.test(p.label));
  if (real) return 1 - real.score;
  throw new Error("Model returned no Fake/Real labels: " + JSON.stringify(preds));
}

/** Extract up to MAX_FRAMES JPEG frames (one every 2 s from the start) into outDir */
function extractFrames(videoPath, outDir) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(["-vf", "fps=1/2,scale=min(640\\,iw):-2", "-frames:v", String(MAX_FRAMES), "-q:v", "3"])
      .output(path.join(outDir, "frame-%02d.jpg"))
      .on("end", resolve)
      .on("error", (err) => reject(new Error("ffmpeg frame extraction failed: " + err.message)))
      .run();
  });
}

// ── App ─────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    engine: "local-onnx",
    model: MODEL_NAME,
    modelReady: !!classifier,
    modelError: modelError?.message || null,
    ffmpeg: !!ffmpegPath,
  });
});

app.post("/api/check-deepfake", upload.single("file"), async (req, res) => {
  const file = req.file;
  let frameDir = null;
  try {
    if (!file) throw Object.assign(new Error('No file uploaded (expected form field "file")'), { status: 400 });

    let scores = [];
    if (file.mimetype.startsWith("image/")) {
      scores.push(await classifyImage(file.path));
    } else {
      frameDir = await fs.mkdtemp(path.join(UPLOAD_DIR, "frames-"));
      await extractFrames(file.path, frameDir);
      const frames = (await fs.readdir(frameDir)).filter((f) => f.endsWith(".jpg")).sort().slice(0, MAX_FRAMES);
      if (frames.length === 0) throw new Error("Could not extract any frames from the video");
      for (const f of frames) {
        scores.push(await classifyImage(path.join(frameDir, f)));
      }
    }

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const fakeScore = Math.max(0, Math.min(100, Math.round(avg * 100)));
    console.log(`[check-deepfake] ${file.originalname} (${file.mimetype}) -> ${fakeScore}% over ${scores.length} sample(s)`);
    res.json({ fakeScore });
  } catch (err) {
    console.error("[check-deepfake] failed:", err.message);
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    if (file) fs.rm(file.path, { force: true }).catch(() => {});
    if (frameDir) fs.rm(frameDir, { recursive: true, force: true }).catch(() => {});
  }
});

// Multer / generic errors -> JSON
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Bad request" });
});

app.listen(PORT, () => {
  console.log(`Custodia local deepfake server listening on http://localhost:${PORT}`);
  console.log(`Using model: ${MODEL_NAME}`);
  // Eager background model preloading (non-blocking)
  getClassifier().catch((err) => {
    console.warn(`[local-model] Model preloading postponed: ${err.message}. Will retry on incoming requests.`);
  });
});
