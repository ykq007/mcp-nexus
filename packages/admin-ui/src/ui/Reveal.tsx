/**
 * Reveal — shared secret-reveal affordance.
 *
 * Two variants:
 *   - "key"   → masked → reveal → cleartext in mono well + copy; auto-hide
 *               after 15s or on blur/tab-hidden.
 *   - "token" → same as key PLUS a 30s countdown bar + aria-live region +
 *               auto-clear on blur/hidden/timeout. Used in the token reveal
 *               flow (table row button → modal/inline reveal).
 *
 * Public API is kept stable so KeyRevealCell and TokensPage call it directly.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CopyButton } from './CopyButton';
import { IconButton } from './IconButton';
import { IconEye, IconEyeOff } from './icons';

/* -------------------------------------------------------------------------- */
/*  Key reveal (inline table cell)                                             */
/* -------------------------------------------------------------------------- */

export interface KeyRevealProps {
  /** Currently masked key string (e.g. "tvly-****…****") */
  maskedValue: string;
  /** Called when the user requests reveal; must return the cleartext. */
  onReveal: () => Promise<string>;
  /** Auto-hide after N ms. Defaults to 15 000 (15s). */
  autoHideMs?: number;
  /** Accessible label for the copy action */
  copyLabel?: string;
}

export function KeyReveal({ maskedValue, onReveal, autoHideMs = 15_000, copyLabel = 'Copy key' }: KeyRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cleartext, setCleartext] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Track mount state for async guard
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearReveal = useCallback(() => {
    setRevealed(false);
    setCleartext(null);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Auto-hide timer
  useEffect(() => {
    if (revealed && cleartext) {
      hideTimerRef.current = setTimeout(clearReveal, autoHideMs);
      return () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    }
  }, [revealed, cleartext, autoHideMs, clearReveal]);

  // Hide on window blur or tab hidden (shoulder-surfing risk)
  useEffect(() => {
    if (!revealed) return;
    const onBlur = () => clearReveal();
    const onVisibility = () => { if (document.hidden) clearReveal(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [revealed, clearReveal]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const handleToggle = async () => {
    if (revealed) {
      clearReveal();
      return;
    }
    setLoading(true);
    try {
      const val = await onReveal();
      if (!isMountedRef.current) return;
      setCleartext(val);
      setRevealed(true);
    } catch {
      // ignore — loading spinner stops regardless
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  return (
    <div className="keyReveal">
      <div className="keyRevealValue" data-revealed={revealed}>
        <span className="keyReveal__text mono">
          {revealed && cleartext ? cleartext : maskedValue}
        </span>
      </div>
      <div className="keyReveal__actions">
        {/* CopyButton is always rendered (disabled/hidden when not revealed)
            so tests and screen-readers see a stable DOM. */}
        <span
          style={{
            visibility: revealed && cleartext ? 'visible' : 'hidden',
            pointerEvents: revealed && cleartext ? 'auto' : 'none'
          }}
        >
          <CopyButton
            text={cleartext ?? ''}
            variant="primary"
            label={copyLabel}
            disabled={!revealed || !cleartext}
            className="btn--icon btn--sm"
          />
        </span>
        <IconButton
          icon={revealed ? <IconEyeOff /> : <IconEye />}
          onClick={handleToggle}
          loading={loading}
          size="sm"
          aria-label={revealed ? 'Hide key' : 'Reveal key'}
          title={revealed ? 'Hide key' : 'Reveal key'}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Token reveal (30s countdown variant)                                       */
/* -------------------------------------------------------------------------- */

export interface TokenRevealProps {
  /** Called to get the cleartext token. */
  onReveal: () => Promise<string>;
  /** Window duration in seconds. Defaults to 30. */
  windowSecs?: number;
  /** Label for the reveal button trigger. */
  triggerLabel?: string;
  /** Label for the copy button. */
  copyLabel?: string;
  /** Called when cleartext was copied. */
  onCopied?: () => void;
}

export function TokenReveal({
  onReveal,
  windowSecs = 30,
  triggerLabel = 'Reveal token',
  copyLabel = 'Copy token',
  onCopied
}: TokenRevealProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'revealed'>('idle');
  const [cleartext, setCleartext] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(windowSecs);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Track mount state for async guard
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearReveal = useCallback(() => {
    setState('idle');
    setCleartext(null);
    setRemaining(windowSecs);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [windowSecs]);

  // Countdown tick
  useEffect(() => {
    if (state !== 'revealed') return;
    setRemaining(windowSecs);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearReveal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, windowSecs, clearReveal]);

  // Auto-clear on blur / tab hidden
  useEffect(() => {
    if (state !== 'revealed') return;
    const onBlur = () => clearReveal();
    const onVisibility = () => { if (document.hidden) clearReveal(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, clearReveal]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleReveal = async () => {
    setState('loading');
    try {
      const val = await onReveal();
      if (!isMountedRef.current) return;
      setCleartext(val);
      setState('revealed');
    } catch {
      if (isMountedRef.current) setState('idle');
    }
  };

  if (state === 'idle' || state === 'loading') {
    return (
      <button
        type="button"
        className="btn btn--sm"
        onClick={handleReveal}
        disabled={state === 'loading'}
      >
        <IconEye />
        {state === 'loading' ? 'Revealing…' : triggerLabel}
      </button>
    );
  }

  const pct = (remaining / windowSecs) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* Token text announced once when revealed; no per-second spam */}
      <div className="tokenWell" aria-live="polite" aria-label="Revealed token">
        {cleartext}
      </div>

      {/* Countdown bar — progressbar role gives value, no aria-live on ticking text */}
      <div className="revealCountdown">
        <div
          className="revealCountdownBar"
          role="progressbar"
          aria-valuenow={remaining}
          aria-valuemin={0}
          aria-valuemax={windowSecs}
          aria-label={`Token visible for ${remaining} more seconds`}
        >
          <div
            className="revealCountdownFill"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Plain text — not aria-live so it doesn't announce every second */}
        <span className="revealCountdownLabel" aria-hidden="true">{remaining}s</span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <CopyButton
          text={cleartext ?? ''}
          variant="primary"
          label={copyLabel}
          buttonText={copyLabel}
          onCopied={onCopied}
        />
        <button type="button" className="btn btn--sm btn--ghost" onClick={clearReveal}>
          <IconEyeOff />
          Hide
        </button>
      </div>
    </div>
  );
}
