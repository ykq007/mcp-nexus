import { useCallback, useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { Features } from '../components/Features';
import { Footer } from '../components/Footer';
import { AdminLoginModal } from '../components/AdminLoginModal';
import {
  ADMIN_LOCAL_TOKEN_KEY,
  ADMIN_SESSION_TOKEN_KEY,
  loadAdminToken,
  persistAdminToken,
  persistRememberAdminTokenPreference
} from '../lib/adminAuth';
import {
  buildAdminDashboardUrl,
  sanitizeAdminNext,
  shouldAutoOpenLoginModal
} from '../lib/adminRouting';
import '../styles/landing.css';

// ── CtaBand: calm midpage prompt to enter the console ────────────────────────
function CtaBand({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <section className="cta-band" aria-labelledby="cta-band-title">
      <div className="l-container cta-band__inner">
        <div className="cta-band__text">
          <h2 className="cta-band__title" id="cta-band-title">
            Ready to manage your search infrastructure?
          </h2>
          <p className="cta-band__desc">
            Open the admin console to add keys, mint client tokens, and inspect usage.
          </p>
        </div>
        <div className="cta-band__actions">
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={onOpenDashboard}
          >
            Open Admin Console
          </button>
          <a
            href="https://github.com/anthropics/mcp-nexus"
            className="btn btn--lg"
            target="_blank"
            rel="noreferrer"
            aria-label="View on GitHub (opens in a new tab)"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Page state helpers ────────────────────────────────────────────────────────
function getInitialState(): { requestedNext: string; shouldOpenLoginModal: boolean } {
  if (typeof window === 'undefined') {
    return { requestedNext: '/', shouldOpenLoginModal: false };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    requestedNext: sanitizeAdminNext(params.get('next')),
    shouldOpenLoginModal: shouldAutoOpenLoginModal(params)
  };
}

// ── Landing page ──────────────────────────────────────────────────────────────
export function LandingPage() {
  const [initialState] = useState(getInitialState);
  const [requestedNext, setRequestedNext] = useState(initialState.requestedNext);
  const [signedIn, setSignedIn] = useState(() => loadAdminToken().trim().length > 0);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Auto-open login modal on ?login=1 / ?adminLogin=1 / ?next=
  useEffect(() => {
    if (!signedIn && initialState.shouldOpenLoginModal) {
      setLoginModalOpen(true);
    }
  }, [signedIn, initialState.shouldOpenLoginModal]);

  // Redirect to dashboard when already signed in and auto-open was requested
  useEffect(() => {
    if (!signedIn) return;
    if (!initialState.shouldOpenLoginModal) return;
    if (typeof window === 'undefined') return;
    window.location.replace(buildAdminDashboardUrl(requestedNext));
  }, [signedIn, initialState.shouldOpenLoginModal, requestedNext]);

  // Cross-tab token sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (
        event.key !== ADMIN_SESSION_TOKEN_KEY &&
        event.key !== ADMIN_LOCAL_TOKEN_KEY
      ) return;
      setSignedIn(loadAdminToken().trim().length > 0);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Open dashboard (navigate if signed in, else show login modal)
  const openDashboard = useCallback(
    (next?: string) => {
      const safeNext = sanitizeAdminNext(next ?? requestedNext);
      setRequestedNext(safeNext);
      if (signedIn) {
        window.location.assign(buildAdminDashboardUrl(safeNext));
        return;
      }
      setLoginModalOpen(true);
    },
    [requestedNext, signedIn]
  );

  // Login success: persist token + navigate
  const handleLoginSuccess = useCallback(
    (opts: { adminToken: string; remember: boolean }) => {
      persistAdminToken(opts.adminToken, opts.remember);
      persistRememberAdminTokenPreference(opts.remember);
      setSignedIn(true);
      setLoginModalOpen(false);
      window.location.assign(buildAdminDashboardUrl(requestedNext));
    },
    [requestedNext]
  );

  // Close modal: clean ?next / ?login / ?adminLogin from URL
  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.delete('next');
    params.delete('login');
    params.delete('adminLogin');
    const search = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    );
  }, []);

  return (
    <div className="landing">
      {/* Skip navigation link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Navbar onOpenDashboard={() => openDashboard()} />

      <main className="landing__main" id="main-content">
        <Hero onOpenDashboard={() => openDashboard()} />
        <Features />
        <CtaBand onOpenDashboard={() => openDashboard()} />
      </main>

      <Footer onOpenDashboard={() => openDashboard()} />

      <AdminLoginModal
        open={loginModalOpen}
        onClose={closeLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
