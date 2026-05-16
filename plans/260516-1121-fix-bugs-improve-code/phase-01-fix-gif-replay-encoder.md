---
phase: 1
title: Fix GIF replay encoder — frames not captured
priority: P0
effort: 30m
status: completed
---

# Phase 1 — Fix GIF Replay Encoder

## Context

- Code-review 2026-05-16 found `encodeGIF` builds `frames` list while rendering each frame to canvas, then calls `gif.addFrame(canvas, {copy:true})` in a **separate** loop after rendering. Result: every GIF frame captures the **final** canvas state → animation collapses to a static image.
- MP4 path via MediaRecorder is correct; only GIF fallback (older iOS / Safari without MediaRecorder) is broken.

## Root Cause

`caro-game/js/replay-encoder.js:113-186` — render and addFrame happen in two non-overlapping loops. `copy:true` in gif.js calls `ctx.getImageData()` synchronously at the moment of `addFrame`, but by then canvas has only the latest render.

## Files

- Modify: `caro-game/js/replay-encoder.js`
- No new files. No API change.

## Fix Strategy

Interleave: render → addFrame, per frame, inside one loop. Three phases (moves / win-line animation / hold) each render then add immediately.

### Pseudocode

```js
// inside encodeGIF
const totalMoves = state.history.length || 1;
const winFrames = Math.max(1, Math.round(WIN_LINE_DURATION_MS / MOVE_DURATION_MS));
const holdFrames = Math.max(1, Math.round(HOLD_DURATION_MS / MOVE_DURATION_MS));

const addFrame = () => gif.addFrame(canvas, { delay: MOVE_DURATION_MS, copy: true });

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

// then gif.render() + finished handler (unchanged)
```

## Steps

1. Replace the three sequential build loops in `encodeGIF` with a single interleaved render+addFrame pattern (above).
2. Remove the `frames = []` accumulator entirely.
3. Keep `gif.on('progress' | 'finished' | 'error')` handlers unchanged.
4. Keep `timeoutId` watchdog unchanged.
5. Manual verify: load page in browser without MediaRecorder (Safari iOS simulator OR `Object.defineProperty(window, 'MediaRecorder', {value: undefined})`); play a short game; click "Lưu replay"; confirm GIF animates.
6. Sanity check: MP4 path (`encodeVideo`) untouched; still works in Chrome.

## Todo

- [x] Edit `replay-encoder.js` — replace `encodeGIF` body
- [x] Manual test: force GIF path → verify animation
- [x] Manual test: normal Chrome → MP4 path still works
- [x] No regression in `node js/test-daily.mjs`

## Success Criteria

- GIF replay shows each move appearing progressively, win-line drawing in, final hold
- File size still ≤ ~500KB for typical 20-30 move game
- No new console errors

## Risks

- Calling `gif.addFrame` synchronously many times may stall main thread → already mitigated by gif.js workers (workers:2) and existing 10s `MAX_ENCODE_MS` timeout

## Out of Scope

- Don't change MOVE_DURATION_MS / fps tuning
- Don't change video path
- Don't expose format toggle in UI
