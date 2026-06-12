/**
 * Format an absolute ISO datetime string as a relative human label.
 * e.g. "in 3 days", "2 h ago", "never", "just now"
 *
 * @param value   ISO date string or null/undefined
 * @param t       optional i18n translator for time keys (same shape as common.time)
 */
export function formatRelativeDate(
  value: string | null | undefined,
  t?: (key: string, opts?: Record<string, unknown>) => string
): string {
  if (!value) return t ? t('never') : 'never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = date.getTime() - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  const isPast = diffMs < 0;

  if (absSec < 60) {
    return t ? t('justNow') : 'just now';
  } else if (absSec < 3600) {
    const mins = Math.round(absSec / 60);
    const label = t ? t('minutes', { count: mins }) : `${mins}m`;
    return isPast
      ? (t ? t('timeAgo', { label }) : `${label} ago`)
      : (t ? t('inTime', { label }) : `in ${label}`);
  } else if (absSec < 86400) {
    const hours = Math.round(absSec / 3600);
    const label = t ? t('hours', { count: hours }) : `${hours}h`;
    return isPast
      ? (t ? t('timeAgo', { label }) : `${label} ago`)
      : (t ? t('inTime', { label }) : `in ${label}`);
  } else {
    const days = Math.round(absSec / 86400);
    return isPast
      ? (t ? t('daysAgo', { count: days }) : `${days}d ago`)
      : (t ? t('inDays', { count: days }) : `in ${days}d`);
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

type TimeTranslator = (key: string, options?: { count: number }) => string;

export function formatRelativeSeconds(
  seconds: number | null | undefined,
  t?: TimeTranslator
): string {
  if (!seconds || seconds <= 0) {
    return t ? t('noExpiry') : 'No expiry';
  }
  if (seconds < 60) {
    return t ? t('seconds', { count: seconds }) : `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return t ? t('minutes', { count: mins }) : `${mins}m`;
  }
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return t ? t('hours', { count: hours }) : `${hours}h`;
  }
  const days = Math.round(seconds / 86400);
  return t ? t('days', { count: days }) : `${days}d`;
}
