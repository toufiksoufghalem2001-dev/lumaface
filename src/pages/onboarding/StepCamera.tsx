/**
 * Onboarding Step 5 — Camera & privacy explainer (onboarding.md): what the
 * camera does, what LumaFace NEVER infers, and two default-off ConsentToggles
 * (cameraCoach, photoSave). No OS camera prompt fires here — permission is
 * only requested at first actual camera use.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Cpu, EyeOff, FolderLock, type LucideIcon } from 'lucide-react';
import { EASE_OUT_SOFT } from '@/lib/theme';
import ConsentToggle from '@/components/ConsentToggle';
import { LFButton } from '@/components/ui';
import { CameraGuidanceIllo, ColumnToast, StepHead, useRise } from './shared';

const EXPLAINERS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Cpu,
    title: 'Processed on your device',
    body: 'Live camera frames are analyzed on your phone and discarded instantly. Nothing is streamed or uploaded.',
  },
  {
    icon: EyeOff,
    title: 'What LumaFace never infers',
    body: 'No beauty score. No age guess. No ethnicity, emotion, health or identity reading. Never.',
  },
  {
    // ImageLock does not exist in lucide-react@0.562 — FolderLock is the documented substitution.
    icon: FolderLock,
    title: 'Photos stay with you',
    body: 'Progress photos save only on this device, only if you say yes, and you can delete any of them, anytime.',
  },
];

export default function StepCamera({
  cameraCoach,
  photoSave,
  onConsent,
  onContinue,
  onLater,
}: {
  cameraCoach: boolean;
  photoSave: boolean;
  onConsent: (key: 'cameraCoach' | 'photoSave', value: boolean) => void;
  onContinue: () => void;
  onLater: () => void;
}) {
  const rise = useRise();
  const reduced = useReducedMotion();
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div>
      <StepHead
        title={
          <>
            About the camera — <em className="italic">your</em> rules.
          </>
        }
        subline="LumaFace can use your camera for guidance and progress photos. Here's exactly what that means."
      />

      <motion.div
        initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0.2 : 0.6, ease: EASE_OUT_SOFT }}
        className="mt-5 flex justify-center"
      >
        <span className="inline-flex w-40 overflow-hidden rounded-arch" aria-hidden="true">
          <CameraGuidanceIllo className="w-40 h-40" />
        </span>
      </motion.div>

      <div className="mt-5 flex flex-col gap-2.5">
        {EXPLAINERS.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.5, delay: reduced ? 0 : 0.15 + i * 0.08, ease: EASE_OUT_SOFT }}
            className="bg-card rounded-[18px] shadow-card p-4 flex items-start gap-3"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-body font-bold text-ink">{title}</span>
              <span className="block text-caption text-ink-2 mt-0.5">{body}</span>
            </span>
          </motion.div>
        ))}
      </div>

      {/* Consent choices — both default OFF */}
      <div className="mt-4 flex flex-col gap-1">
        {[('cameraCoach' as const), ('photoSave' as const)].map((key, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: reduced ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.3 + i * 0.06, ease: EASE_OUT_SOFT }}
          >
            <ConsentToggle
              consentKey={key}
              value={key === 'cameraCoach' ? cameraCoach : photoSave}
              onChange={(v) => onConsent(key, v)}
              onSaved={() => setToast('Saved — you can change this anytime.')}
            />
          </motion.div>
        ))}
      </div>

      <motion.p {...rise(0.42, 10)} className="mt-2 text-caption text-ink-2">
        Both are optional. LumaFace works fully with them off, and you can change them in Profile anytime.
      </motion.p>

      <motion.div {...rise(0.5, 16)} className="mt-4">
        <LFButton onClick={onContinue}>Continue</LFButton>
        <LFButton variant="ghost" onClick={onLater} className="mt-1 w-full min-h-[44px]">
          Not now — decide later
        </LFButton>
      </motion.div>

      <ColumnToast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
