import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { loadRememberAdminTokenPreference } from '../lib/adminAuth';

type AdminLoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (opts: { adminToken: string; remember: boolean }) => void;
};

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

function buildAdminUrl(baseUrl: string, path: string): string {
  if (!path.startsWith('/')) throw new Error(`path must start with '/': ${path}`);
  return baseUrl ? `${baseUrl}${path}` : path;
}

function getDefaultApiBaseUrl(): string {
  const raw = import.meta.env.VITE_ADMIN_API_BASE;
  return typeof raw === 'string' ? normalizeBaseUrl(raw) : '';
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M1 1l12 12M13 1L1 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AdminLoginModal({ open, onClose, onSuccess }: AdminLoginModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [adminToken, setAdminToken] = useState('');
  const [remember, setRemember] = useState(() => loadRememberAdminTokenPreference());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // ── Scroll lock + initial focus ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;

    prevFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const sb = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (sb > 0) document.body.style.paddingRight = `${sb}px`;

    closeBtnRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      (prevFocusRef.current ?? null)?.focus?.();
    };
  }, [open]);

  // ── Keyboard: Escape + focus trap ────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setAdminToken('');
      setErrorMessage(null);
      setSubmitting(false);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => !(el as HTMLInputElement).disabled);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (!active || !modal.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // ── Form submission: validate via GET /admin/api/keys ───────────────────
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = adminToken.trim();
    if (!token) {
      setErrorMessage('Admin token is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        buildAdminUrl(getDefaultApiBaseUrl(), '/admin/api/keys'),
        { method: 'GET', headers: { authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setErrorMessage('Authentication failed. Check ADMIN_API_TOKEN and try again.');
          return;
        }
        if (response.status === 404) {
          setErrorMessage(
            'Admin API not found at /admin/api. Check your deployment routing.'
          );
          return;
        }

        let details = '';
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body?.error === 'string') details = body.error;
        } catch {
          // ignore JSON parse failures
        }
        setErrorMessage(
          details
            ? `Sign-in failed: ${details}`
            : `Sign-in failed with HTTP ${response.status}.`
        );
        return;
      }

      onSuccess({ adminToken: token, remember });
    } catch (err) {
      const reason =
        typeof (err as { message?: unknown })?.message === 'string'
          ? ` (${(err as { message: string }).message})`
          : '';
      setErrorMessage(`Network error: could not reach Admin API.${reason}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal__header">
          <div>
            <h2 id={titleId} className="modal__title">
              Sign in to Admin Console
            </h2>
            <p id={descriptionId} className="modal__description">
              Provide the admin token configured on the server.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close sign-in modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form (contains all fields + actions) */}
        <form className="modal__form-wrap" onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="modal__field">
              <label htmlFor="landing-admin-token" className="modal__label">
                Admin token
              </label>
              <input
                id="landing-admin-token"
                type="password"
                className="modal__input"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Paste ADMIN_API_TOKEN"
                autoComplete="off"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>

            <label className="modal__remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember this token on this browser</span>
            </label>

            {errorMessage != null && (
              <p className="modal__error" role="alert">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Actions inside the form so submit button works natively */}
          <div className="modal__actions">
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
