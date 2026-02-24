import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminApi, KeyExportDto } from '../lib/adminApi';
import { Dialog } from '../ui/Dialog';
import { useToast } from '../ui/toast';

export function ExportKeysDialog({
  open,
  onClose,
  api,
  initialAction,
}: {
  open: boolean;
  onClose: () => void;
  api: AdminApi;
  initialAction: 'file' | 'clipboard';
}) {
  const { t } = useTranslation('keys');
  const { t: tc } = useTranslation('common');
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<KeyExportDto | null>(null);
  const [showJson, setShowJson] = useState(false);

  const jsonText = useMemo(() => (data ? JSON.stringify(data, null, 2) : ''), [data]);

  const totalCount = (data?.tavily?.length || 0) + (data?.brave?.length || 0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setShowJson(false);

    api
      .exportKeys()
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(typeof e?.message === 'string' ? e.message : tc('errors.unknownError'));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, open, tc]);

  const handleDownload = () => {
    if (!jsonText) return;

    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `mcp-nexus-keys-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.push({ title: t('export.success'), message: t('export.successMessage', { count: totalCount }), variant: 'success' });
    handleClose();
  };

  const handleCopy = async () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.push({
        title: t('export.clipboardFailed'),
        message: t('export.clipboardNotSupported'),
        variant: 'error',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(jsonText);
      toast.push({
        title: t('export.clipboardSuccess'),
        message: t('export.clipboardSuccessMessage', { count: totalCount }),
        variant: 'success',
      });
      handleClose();
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        toast.push({
          title: t('export.clipboardFailed'),
          message: t('export.clipboardPermissionDenied'),
          variant: 'error',
        });
      } else {
        toast.push({
          title: t('export.clipboardFailed'),
          message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError'),
          variant: 'error',
        });
      }
    }
  };

  const primaryAction =
    initialAction === 'clipboard'
      ? { key: 'clipboard', onClick: () => void handleCopy(), label: t('export.copyJson') }
      : { key: 'file', onClick: handleDownload, label: t('export.downloadJson') };

  const secondaryAction =
    initialAction === 'clipboard'
      ? { key: 'file', onClick: handleDownload, label: t('export.downloadJson') }
      : { key: 'clipboard', onClick: () => void handleCopy(), label: t('export.copyJson') };

  const handleClose = () => {
    setLoading(false);
    setError(null);
    setData(null);
    setShowJson(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('export.dialogTitle')}
      description={t('export.securityWarning')}
    >
      <div className="stack">
        {loading ? <div className="help">{t('export.preparing')}</div> : null}
        {error ? (
          <div className="help" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        ) : null}

        {!loading && data ? (
          <>
            <div className="help">{t('export.dialogSummary', { count: totalCount })}</div>

            <div className="stack">
              <button className="btn" onClick={() => setShowJson((v) => !v)} style={{ alignSelf: 'flex-start' }}>
                {showJson ? t('export.hideJson') : t('export.showJson')}
              </button>

              {showJson ? (
                <div className="stack">
                  <label className="label" htmlFor="export-json">
                    {t('export.jsonLabel')}
                  </label>
                  <textarea
                    id="export-json"
                    className="input"
                    value={jsonText}
                    readOnly
                    rows={12}
                    style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </div>
              ) : null}
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn" onClick={handleClose}>
                {tc('actions.close')}
              </button>
              <button className="btn" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </button>
              <button className="btn" data-variant="primary" onClick={primaryAction.onClick} autoFocus>
                {primaryAction.label}
              </button>
            </div>
          </>
        ) : (
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={handleClose}>
              {tc('actions.close')}
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
