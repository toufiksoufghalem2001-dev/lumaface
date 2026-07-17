/**
 * ConsentToggle (design.md §7.13) — privacy control row (56px+): icon in
 * cream-2 circle, title body-strong, 2-line caption description, spring
 * toggle (46×28, on = sage track). Info "i" opens a Sheet with the
 * plain-language explainer + the exact legal paragraph.
 * Toggles are DEFAULT-OFF for camera coaching, photo saving, analytics.
 *
 * Icon mapping note (lucide-react@0.562): `ImageLock` does not exist →
 * `FolderLock` is used for photo-privacy rows (documented substitution).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ChartNoAxesColumn, FolderLock, Info, MessageCircleHeart, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Sheet from '@/components/Sheet';

/** Canonical consent descriptors (title/description/explainer/legal). */
export const CONSENT_COPY = {
  cameraCoach: {
    icon: Camera,
    title: 'Camera guidance during activities',
    description: 'Real-time centering and gentle form cues (Preview: simulated in this build).',
    explainer: 'Live camera frames are analyzed on your phone and discarded instantly. Nothing is streamed or uploaded.',
    legal: 'Camera processing runs entirely on-device. No frame is stored, transmitted, or used for any inference beyond centering and movement-tempo guidance. No beauty score, age, ethnicity, emotion, health, or identity reading is ever produced.',
  },
  photoSave: {
    icon: FolderLock,
    title: 'Save progress photos on this device',
    description: 'For your private before/after diary. Off = you can still capture, nothing is kept.',
    explainer: 'Progress photos save only on this device, and you can delete any of them, anytime.',
    legal: 'Photos are stored exclusively in this device’s local storage, are never uploaded, never analyzed for appearance, and are deleted permanently when you delete them or erase app data.',
  },
  analytics: {
    icon: ChartNoAxesColumn,
    title: 'Anonymous usage analytics',
    description: 'Helps us improve LumaFace. Codes only — never free text, never face data.',
    explainer: 'If you opt in, we count feature usage with analytics-safe metadata only: category, evidence tier, duration. No photos, no free text, no face data, ever.',
    legal: 'Analytics events contain activity category, evidence tier and duration seconds only. No free-text content, camera imagery, or photo data is collected. You can revoke this anytime; revocation stops all future collection.',
  },
  coachChat: {
    icon: MessageCircleHeart,
    title: 'Coach chat history',
    description: 'Keep your local coach preview threads on this device.',
    explainer: 'The coach answers from an expert-approved library. Threads stay on this device only when you opt in.',
    legal: 'Coach threads are stored only in this device’s local storage. They are never used to train models and never leave the device in this build.',
  },
} as const;

export type ConsentCopyKey = keyof typeof CONSENT_COPY;

export interface ConsentToggleProps {
  consentKey: ConsentCopyKey;
  value: boolean;
  onChange: (value: boolean) => void;
  /** small sage toast hook ("Saved — you can change this anytime.") */
  onSaved?: () => void;
  className?: string;
}

export default function ConsentToggle({ consentKey, value, onChange, onSaved, className }: ConsentToggleProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const copy = CONSENT_COPY[consentKey];
  const Icon: LucideIcon = copy.icon;

  return (
    <div className={cn('flex items-center gap-3 min-h-[56px] py-2', className)}>
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-body font-bold text-ink">{copy.title}</span>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="inline-flex size-[30px] items-center justify-center rounded-full text-ink-3"
            aria-label={`About: ${copy.title}`}
          >
            <Info size={14} />
          </button>
        </span>
        <span className="block text-caption text-ink-2 line-clamp-2">{copy.description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={copy.title}
        onClick={() => {
          onChange(!value);
          onSaved?.();
        }}
        className={cn(
          'relative h-7 w-[46px] shrink-0 rounded-full transition-colors duration-200',
          value ? 'bg-sage' : 'bg-cream-2',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn('absolute top-[3px] size-[22px] rounded-full bg-white shadow-card', value ? 'end-[3px]' : 'start-[3px]')}
        />
      </button>

      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} ariaLabel={copy.title}>
        <p className="text-eyebrow uppercase text-ink-2 mt-1">Your choice, always</p>
        <h3 className="font-display text-display-md text-ink mt-1">{copy.title}</h3>
        <p className="text-body text-ink mt-3">{copy.explainer}</p>
        <div className="mt-4 rounded-tile bg-cream-2 p-3.5">
          <p className="text-caption text-ink-2">{copy.legal}</p>
        </div>
        <p className="text-caption text-ink-2 mt-3.5">Default off. You can change this anytime in Profile.</p>
      </Sheet>
    </div>
  );
}
