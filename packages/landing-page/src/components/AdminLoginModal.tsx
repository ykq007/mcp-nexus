import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { loadRememberAdminTokenPreference } from '../lib/adminAuth';

type AdminLoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (opts: { adminToken: string; remember: boolean }) => void;
};

const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

function buildAdminUrl(baseUrl: string, path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`path must start with '/': ${path}`);
  }
  return baseUrl ? `${baseUrl}${path}` : path;
}

function getDefaultApiBaseUrl(): string {
  const raw = import.meta.env.VITE_ADMIN_API_BASE;
  return typeof raw === 'string' ? normalizeBaseUrl(raw) : '';
}

export function AdminLoginModal({ open, onClose, onSuccess }: AdminLoginModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [adminToken, setAdminToken] = useState('');
  const [remember, setRemember] = useState(() => loadRememberAdminTokenPreference());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;

    previousActiveElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Focus an explicit control for keyboard users.
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      (previousActiveElement.current ?? null)?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setAdminToken('');
      setErrorMessage(null);
      setSubmitting(false);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;

      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !(el as any).disabled
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (!active || !modal.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = adminToken.trim();
    if (!token) {
      setErrorMessage('Admin token is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(buildAdminUrl(getDefaultApiBaseUrl(), '/admin/api/keys'), {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setErrorMessage('Authentication failed. Check ADMIN_API_TOKEN and try again.');
          return;
        }
        if (response.status === 404) {
          setErrorMessage('Admin API not found at /admin/api. Check your deployment routing.');
          return;
        }

        let details = '';
        try {
          const body = await response.json();
          if (typeof body?.error === 'string') details = body.error;
        } catch {
          // ignore JSON parse failures
        }
        setErrorMessage(details ? `Sign-in failed: ${details}` : `Sign-in failed with HTTP ${response.status}.`);
        return;
      }

      onSuccess({ adminToken: token, remember });
    } catch (error) {
      const reason = typeof (error as any)?.message === 'string' ? ` (${(error as any).message})` : '';
      setErrorMessage(`Network error: could not reach Admin API.${reason}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="landingLoginModal__overlay" role="presentation" onClick={onClose}>
      <div
        className="landingLoginModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
        ref={modalRef}
      >
        <div className="landingLoginModal__header">
          <div>
            <h2 id={titleId} className="landingLoginModal__title">
              Sign in to Admin UI
            </h2>
            <p id={descriptionId} className="landingLoginModal__description">
              Provide the admin token configured on the server.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="landingLoginModal__close"
            onClick={onClose}
            aria-label="Close sign-in modal"
          >
            Close
          </button>
        </div>

        <form className="landingLoginModal__form" onSubmit={handleSubmit}>
          <div className="landingLoginModal__field">
            <label htmlFor="landing-admin-token-input" className="landingLoginModal__label">
              Admin token
            </label>
            <input
              id="landing-admin-token-input"
              className="landingLoginModal__input"
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="Paste ADMIN_API_TOKEN"
              autoComplete="off"
              autoFocus
            />
          </div>

          <label className="landingLoginModal__remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>Remember this token on this browser</span>
          </label>

          {errorMessage ? (
            <p className="landingLoginModal__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="landingLoginModal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
