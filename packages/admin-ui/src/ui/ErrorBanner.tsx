import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconAlertCircle, IconRefresh } from './icons';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorBanner({ message, onRetry, retrying }: ErrorBannerProps) {
  const { t } = useTranslation('common');
  return (
    <div role="alert" className="errorBanner">
      <div className="errorBannerIcon" aria-hidden="true">
        <IconAlertCircle />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="errorBannerTitle">{t('errors.loadingData')}</div>
        <div className="errorBannerMessage">{message}</div>
      </div>
      {onRetry ? (
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={onRetry}
          disabled={retrying}
          style={{ flexShrink: 0 }}
        >
          <IconRefresh className={retrying ? 'spin' : ''} />
          {t('actions.retry')}
        </button>
      ) : null}
    </div>
  );
}
