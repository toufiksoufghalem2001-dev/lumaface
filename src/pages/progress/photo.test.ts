import { describe, expect, it } from 'vitest';
import { assessCaptureQuality, capturesComparable } from './photo';
import type { Capture } from '@/lib/store';

const capture = (lighting: number, blur: number, pose = 0.9): Capture => ({
  captureId: crypto.randomUUID(),
  localOnly: true,
  dataUrl: 'data:image/jpeg;base64,test',
  qualityMetrics: { lighting, blur, pose },
  consentVersion: 'test',
  createdAt: new Date().toISOString(),
});

describe('M3 capture quality gate', () => {
  it('accepts a well-lit, focused portrait capture', () => {
    expect(assessCaptureQuality({ lighting: 0.62, blur: 0.2, pose: 0.9 })).toEqual({
      acceptable: true,
      reasons: [],
    });
  });

  it('explains each capture-condition failure without appearance analysis', () => {
    expect(assessCaptureQuality({ lighting: 0.2, blur: 0.8, pose: 0.55 })).toEqual({
      acceptable: false,
      reasons: ['too-dark', 'too-blurry', 'poor-framing'],
    });
  });

  it('rejects an overexposed capture', () => {
    expect(assessCaptureQuality({ lighting: 0.96, blur: 0.1, pose: 0.9 }).reasons).toContain('too-bright');
  });
});

describe('comparison abstention', () => {
  it('allows captures with close lighting and acceptable focus', () => {
    expect(capturesComparable(capture(0.55, 0.2), capture(0.68, 0.3))).toBe(true);
  });

  it('abstains when lighting differs materially', () => {
    expect(capturesComparable(capture(0.2, 0.2), capture(0.8, 0.2))).toBe(false);
  });

  it('abstains when either capture is too blurry', () => {
    expect(capturesComparable(capture(0.6, 0.7), capture(0.62, 0.2))).toBe(false);
  });
});
