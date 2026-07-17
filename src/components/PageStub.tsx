/**
 * PageStub — shared placeholder for routes owned by feature engineers.
 * Renders the page title + "coming in this milestone" note so each engineer
 * can locate and REPLACE exactly their file in src/pages/.
 */

import { Link } from 'react-router';
import { MarkPetal } from '@/components/illos';

export default function PageStub({ title, note, params }: { title: string; note?: string; params?: Record<string, string | undefined> }) {
  return (
    <div className="px-5 pt-16 pb-10 flex flex-col items-center text-center min-h-[70dvh]">
      <MarkPetal className="size-10 opacity-60" />
      <h1 className="font-display text-display-md text-ink mt-5">{title}</h1>
      {params &&
        Object.entries(params).map(([k, v]) => (
          <p key={k} className="text-caption text-ink-3 mt-2">
            {k}: <span className="font-mono">{v}</span>
          </p>
        ))}
      <p className="text-body text-ink-2 mt-3 max-w-[32ch]">
        {note ?? 'This screen is coming in this milestone — its file is the integration point.'}
      </p>
      <Link to="/" className="mt-6 text-label text-rose min-h-[44px] inline-flex items-center">
        Back to Today
      </Link>
    </div>
  );
}
