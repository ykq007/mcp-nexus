import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../ui/Dialog';
import type { KeyExportDto, BatchImportResult } from '../lib/adminApi';
import { parseJsonSafely, validateImportData, type ImportPreview } from '../lib/importUtils';

export function FileImportDialog({
  open,
  onClose,
  onConfirm
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: KeyExportDto) => Promise<BatchImportResult>;
}) {
  const { t } = useTranslation('keys');
  const { t: tc } = useTranslation('common');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);
    setError(null);
    setResult(null);
    setParsing(true);

    try {
      const text = await selectedFile.text();
      const { data, error: parseError } = parseJsonSafely(text);

      if (parseError) {
        setError(parseError);
        setParsing(false);
        return;
      }

      const previewData = validateImportData(data);
      setPreview(previewData);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON file');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    setImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const importResult = await onConfirm(data);
      setResult(importResult);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to import keys');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setResult(null);
    setParsing(false);
    setImporting(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={t('import.title')}>
      <div className="stack">
        {!result ? (
          <>
            <div className="stack">
              <label className="label" htmlFor="import-file">
                {t('import.selectFile')}
              </label>
              <input
                id="import-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={importing}
                className="input"
              />
            </div>

            {parsing && <div className="help">{t('import.parsing')}</div>}

            {error && (
              <div className="help" style={{ color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            {preview && (
              <div className="stack">
                <div className="help">
                  {t('import.preview', {
                    valid: preview.valid,
                    invalid: preview.invalid,
                    tavily: preview.tavilyCount,
                    brave: preview.braveCount
                  })}
                </div>
                {preview.invalid > 0 && (
                  <div className="help" style={{ color: 'var(--warning)' }}>
                    {t('import.invalidWarning', { count: preview.invalid })}
                  </div>
                )}
              </div>
            )}

            <div className="row" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn" onClick={handleClose} disabled={importing}>
                {tc('actions.cancel')}
              </button>
              <button
                className="btn"
                data-variant="primary"
                onClick={handleImport}
                disabled={!preview || preview.valid === 0 || importing}
              >
                {importing ? t('import.importing') : t('import.confirm')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="stack">
              <div className="h3">{t('import.resultTitle')}</div>
              <div className="help">
                {t('import.resultSummary', {
                  imported: result.summary.imported,
                  failed: result.summary.failed,
                  renamed: result.summary.renamed,
                  skipped: result.summary.skipped
                })}
              </div>

              {result.renamed.length > 0 && (
                <div className="stack">
                  <div className="label">{t('import.renamedKeys')}</div>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {result.renamed.map((r, i) => (
                      <li key={i}>
                        <span className="mono">{r.from}</span> → <span className="mono">{r.to}</span> ({r.provider})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.skipped.length > 0 && (
                <div className="stack">
                  <div className="label">{t('import.skippedKeys')}</div>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {result.skipped.slice(0, 10).map((s, i) => (
                      <li key={i}>
                        <span className="mono">{s.label}</span> ({s.provider}): {s.reason}
                      </li>
                    ))}
                    {result.skipped.length > 10 && (
                      <li>{t('import.moreSkipped', { count: result.skipped.length - 10 })}</li>
                    )}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="stack">
                  <div className="label" style={{ color: 'var(--danger)' }}>
                    {t('import.errors')}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>
                        <span className="mono">{e.label}</span> ({e.provider}): {e.error}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>...and {result.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" data-variant="primary" onClick={handleClose}>
                {tc('actions.close')}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
