/**
 * KeyCreditsCell — displays Tavily key credits (remaining/total), a progress bar,
 * last-checked time, and a refresh action.
 */
import React, { useState } from 'react';
import type { AdminApi } from '../lib/adminApi';
import { formatDateTime } from '../lib/format';
import { IconRefresh } from '../ui/icons';
import { useToast } from '../ui/toast';

interface KeyCreditsCellProps {
  keyId: string;
  remaining: number | null;
  total: number | null;
  lastChecked: string | null;
  api: AdminApi;
  onUpdate?: () => void;
}

export function KeyCreditsCell({ keyId, remaining, total, lastChecked, api, onUpdate }: KeyCreditsCellProps) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await api.refreshKeyCredits(keyId);
      toast.push({ title: 'Credits updated', variant: 'success' });
      onUpdate?.();
    } catch (err: any) {
      toast.push({ title: 'Update failed', message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (remaining === null) {
    return (
      <div className="creditsCell">
        <span className="creditsMeta">Unknown</span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="btn btn--xs"
          title="Check credits now"
          aria-label="Check credits"
        >
          <IconRefresh className={loading ? 'spin' : ''} />
        </button>
      </div>
    );
  }

  const max = total || 1000;
  const percentage = Math.max(0, Math.min(100, (remaining / max) * 100));

  let variant: 'success' | 'warning' | 'danger' = 'success';
  if (percentage < 10 || remaining === 0) variant = 'danger';
  else if (percentage < 30) variant = 'warning';

  return (
    <div className="creditsCell">
      <div className="creditsInfo">
        <div className="creditsText">
          <span className="creditsValue">{remaining.toLocaleString()}</span>
          <span className="creditsTotal"> / {max.toLocaleString()}</span>
        </div>
        {lastChecked ? (
          <div className="creditsMeta" title={`Last checked: ${formatDateTime(lastChecked)}`}>
            {new Date(lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        ) : null}
      </div>

      <div className="creditsVisual">
        <div className="progressBar" role="progressbar" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={max}>
          <div
            className="progressFill"
            data-variant={variant}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="creditsActions">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="btn btn--xs btn--icon"
          title="Refresh credits"
          aria-label="Refresh credits"
        >
          <IconRefresh className={loading ? 'spin' : ''} />
        </button>
      </div>
    </div>
  );
}
