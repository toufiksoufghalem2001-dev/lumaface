/**
 * On-device photo helpers for the Progress diary + Check-in capture.
 *
 * Privacy contract: captures are read from `input[type=file capture=user]`,
 * downscaled in-memory via canvas, and returned as small JPEG data-URLs.
 * Nothing is uploaded, nothing is analyzed for appearance — the only derived
 * metrics are capture CONDITIONS (light/focus/framing) so the app can say
 * honestly whether two captures may be placed side by side (spec §5.3).
 */

import type { Capture, CaptureQuality } from '@/lib/store';

/** Max side of the stored data-URL (keeps localStorage small). */
export const PHOTO_MAX_SIDE = 720;

/** Two captures may be compared only when conditions were close (§5.3). */
export const COMPARABLE_LIGHTING_TOLERANCE = 0.35;
export const COMPARABLE_MAX_BLUR = 0.6;

export interface ProcessedPhoto {
  dataUrl: string;
  quality: CaptureQuality;
}

export interface CaptureQualityAssessment {
  acceptable: boolean;
  reasons: Array<'too-dark' | 'too-bright' | 'too-blurry' | 'poor-framing'>;
}

/**
 * M3 capture gate. This evaluates capture conditions only, never facial
 * appearance. A failed gate should invite a retake while still allowing the
 * user to keep the photo explicitly.
 */
export function assessCaptureQuality(q: CaptureQuality): CaptureQualityAssessment {
  const reasons: CaptureQualityAssessment['reasons'] = [];
  if (q.lighting < 0.28) reasons.push('too-dark');
  if (q.lighting > 0.92) reasons.push('too-bright');
  if (q.blur > 0.62) reasons.push('too-blurry');
  if (q.pose < 0.7) reasons.push('poor-framing');
  return { acceptable: reasons.length === 0, reasons };
}

/** Read a captured file, downscale to ≤720px, estimate capture conditions. */
export async function processPhotoFile(file: File): Promise<ProcessedPhoto> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // canvas unavailable (very old webview) — store the original data URL
    return { dataUrl, quality: { lighting: 0.8, blur: 0.1, pose: 0.9 } };
  }
  ctx.drawImage(img, 0, 0, w, h);

  const quality = estimateQuality(ctx, w, h);
  const out = canvas.toDataURL('image/jpeg', 0.82);
  return { dataUrl: out, quality };
}

/**
 * Honest comparability (spec §5.3): two captures are placed side by side
 * only when light and focus were close enough that differences could mean
 * something. Otherwise the UI abstains ("no reliable comparison").
 */
export function capturesComparable(a: Capture, b: Capture): boolean {
  const dl = Math.abs(a.qualityMetrics.lighting - b.qualityMetrics.lighting);
  const blurOk = a.qualityMetrics.blur <= COMPARABLE_MAX_BLUR && b.qualityMetrics.blur <= COMPARABLE_MAX_BLUR;
  return dl <= COMPARABLE_LIGHTING_TOLERANCE && blurOk;
}

/* ── internals ─────────────────────────────────────────────────────────── */

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Simulated quality check (checkin.md §3): we measure only light and focus
 * proxies — never anything about the face. `pose` stays a gentle constant
 * (real framing guidance ships with the M1 camera coach).
 */
function estimateQuality(ctx: CanvasRenderingContext2D, w: number, h: number): CaptureQuality {
  const sample = 32;
  const sx = Math.max(1, Math.floor(w / sample));
  const sy = Math.max(1, Math.floor(h / sample));
  let sum = 0;
  let count = 0;
  let gradSum = 0;
  let prev: number | null = null;
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y += sy) {
      for (let x = 0; x < w; x += sx) {
        const i = (y * w + x) * 4;
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        sum += lum;
        count++;
        if (prev !== null) gradSum += Math.abs(lum - prev);
        prev = lum;
      }
    }
  } catch {
    return { lighting: 0.8, blur: 0.1, pose: 0.9 };
  }
  const lighting = count > 0 ? Math.round((sum / count / 255) * 100) / 100 : 0.8;
  // mean neighbour gradient ≈ sharpness proxy; map to a 0..1 "blur" score
  const sharp = count > 1 ? gradSum / (count - 1) : 20;
  const blur = Math.round(Math.min(Math.max(1 - sharp / 22, 0), 1) * 100) / 100;
  // Honest framing proxy: portrait/square captures are suitable for the fixed
  // comparison frame. This does not detect or score a face.
  const aspect = w / h;
  const pose = aspect >= 0.55 && aspect <= 1.05 ? 0.9 : 0.55;
  return { lighting, blur, pose };
}
