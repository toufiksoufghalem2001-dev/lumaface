/**
 * FramePortal — render into the 430px phone frame (`#lf-phone-frame`),
 * the same pattern Sheet uses. Used for the activity detail sticky CTA bar,
 * which must sit ABOVE the BottomTabBar regardless of scroll position.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function FramePortal({ children }: { children: ReactNode }) {
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after first commit
    setFrame(document.getElementById('lf-phone-frame'));
  }, []);
  if (!frame) return null;
  return createPortal(children, frame);
}
