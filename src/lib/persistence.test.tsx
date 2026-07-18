// @vitest-environment jsdom
/**
 * Persistence-failure surfacing — when localStorage writes fail (e.g. device
 * storage full), the app must say so honestly instead of failing silently
 * (KNOWN-ISSUES: "storage quota failures not surfaced").
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MotionConfig } from 'framer-motion';
import App from '@/App';
import { AppProvider } from '@/lib/store';

class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderApp() {
  return render(
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </AppProvider>
    </MotionConfig>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('persistence failure surfacing', () => {
  it('shows an honest storage warning when local saves fail', async () => {
    renderApp();
    expect((await screen.findAllByText(/couldn't save your latest change/i)).length).toBeGreaterThan(0);
  });

  it('lets the user dismiss the warning', async () => {
    renderApp();
    await screen.findAllByText(/couldn't save your latest change/i);
    const dismiss = await screen.findByLabelText(/dismiss storage warning/i);
    await act(async () => {
      fireEvent.click(dismiss);
    });
    expect(screen.queryByText(/couldn't save your latest change/i)).toBeNull();
  });
});
