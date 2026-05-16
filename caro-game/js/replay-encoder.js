// replay-encoder.js — encode replay to MP4 (webm) or GIF

import {
  renderFrame,
  drawWinLineAnimated,
  REPLAY_SIZE,
} from './replay-renderer.js';

const MOVE_DURATION_MS = 125; // ~8 moves/s
const WIN_LINE_DURATION_MS = 400;
const HOLD_DURATION_MS = 1500;
const VIDEO_FPS = 15;
const MAX_ENCODE_MS = 10000;

function createCanvas(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

export async function encodeReplay(state, opts = {}) {
  const signal = opts.signal;
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm')) {
    try {
      return await encodeVideo(state, { ...opts, signal });
    } catch (e) {
      // fall through to GIF
    }
  }
  return encodeGIF(state, { ...opts, signal });
}

async function encodeVideo(state, opts) {
  const { onProgress, signal } = opts;
  const canvas = createCanvas(REPLAY_SIZE, REPLAY_SIZE);
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(VIDEO_FPS);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime });

  const totalMoves = state.history.length || 1;
  const totalDuration = totalMoves * MOVE_DURATION_MS + WIN_LINE_DURATION_MS + HOLD_DURATION_MS;

  return new Promise((resolve, reject) => {
    const chunks = [];
    let rafId;
    let timeoutId;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      clearTimeout(timeoutId);
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve({ blob, type: 'video/webm' });
    };
    recorder.onerror = (e) => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
      reject(new Error('MediaRecorder error'));
    };

    const startTime = performance.now();

    function tick() {
      if (signal?.aborted) {
        cancelAnimationFrame(rafId);
        recorder.stop();
        reject(new Error('Aborted'));
        return;
      }

      const elapsed = performance.now() - startTime;

      if (elapsed >= totalDuration) {
        cancelAnimationFrame(rafId);
        recorder.stop();
        return;
      }

      let moveIndex = Math.min(totalMoves - 1, Math.floor(elapsed / MOVE_DURATION_MS));
      if (moveIndex < 0) moveIndex = 0;

      renderFrame(ctx, state, moveIndex);

      const winElapsed = elapsed - totalMoves * MOVE_DURATION_MS;
      if (winElapsed > 0 && state.winLine) {
        const winProgress = Math.min(1, winElapsed / WIN_LINE_DURATION_MS);
        drawWinLineAnimated(ctx, state.winLine, winProgress);
      }

      if (onProgress) {
        onProgress(Math.min(1, elapsed / totalDuration));
      }

      rafId = requestAnimationFrame(tick);
    }

    recorder.start();
    timeoutId = setTimeout(() => {
      cancelAnimationFrame(rafId);
      recorder.stop();
      reject(new Error('Encoding timeout'));
    }, MAX_ENCODE_MS);
    rafId = requestAnimationFrame(tick);
  });
}

async function encodeGIF(state, opts) {
  const { onProgress, signal } = opts;

  // Lazy-load gif.js (UMD -> window.GIF)
  await import('../vendor/gif.js');
  const GIF = window.GIF;
  if (!GIF) throw new Error('gif.js failed to load');

  const canvas = createCanvas(REPLAY_SIZE, REPLAY_SIZE);
  const ctx = canvas.getContext('2d');

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: REPLAY_SIZE,
    height: REPLAY_SIZE,
    workerScript: 'vendor/gif.worker.js',
  });

  const totalMoves = state.history.length || 1;
  const winFrames = Math.max(1, Math.round(WIN_LINE_DURATION_MS / MOVE_DURATION_MS));
  const holdFrames = Math.max(1, Math.round(HOLD_DURATION_MS / MOVE_DURATION_MS));

  const addFrame = () => gif.addFrame(canvas, { delay: MOVE_DURATION_MS, copy: true });

  // Interleave render + addFrame so each captured frame reflects its own state.
  // (gif.js reads canvas pixels synchronously when copy:true, so addFrame must
  // happen between renders rather than after all renders complete.)
  for (let i = 0; i < totalMoves; i++) {
    if (signal?.aborted) throw new Error('Aborted');
    renderFrame(ctx, state, i);
    addFrame();
  }
  for (let i = 0; i < winFrames; i++) {
    if (signal?.aborted) throw new Error('Aborted');
    renderFrame(ctx, state, totalMoves - 1);
    if (state.winLine) drawWinLineAnimated(ctx, state.winLine, (i + 1) / winFrames);
    addFrame();
  }
  for (let i = 0; i < holdFrames; i++) {
    if (signal?.aborted) throw new Error('Aborted');
    renderFrame(ctx, state, totalMoves - 1);
    if (state.winLine) drawWinLineAnimated(ctx, state.winLine, 1);
    addFrame();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('GIF encoding timeout'));
    }, MAX_ENCODE_MS);

    gif.on('progress', (p) => {
      if (onProgress) onProgress(p);
    });
    gif.on('finished', (blob) => {
      clearTimeout(timeoutId);
      resolve({ blob, type: 'image/gif' });
    });
    gif.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new Error('GIF encoding error: ' + err));
    });

    gif.render();
  });
}
