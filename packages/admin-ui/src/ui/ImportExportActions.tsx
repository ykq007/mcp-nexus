import React from 'react';
import { IconDownload, IconUpload } from './icons';

export function ImportExportActions({
  onExport,
  onImport,
  loading
}: {
  onExport: () => void;
  onImport: () => void;
  loading?: boolean;
}) {
  return (
    <>
      <button className="btn" onClick={onImport} disabled={loading}>
        <IconUpload />
        Import
      </button>
      <button className="btn" onClick={onExport} disabled={loading}>
        <IconDownload />
        Export
      </button>
    </>
  );
}
