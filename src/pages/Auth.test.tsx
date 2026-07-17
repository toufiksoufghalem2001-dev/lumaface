// @vitest-environment jsdom
/**
 * Auth smoke tests — magic-link form, sent state, error states, skip path.
 * supabase-js is mocked; the real config (BACKEND_ENABLED=true) is used.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { MotionConfig } from 'framer-motion';

const h = vi.hoisted(() => ({
  signInWithOtp: vi.fn(async (opts: { email: string; options: { emailRedirectTo: string } }) => {
    void opts; // typed so call assertions typecheck
    return { data: {}, error: null as null | { message: string } };
  }),
  getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: h.signInWithOtp,
      getSession: h.getSession,
      onAuthStateChange: h.onAuthStateChange,
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: () => ({ select: async () => ({ data: [], error: null }) }),
  }),
}));

import Auth from '@/pages/Auth';
import { AppProvider } from '@/lib/store';

/* jsdom polyfills for framer-motion */
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

function renderAuth() {
  return render(
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <MemoryRouter initialEntries={['/auth']}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<div>HOME_SCREEN</div>} />
            <Route path="/profile" element={<div>PROFILE_SCREEN</div>} />
          </Routes>
        </MemoryRouter>
      </AppProvider>
    </MotionConfig>,
  );
}

beforeEach(() => {
  localStorage.clear();
  h.signInWithOtp.mockClear();
  h.signInWithOtp.mockResolvedValue({ data: {}, error: null });
});
afterEach(() => cleanup());

describe('Auth screen', () => {
  it('renders the magic-link form, privacy line and skip path', () => {
    renderAuth();
    expect(screen.getByLabelText(/your email/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /email me a magic link/i })).toBeTruthy();
    expect(screen.getByText(/your photos stay on this device/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /continue without an account/i })).toBeTruthy();
  });

  it('sends a magic link with the /auth/callback redirect and shows the sent state', async () => {
    renderAuth();
    fireEvent.change(screen.getByLabelText(/your email/i), { target: { value: 'Friend@Example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /email me a magic link/i }));

    expect(await screen.findByText(/check your inbox/i)).toBeTruthy();
    expect(h.signInWithOtp).toHaveBeenCalledTimes(1);
    const arg = h.signInWithOtp.mock.calls[0][0] as { email: string; options: { emailRedirectTo: string } };
    expect(arg.email).toBe('friend@example.com'); // trimmed + lowercased
    expect(arg.options.emailRedirectTo).toBe(`${window.location.origin}/auth/callback`);
  });

  it('rejects a malformed email locally (no network call)', async () => {
    renderAuth();
    fireEvent.change(screen.getByLabelText(/your email/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /email me a magic link/i }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(h.signInWithOtp).not.toHaveBeenCalled();
  });

  it('surfaces a send failure as an inline error', async () => {
    h.signInWithOtp.mockResolvedValue({ data: {}, error: { message: 'rate limited' } });
    renderAuth();
    fireEvent.change(screen.getByLabelText(/your email/i), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByRole('button', { name: /email me a magic link/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('rate limited'));
  });

  it('continue without an account navigates home', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: /continue without an account/i }));
    expect(await screen.findByText('HOME_SCREEN')).toBeTruthy();
  });
});
