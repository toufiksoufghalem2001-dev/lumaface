/**
 * Onboarding Step 3 — Routine inventory (onboarding.md): product-category
 * chips (never brands), smart cautions driven by the rules engine (SAFE-PREG-RET
 * pregnancy-safe note; retinoid+acids pacing note), and skin-history single
 * select. "Prefer not to say" defaults to an empty inventory.
 */

import { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Brush,
  Droplets,
  FlaskConical,
  Hand,
  Pill,
  SprayCan,
  Sun,
  TestTube,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { evaluateSafety, EMPTY_SAFETY_ANSWERS, type Inventory } from '@/lib/rules';
import { INVENTORY_OPTIONS, REACT_HISTORY_OPTIONS, type InventoryOptionDef } from '@/data/content';
import { EASE_OUT_SOFT } from '@/lib/theme';
import SafetyBox from '@/components/SafetyBox';
import { LFButton } from '@/components/ui';
import { StepHead, useRise } from './shared';

const PRODUCT_ICONS: Record<InventoryOptionDef['id'], LucideIcon> = {
  cleanser: Droplets,
  moisturizer: Hand,
  sunscreen: Sun,
  retinoid: Pill,
  acids: FlaskConical,
  'benzoyl-peroxide': TestTube,
  fragranced: SprayCan,
  makeup: Brush,
};

type ReactHistory = Inventory['reactsToNew'];

export default function StepInventory({
  inventory,
  pregnantOrTrying,
  onChange,
  onContinue,
  onPreferNot,
}: {
  inventory: Inventory;
  pregnantOrTrying: boolean;
  onChange: (inventory: Inventory) => void;
  onContinue: () => void;
  onPreferNot: () => void;
}) {
  const rise = useRise();
  const reduced = useReducedMotion();

  // Live rules-engine check: SAFE-PREG-RET fires only for pregnancy + retinoid.
  const pregRetEval = useMemo(
    () => evaluateSafety({ ...EMPTY_SAFETY_ANSWERS, pregnantOrTrying }, inventory),
    [pregnantOrTrying, inventory],
  );
  const pregRetWarning = pregRetEval.pregnancyRetinoidExcluded
    ? pregRetEval.warnings.find((w) => w.code === 'SAFE-PREG-RET')?.message ?? null
    : null;
  const pacingNote =
    inventory.products.includes('retinoid') && inventory.products.includes('acids')
      ? 'Strong actives work best introduced one at a time — your plan will pace them.'
      : null;

  const toggleProduct = (id: string) => {
    const products = inventory.products.includes(id)
      ? inventory.products.filter((p) => p !== id)
      : [...inventory.products, id];
    onChange({ ...inventory, products });
  };

  return (
    <div>
      <StepHead
        title={
          <>
            What's <em className="italic">already</em> on your shelf?
          </>
        }
        subline="So your plan fits your real routine — categories only, never brands."
      />

      <motion.p {...rise(0.16, 12)} className="mt-5 text-label text-ink">
        I currently use…
      </motion.p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {INVENTORY_OPTIONS.map((opt, i) => {
          const selected = inventory.products.includes(opt.id);
          const Icon = PRODUCT_ICONS[opt.id];
          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => toggleProduct(opt.id)}
              aria-pressed={selected}
              initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0.15 : 0.3, delay: reduced ? 0 : 0.18 + i * 0.03, ease: EASE_OUT_SOFT }}
              className={cn(
                'min-h-[44px] rounded-full border px-3 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 text-center transition-colors duration-150',
                selected ? 'bg-ink text-cream border-ink' : 'bg-card border-hairline text-ink-2',
              )}
            >
              <Icon size={15} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
              {opt.label}
            </motion.button>
          );
        })}
      </div>

      {/* Smart cautions — only when relevant, always kind */}
      <AnimatePresence initial={false}>
        {pregRetWarning && (
          <motion.div
            key="preg-ret"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.3 }}
            className="overflow-hidden"
          >
            <SafetyBox className="mt-3.5" title="A kind swap, already handled" items={[pregRetWarning]} />
          </motion.div>
        )}
        {pacingNote && (
          <motion.div
            key="pacing"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.3 }}
            className="overflow-hidden"
          >
            <SafetyBox className="mt-3.5" title="One at a time" items={[pacingNote]} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div {...rise(0.25, 14)}>
        <p className="mt-7 text-label text-ink">Your skin's history with new products</p>
        <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Your skin's history with new products">
          {REACT_HISTORY_OPTIONS.map((opt) => {
            const selected = inventory.reactsToNew === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ ...inventory, reactsToNew: opt.id as ReactHistory })}
                className={cn(
                  'min-h-[44px] rounded-full border px-4 text-[13px] font-medium transition-colors duration-150',
                  selected ? 'bg-ink text-cream border-ink' : 'bg-card border-hairline text-ink-2',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div {...rise(0.35, 16)} className="mt-6">
        <LFButton onClick={onContinue}>Continue</LFButton>
        <LFButton variant="ghost" onClick={onPreferNot} className="mt-1 w-full min-h-[44px]">
          Prefer not to say
        </LFButton>
      </motion.div>
    </div>
  );
}
