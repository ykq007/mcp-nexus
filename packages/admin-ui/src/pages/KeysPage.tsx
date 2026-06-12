import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { AdminApi, TavilyKeyDto, TavilyKeyStatus, BraveKeyDto, BraveKeyStatus } from '../lib/adminApi';
import { formatDateTime } from '../lib/format';
import { KeyRevealCell } from '../app/KeyRevealCell';
import { KeyCreditsCell } from '../app/KeyCreditsCell';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Drawer } from '../ui/Drawer';
import { IconButton } from '../ui/IconButton';
import { StatusMenu } from '../ui/StatusMenu';
import { SegmentedControl } from '../ui/SegmentedControl';
import { IconKey, IconPlus, IconRefresh, IconSearch, IconShield, IconToken, IconTrash } from '../ui/icons';
import { Pagination } from '../ui/Pagination';
import { useToast } from '../ui/toast';
import { KpiCard } from '../ui/KpiCard';
import { ErrorBanner } from '../ui/ErrorBanner';
import { EmptyState } from '../ui/EmptyState';
import { DataTable, type DataTableColumn, type DataTableSortConfig } from '../ui/DataTable';
import { ImportExportActions } from '../ui/ImportExportActions';
import { FileImportDialog } from '../components/FileImportDialog';
import { ClipboardImportDialog } from '../components/ClipboardImportDialog';
import { ExportKeysDialog } from '../components/ExportKeysDialog';
import '../styles/pages/keys.css';

type SortField = 'label' | 'status' | 'lastUsedAt' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type KeyProvider = 'tavily' | 'brave';

const PAGE_SIZE = 10;

// ─── Sub-component: Create Key Drawer ───────────────────────────────────────

function KeysCreateDrawer({
  open,
  provider,
  creating,
  label,
  apiKey,
  touched,
  formErrors,
  isFormValid,
  onClose,
  onLabelChange,
  onApiKeyChange,
  onLabelBlur,
  onApiKeyBlur,
  onSubmit,
}: {
  open: boolean;
  provider: KeyProvider;
  creating: boolean;
  label: string;
  apiKey: string;
  touched: { label?: boolean; apiKey?: boolean };
  formErrors: { label?: string; apiKey?: string };
  isFormValid: boolean;
  onClose: () => void;
  onLabelChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
  onLabelBlur: () => void;
  onApiKeyBlur: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation('keys');
  const { t: tc } = useTranslation('common');

  const isTavily = provider === 'tavily';
  const titleKey = isTavily ? 'tavily.dialog.addTitle' : 'brave.dialog.addTitle';
  const placeholderKey = isTavily ? 'form.apiKeyPlaceholder' : 'brave.form.apiKeyPlaceholder';
  const helpKey = isTavily ? 'form.apiKeyHelp' : 'form.apiKeyHelp';
  const formatHintKey = isTavily ? 'form.apiKeyFormat' : 'brave.form.apiKeyFormat';

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && isFormValid && !creating) {
      onSubmit();
    }
  }

  return (
    <Drawer title={t(titleKey)} open={open} onClose={() => creating ? undefined : onClose()}>
      <div className="stack" onKeyDown={handleKeyDown}>
        {/* Label field */}
        <div className="stack" style={{ gap: 'var(--space-1)' }}>
          <label className="label" htmlFor="key-create-label">
            {t('form.label')}
            <span className="fieldRequired" aria-hidden="true"> {t('form.required')}</span>
          </label>
          <input
            id="key-create-label"
            className="input"
            aria-required="true"
            data-error={!!(formErrors.label && touched.label) || undefined}
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={onLabelBlur}
            placeholder={t('form.labelPlaceholder')}
            autoComplete="off"
            aria-invalid={!!(formErrors.label && touched.label)}
            aria-describedby={
              formErrors.label && touched.label ? 'key-create-label-error' : 'key-create-label-help'
            }
          />
          {formErrors.label && touched.label ? (
            <span id="key-create-label-error" className="fieldError" role="alert">
              {formErrors.label}
            </span>
          ) : (
            <span id="key-create-label-help" className="help">
              {t('form.labelHelp')}
            </span>
          )}
        </div>

        {/* API Key field */}
        <div className="stack" style={{ gap: 'var(--space-1)' }}>
          <label className="label" htmlFor="key-create-apikey">
            {t('form.apiKey')}
            <span className="fieldRequired" aria-hidden="true"> {t('form.required')}</span>
          </label>
          <input
            id="key-create-apikey"
            className="input mono"
            type="password"
            aria-required="true"
            data-error={!!(formErrors.apiKey && touched.apiKey) || undefined}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            onBlur={onApiKeyBlur}
            placeholder={t(placeholderKey)}
            autoComplete="new-password"
            aria-invalid={!!(formErrors.apiKey && touched.apiKey)}
            aria-describedby={
              formErrors.apiKey && touched.apiKey ? 'key-create-apikey-error' : 'key-create-apikey-help'
            }
          />
          {formErrors.apiKey && touched.apiKey ? (
            <span id="key-create-apikey-error" className="fieldError" role="alert">
              {formErrors.apiKey}
            </span>
          ) : (
            <span id="key-create-apikey-help" className="help">
              {isTavily ? t(helpKey) : t(formatHintKey)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={creating}
          >
            {tc('actions.cancel')}
          </button>
          <button
            type="button"
            className="btn"
            data-variant="primary"
            onClick={onSubmit}
            disabled={creating || !isFormValid}
          >
            <IconKey />
            {creating ? t('button.adding') : t('actions.addKey')}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function KeysPage({ api }: { api: AdminApi }) {
  const { t } = useTranslation('keys');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Provider segmented control
  const [provider, setProvider] = useState<KeyProvider>('tavily');

  // ─── Tavily state ────────────────────────────────────────────────────────
  const [keys, setKeys] = useState<TavilyKeyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingCredits, setSyncingCredits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Brave state ─────────────────────────────────────────────────────────
  const [braveKeys, setBraveKeys] = useState<BraveKeyDto[]>([]);
  const [braveLoading, setBraveLoading] = useState(true);
  const [braveError, setBraveError] = useState<string | null>(null);

  // ─── Shared filter/sort state (reset on provider switch) ─────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<DataTableSortConfig>({ columnId: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);

  // Reset filters when switching provider
  useEffect(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortConfig({ columnId: 'createdAt', dir: 'desc' });
    setPage(1);
  }, [provider]);

  // ─── Multi-select (Tavily only) ───────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Create drawer state ──────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [touched, setTouched] = useState<{ label?: boolean; apiKey?: boolean }>({});

  // ─── Delete state ─────────────────────────────────────────────────────────
  const [keyToDelete, setKeyToDelete] = useState<TavilyKeyDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [braveKeyToDelete, setBraveKeyToDelete] = useState<BraveKeyDto | null>(null);
  const [braveDeleting, setBraveDeleting] = useState(false);

  // ─── Import/Export state ──────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [clipboardImportOpen, setClipboardImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportInitialAction, setExportInitialAction] = useState<'file' | 'clipboard'>('file');

  // ─── Deep-link ?create=1 ──────────────────────────────────────────────────
  const createFromUrl = searchParams.get('create');
  useEffect(() => {
    if (createFromUrl !== '1') return;
    setCreateOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [createFromUrl, searchParams, setSearchParams]);

  // ─── Data loading ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await api.listKeys());
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : tc('errors.unknownError'));
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [api, tc]);

  const loadBraveKeys = useCallback(async () => {
    setBraveLoading(true);
    setBraveError(null);
    try {
      setBraveKeys(await api.listBraveKeys());
    } catch (e: any) {
      setBraveError(typeof e?.message === 'string' ? e.message : tc('errors.unknownError'));
      setBraveKeys([]);
    } finally {
      setBraveLoading(false);
    }
  }, [api, tc]);

  useEffect(() => {
    void load();
    void loadBraveKeys();
  }, [load, loadBraveKeys]);

  // ─── Sort toggle ──────────────────────────────────────────────────────────
  const handleSort = useCallback((columnId: string) => {
    setSortConfig((prev) => ({
      columnId,
      dir: prev.columnId === columnId && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  }, []);

  // ─── Filtered + sorted Tavily keys ───────────────────────────────────────
  const filteredKeys = useMemo(() => {
    let result = keys;
    if (searchQuery.trim()) {
      result = result.filter((k) => k.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      result = result.filter((k) => k.status === statusFilter);
    }
    return [...result].sort((a, b) => {
      let cmp = 0;
      const col = sortConfig.columnId as SortField;
      if (col === 'label') cmp = a.label.localeCompare(b.label);
      else if (col === 'status') cmp = a.status.localeCompare(b.status);
      else if (col === 'lastUsedAt') cmp = (a.lastUsedAt || '').localeCompare(b.lastUsedAt || '');
      else cmp = a.createdAt.localeCompare(b.createdAt); // createdAt default
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });
  }, [keys, searchQuery, statusFilter, sortConfig]);

  const paginatedKeys = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredKeys.slice(start, start + PAGE_SIZE);
  }, [filteredKeys, page]);

  // Reset page when filters change (but not on sort — sort keeps page)
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter]);

  // ─── Filtered + sorted Brave keys ─────────────────────────────────────────
  const filteredBraveKeys = useMemo(() => {
    let result = braveKeys;
    if (searchQuery.trim()) {
      result = result.filter((k) => k.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      result = result.filter((k) => k.status === statusFilter);
    }
    return [...result].sort((a, b) => {
      let cmp = 0;
      const col = sortConfig.columnId as SortField;
      if (col === 'label') cmp = a.label.localeCompare(b.label);
      else if (col === 'status') cmp = a.status.localeCompare(b.status);
      else if (col === 'lastUsedAt') cmp = (a.lastUsedAt || '').localeCompare(b.lastUsedAt || '');
      else cmp = a.createdAt.localeCompare(b.createdAt);
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });
  }, [braveKeys, searchQuery, statusFilter, sortConfig]);

  const paginatedBraveKeys = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBraveKeys.slice(start, start + PAGE_SIZE);
  }, [filteredBraveKeys, page]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const tavilyStats = useMemo(() => {
    const active = keys.filter((k) => k.status === 'active').length;
    const totalCredits = keys.reduce((sum, k) => sum + (k.remainingCredits || 0), 0);
    const activeRate = keys.length > 0 ? Math.round((active / keys.length) * 100) : 0;
    const cooldown = keys.filter((k) => k.status === 'cooldown').length;
    const invalid = keys.filter((k) => k.status === 'invalid').length;
    const disabled = keys.filter((k) => k.status === 'disabled').length;
    return { active, disabled, cooldown, invalid, total: keys.length, totalCredits, activeRate };
  }, [keys]);

  const braveStats = useMemo(() => {
    const active = braveKeys.filter((k) => k.status === 'active').length;
    const activeRate = braveKeys.length > 0 ? Math.round((active / braveKeys.length) * 100) : 0;
    const invalid = braveKeys.filter((k) => k.status === 'invalid').length;
    const disabled = braveKeys.filter((k) => k.status === 'disabled').length;
    return { active, disabled, invalid, total: braveKeys.length, activeRate };
  }, [braveKeys]);

  // ─── Create form validation ───────────────────────────────────────────────
  const formErrors = useMemo(() => {
    const errors: { label?: string; apiKey?: string } = {};
    if (touched.label && !newLabel.trim()) errors.label = t('form.labelRequired');
    else if (touched.label && newLabel.length < 2) errors.label = t('form.labelMinLength');
    if (touched.apiKey && !newApiKey.trim()) errors.apiKey = t('form.apiKeyRequired');
    else if (touched.apiKey && provider === 'tavily' && !newApiKey.startsWith('tvly-'))
      errors.apiKey = t('form.apiKeyFormat');
    return errors;
  }, [newLabel, newApiKey, touched, provider, t]);

  const isFormValid =
    !formErrors.label && !formErrors.apiKey && newLabel.trim().length >= 2 && newApiKey.trim().length > 0 &&
    (provider !== 'tavily' || newApiKey.startsWith('tvly-'));

  function openCreate() {
    setNewLabel('');
    setNewApiKey('');
    setTouched({});
    setCreateOpen(true);
  }

  function closeCreate() {
    if (creating) return;
    setCreateOpen(false);
  }

  // ─── Create actions ───────────────────────────────────────────────────────
  async function onCreate() {
    if (!isFormValid) return;
    setCreating(true);
    try {
      if (provider === 'tavily') {
        await api.createKey({ label: newLabel.trim(), apiKey: newApiKey.trim() });
      } else {
        await api.createBraveKey({ label: newLabel.trim(), apiKey: newApiKey.trim() });
      }
      toast.push({ title: t('toast.added'), message: t('toast.addedMessage', { name: newLabel.trim() }), variant: 'success' });
      setCreateOpen(false);
      setNewLabel('');
      setNewApiKey('');
      setTouched({});
      if (provider === 'tavily') { await load(); } else { await loadBraveKeys(); }
    } catch (e: any) {
      toast.push({ title: t('toast.createFailed'), message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError'), variant: 'error' });
    } finally {
      setCreating(false);
    }
  }

  // ─── Update status ────────────────────────────────────────────────────────
  async function onUpdateTavilyStatus(id: string, status: TavilyKeyStatus) {
    try {
      await api.updateKeyStatus(id, status);
      toast.push({ title: t('toast.updated'), message: t('toast.updatedMessage', { status }), variant: 'success' });
      await load();
    } catch (e: any) {
      toast.push({ title: t('toast.updateFailed'), message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError'), variant: 'error' });
    }
  }

  async function onUpdateBraveStatus(id: string, status: BraveKeyStatus) {
    try {
      await api.updateBraveKeyStatus(id, status);
      toast.push({ title: t('toast.updated'), message: t('toast.updatedMessage', { status }), variant: 'success' });
      await loadBraveKeys();
    } catch (e: any) {
      toast.push({ title: t('toast.updateFailed'), message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError'), variant: 'error' });
    }
  }

  // ─── Delete (Tavily single) ───────────────────────────────────────────────
  async function onDeleteKey() {
    if (!keyToDelete) return;
    setDeleting(true);
    try {
      await api.deleteKey(keyToDelete.id);
      toast.push({ title: t('toast.deleted'), message: t('toast.deletedMessage', { name: keyToDelete.label }), variant: 'success' });
      setKeyToDelete(null);
      await load();
    } catch (e: any) {
      toast.push({ title: t('toast.deleteFailed'), message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError'), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  // ─── Delete (Brave single) ────────────────────────────────────────────────
  async function onDeleteBraveKey() {
    if (!braveKeyToDelete) return;
    setBraveDeleting(true);
    try {
      await api.deleteBraveKey(braveKeyToDelete.id);
      toast.push({ title: t('toast.deleted'), message: t('toast.deletedMessage', { name: braveKeyToDelete.label }), variant: 'success' });
      setBraveKeyToDelete(null);
      await loadBraveKeys();
    } catch (e: any) {
      toast.push({ title: t('toast.deleteFailed'), message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError'), variant: 'error' });
    } finally {
      setBraveDeleting(false);
    }
  }

  // ─── Sync-all credits (Tavily) ────────────────────────────────────────────
  async function onSyncAll() {
    if (syncingCredits) return;
    setSyncingCredits(true);
    try {
      toast.push({ title: t('toast.checkingCredits'), message: t('toast.checkingCreditsMessage'), variant: 'info' });
      const result = await api.syncAllKeyCredits();
      toast.push({
        title: t('toast.creditsUpdated'),
        message: t('toast.creditsUpdatedMessage', { total: result.total, success: result.success, failed: result.failed }),
        variant: result.failed > 0 ? 'warning' : 'success',
      });
      await load();
    } catch (e: any) {
      toast.push({ title: t('toast.syncFailed'), message: e.message, variant: 'error' });
    } finally {
      setSyncingCredits(false);
    }
  }

  // ─── Multi-select (Tavily) ────────────────────────────────────────────────
  function toggleSelectAll() {
    if (selectedIds.size === paginatedKeys.length && paginatedKeys.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedKeys.map((k) => k.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkRefreshCredits() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    toast.push({ title: t('toast.syncing'), message: t('toast.syncingMessage', { count: ids.length }), variant: 'info' });
    try {
      await Promise.all(ids.map((id) => api.refreshKeyCredits(id)));
      toast.push({ title: t('toast.syncSuccess'), message: t('toast.syncSuccessMessage', { count: ids.length }), variant: 'success' });
      clearSelection();
      await load();
    } catch (e: any) {
      toast.push({ title: t('toast.bulkRefreshFailed'), message: e.message, variant: 'error' });
    }
  }

  function bulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleteIds(ids);
  }

  async function onBulkDelete() {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;
    setBulkDeleting(true);
    toast.push({ title: t('toast.bulkDeleting'), message: t('toast.bulkDeletingMessage', { count: bulkDeleteIds.length }), variant: 'info' });
    try {
      await Promise.all(bulkDeleteIds.map((id) => api.deleteKey(id)));
      toast.push({ title: t('toast.bulkDeleted'), message: t('toast.bulkDeletedMessage', { count: bulkDeleteIds.length }), variant: 'success' });
      clearSelection();
      setBulkDeleteIds(null);
      await load();
    } catch (e: any) {
      toast.push({ title: t('toast.bulkDeleteFailed'), message: e.message, variant: 'error' });
    } finally {
      setBulkDeleting(false);
    }
  }

  // ─── Import/Export ────────────────────────────────────────────────────────
  const openExport = (mode: 'file' | 'clipboard') => {
    setExportInitialAction(mode);
    setExportOpen(true);
  };

  const handleImport = async (data: any) => {
    const result = await api.importKeys(data);
    await load();
    await loadBraveKeys();
    return result;
  };

  // ─── Derived flags ────────────────────────────────────────────────────────
  const hasFilters = searchQuery.trim() || statusFilter !== 'all';
  const isTavily = provider === 'tavily';
  const currentLoading = isTavily ? loading : braveLoading;
  const currentError = isTavily ? error : braveError;
  const currentRetry = isTavily ? load : loadBraveKeys;

  function clearFilters() {
    setSearchQuery('');
    setStatusFilter('all');
  }

  // ─── Tavily DataTable columns ─────────────────────────────────────────────
  const tavilyColumns = useMemo((): DataTableColumn<TavilyKeyDto>[] => [
    {
      id: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedIds.size === paginatedKeys.length && paginatedKeys.length > 0}
          onChange={toggleSelectAll}
          aria-label={t('table.selectAll')}
          style={{ cursor: 'pointer' }}
        />
      ),
      headerStyle: { width: 40 },
      dataLabel: t('table.select'),
      cell: (k: TavilyKeyDto) => (
        <input
          type="checkbox"
          checked={selectedIds.has(k.id)}
          onChange={() => toggleSelect(k.id)}
          aria-label={t('table.selectKey', { label: k.label })}
          style={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      id: 'label',
      header: t('table.label'),
      headerStyle: { width: '15%' },
      dataLabel: t('table.label'),
      cellClassName: 'mono',
      sortable: true,
      cell: (k: TavilyKeyDto) => k.label,
    },
    {
      id: 'key',
      header: t('table.apiKey'),
      headerStyle: { width: '22%' },
      dataLabel: t('table.apiKey'),
      cell: (k: TavilyKeyDto) => (
        <KeyRevealCell keyId={k.id} maskedKey={k.maskedKey || '••••••••••••'} api={api} provider="tavily" />
      ),
    },
    {
      id: 'credits',
      header: t('table.credits'),
      headerStyle: { width: '18%' },
      dataLabel: t('table.credits'),
      cell: (k: TavilyKeyDto) => (
        <KeyCreditsCell
          keyId={k.id}
          remaining={k.remainingCredits}
          total={k.totalCredits}
          lastChecked={k.lastCheckedAt}
          api={api}
          onUpdate={load}
        />
      ),
    },
    {
      id: 'status',
      header: t('table.status'),
      headerStyle: { width: '11%' },
      dataLabel: t('table.status'),
      sortable: true,
      cell: (k: TavilyKeyDto) => (
        <StatusMenu
          status={k.status}
          onChange={(s) => onUpdateTavilyStatus(k.id, s as TavilyKeyStatus)}
        />
      ),
    },
    {
      id: 'lastUsedAt',
      header: t('table.lastUsed'),
      headerStyle: { width: '13%' },
      dataLabel: t('table.lastUsed'),
      cellClassName: 'mono',
      sortable: true,
      cell: (k: TavilyKeyDto) => formatDateTime(k.lastUsedAt),
    },
    {
      id: 'createdAt',
      header: t('table.created'),
      headerStyle: { width: '13%' },
      dataLabel: t('table.created'),
      cellClassName: 'mono',
      sortable: true,
      cell: (k: TavilyKeyDto) => formatDateTime(k.createdAt),
    },
    {
      id: 'actions',
      header: '',
      headerStyle: { width: '8%', textAlign: 'right' },
      headerAlign: 'right',
      dataLabel: t('table.actions'),
      cellAlign: 'right',
      cell: (k: TavilyKeyDto) => (
        <IconButton
          icon={<IconTrash />}
          variant="ghost-danger"
          onClick={() => setKeyToDelete(k)}
          title={t('button.deleteKey')}
          aria-label={t('button.deleteKey')}
        />
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [selectedIds, paginatedKeys, t, api, load]);

  // ─── Brave DataTable columns ──────────────────────────────────────────────
  const braveColumns = useMemo((): DataTableColumn<BraveKeyDto>[] => [
    {
      id: 'label',
      header: t('table.label'),
      headerStyle: { width: '20%' },
      dataLabel: t('table.label'),
      cellClassName: 'mono',
      sortable: true,
      cell: (k: BraveKeyDto) => k.label,
    },
    {
      id: 'key',
      header: t('table.apiKey'),
      headerStyle: { width: '30%' },
      dataLabel: t('table.apiKey'),
      cell: (k: BraveKeyDto) => (
        <KeyRevealCell keyId={k.id} maskedKey={k.maskedKey || '••••••••••••'} api={api} provider="brave" />
      ),
    },
    {
      id: 'status',
      header: t('table.status'),
      headerStyle: { width: '14%' },
      dataLabel: t('table.status'),
      sortable: true,
      cell: (k: BraveKeyDto) => (
        <StatusMenu
          status={k.status}
          options={['active', 'disabled', 'invalid']}
          onChange={(s) => onUpdateBraveStatus(k.id, s as BraveKeyStatus)}
        />
      ),
    },
    {
      id: 'lastUsedAt',
      header: t('table.lastUsed'),
      headerStyle: { width: '16%' },
      dataLabel: t('table.lastUsed'),
      cellClassName: 'mono',
      sortable: true,
      cell: (k: BraveKeyDto) => formatDateTime(k.lastUsedAt),
    },
    {
      id: 'createdAt',
      header: t('table.created'),
      headerStyle: { width: '15%' },
      dataLabel: t('table.created'),
      cellClassName: 'mono',
      sortable: true,
      cell: (k: BraveKeyDto) => formatDateTime(k.createdAt),
    },
    {
      id: 'actions',
      header: '',
      headerStyle: { width: '5%', textAlign: 'right' },
      headerAlign: 'right',
      dataLabel: t('table.actions'),
      cellAlign: 'right',
      cell: (k: BraveKeyDto) => (
        <IconButton
          icon={<IconTrash />}
          variant="ghost-danger"
          onClick={() => setBraveKeyToDelete(k)}
          title={t('button.deleteKey')}
          aria-label={t('button.deleteKey')}
        />
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, api]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-keys stack">
      {/* ── Provider segmented control ── */}
      <div className="keys-providerRow">
        <SegmentedControl
          aria-label={t('providerSwitch.ariaLabel')}
          value={provider}
          onChange={(v) => { setProvider(v as KeyProvider); clearSelection(); }}
          options={[
            {
              value: 'tavily' as KeyProvider,
              label: (
                <span className="keys-providerLabel">
                  {t('tabs.tavily')}
                  <span className="keys-providerCount">{keys.length}</span>
                </span>
              ),
              ariaLabel: `${t('tabs.tavily')} (${keys.length})`,
            },
            {
              value: 'brave' as KeyProvider,
              label: (
                <span className="keys-providerLabel">
                  {t('tabs.brave')}
                  <span className="keys-providerCount">{braveKeys.length}</span>
                </span>
              ),
              ariaLabel: `${t('tabs.brave')} (${braveKeys.length})`,
            },
          ]}
        />
      </div>

      {/* ── KPI row ── */}
      {isTavily ? (
        <div className="kpis">
          <KpiCard
            title={t('tavily.kpi.totalCapacity')}
            value={tavilyStats.totalCredits.toLocaleString()}
            icon={<IconToken />}
            variant="tokens"
          />
          <KpiCard
            title={t('tavily.kpi.activeKeys')}
            value={`${tavilyStats.active}/${tavilyStats.total}`}
            icon={<IconKey />}
            variant="keys"
          />
          <KpiCard
            title={t('tavily.kpi.systemHealth')}
            value={`${tavilyStats.activeRate}%`}
            icon={<IconShield />}
            variant="usage"
          />
        </div>
      ) : (
        <div className="kpis">
          <KpiCard
            title={t('brave.kpi.activeKeys')}
            value={`${braveStats.active}/${braveStats.total}`}
            icon={<IconKey />}
            variant="keys"
          />
          <KpiCard
            title={t('brave.kpi.systemHealth')}
            value={`${braveStats.activeRate}%`}
            icon={<IconShield />}
            variant="usage"
          />
        </div>
      )}

      {/* ── Table card ── */}
      <div className="card">
        {/* Table toolbar */}
        <div className="tableToolbar">
          {/* Search */}
          <div className="tableToolbarSearch searchInput">
            <div className="searchInputIcon" aria-hidden="true">
              <IconSearch />
            </div>
            <input
              type="search"
              className="input"
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="tableToolbarFilters">
            <select
              className="select"
              aria-label={t('table.status')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="all">{t('filter.allStatuses')}</option>
              <option value="active">{t('filter.active')}</option>
              <option value="disabled">{t('filter.disabled')}</option>
              {isTavily && <option value="cooldown">{t('filter.cooldown')}</option>}
              <option value="invalid">{t('filter.invalid')}</option>
            </select>

            {/* Results count + clear */}
            <span className="keys-filterCount">
              {t('search.showing', {
                filtered: isTavily ? filteredKeys.length : filteredBraveKeys.length,
                total: isTavily ? keys.length : braveKeys.length,
              })}
            </span>
            {hasFilters && (
              <button className="btn" data-variant="ghost" onClick={clearFilters} style={{ height: 28, fontSize: 'var(--text-xs)' }}>
                {t('search.clearFilters')}
              </button>
            )}
          </div>

          {/* Right-side actions */}
          <div className="tableToolbarActions">
            {/* Tavily-only: import/export + sync-all */}
            {isTavily && (
              <>
                <ImportExportActions
                  onExportToFile={() => openExport('file')}
                  onExportToClipboard={() => openExport('clipboard')}
                  onImportFromFile={() => setImportOpen(true)}
                  onImportFromClipboard={() => setClipboardImportOpen(true)}
                  loading={exportOpen}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={onSyncAll}
                  title={t('tavily.actions.checkCredits')}
                  disabled={syncingCredits}
                  aria-label={syncingCredits ? t('tavily.actions.checkingCredits') : t('tavily.actions.checkCredits')}
                >
                  <IconRefresh className={syncingCredits ? 'spin' : ''} aria-hidden="true" />
                  {syncingCredits ? t('tavily.actions.checkingCredits') : t('tavily.actions.checkCredits')}
                </button>
              </>
            )}

            {/* Refresh list */}
            <button
              type="button"
              className="btn"
              onClick={currentRetry}
              disabled={currentLoading}
              aria-label={t('actions.refresh')}
            >
              <IconRefresh className={currentLoading ? 'spin' : ''} aria-hidden="true" />
              {t('actions.refresh')}
            </button>

            {/* Add key primary action */}
            <button
              type="button"
              className="btn"
              data-variant="primary"
              onClick={openCreate}
            >
              <IconPlus aria-hidden="true" />
              {isTavily ? t('tavily.actions.addKey') : t('brave.actions.addKey')}
            </button>
          </div>
        </div>

        {/* Bulk-action bar (Tavily only, slides in on selection) */}
        {isTavily && selectedIds.size > 0 && (
          <div className="bulkActionsBar">
            <div className="bulkActionsInfo">
              <strong>{selectedIds.size}</strong>{' '}
              {selectedIds.size === 1 ? t('bulk.selectedCount_one', { count: 1 }) : t('bulk.selectedCount_other', { count: selectedIds.size })}
            </div>
            <div className="bulkActionsButtons">
              <button type="button" className="btn btn--sm" onClick={bulkRefreshCredits}>
                <IconRefresh aria-hidden="true" />
                {t('bulk.refreshCredits')}
              </button>
              <button type="button" className="btn btn--sm" data-variant="danger" onClick={bulkDelete}>
                <IconTrash aria-hidden="true" />
                {t('bulk.deleteSelected')}
              </button>
              <button type="button" className="btn btn--sm" data-variant="ghost" onClick={clearSelection}>
                {t('bulk.clearSelection')}
              </button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {currentError && (
          <div className="keys-errorWrap">
            <ErrorBanner message={currentError} onRetry={currentRetry} retrying={currentLoading} />
          </div>
        )}

        {/* DataTable */}
        <div className="cardBody p-0">
          {isTavily ? (
            <DataTable<TavilyKeyDto>
              ariaLabel={t('tavily.title')}
              columns={tavilyColumns}
              rows={paginatedKeys}
              rowKey={(k) => k.id}
              loading={loading && keys.length === 0}
              sortConfig={sortConfig}
              onSort={handleSort}
              empty={
                <EmptyState
                  icon={<IconKey />}
                  message={hasFilters ? t('empty.noMatch') : t('tavily.empty.noKeys')}
                  action={
                    hasFilters
                      ? { label: t('search.clearFilters'), onClick: clearFilters, variant: 'ghost' }
                      : { label: t('tavily.actions.addKey'), onClick: openCreate }
                  }
                />
              }
            />
          ) : (
            <DataTable<BraveKeyDto>
              ariaLabel={t('brave.title')}
              columns={braveColumns}
              rows={paginatedBraveKeys}
              rowKey={(k) => k.id}
              loading={braveLoading && braveKeys.length === 0}
              sortConfig={sortConfig}
              onSort={handleSort}
              empty={
                <EmptyState
                  icon={<IconKey />}
                  message={hasFilters ? t('empty.noMatch') : t('brave.empty.noKeys')}
                  action={
                    hasFilters
                      ? { label: t('search.clearFilters'), onClick: clearFilters, variant: 'ghost' }
                      : { label: t('brave.actions.addKey'), onClick: openCreate }
                  }
                />
              }
            />
          )}

          <Pagination
            total={isTavily ? filteredKeys.length : filteredBraveKeys.length}
            page={page}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      </div>

      {/* ── Create key drawer ── */}
      <KeysCreateDrawer
        open={createOpen}
        provider={provider}
        creating={creating}
        label={newLabel}
        apiKey={newApiKey}
        touched={touched}
        formErrors={formErrors}
        isFormValid={isFormValid}
        onClose={closeCreate}
        onLabelChange={setNewLabel}
        onApiKeyChange={setNewApiKey}
        onLabelBlur={() => setTouched((p) => ({ ...p, label: true }))}
        onApiKeyBlur={() => setTouched((p) => ({ ...p, apiKey: true }))}
        onSubmit={onCreate}
      />

      {/* ── Tavily single-delete confirm ── */}
      <ConfirmDialog
        open={!!keyToDelete}
        title={t('dialog.deleteTitle')}
        description={t('dialog.deleteDescription', { label: keyToDelete?.label ?? '' })}
        confirmLabel={tc('actions.delete')}
        confirmVariant="danger"
        requireText="DELETE"
        requireTextLabel={t('dialog.requireDeleteText')}
        confirming={deleting}
        onClose={() => (deleting ? null : setKeyToDelete(null))}
        onConfirm={onDeleteKey}
      />

      {/* ── Tavily bulk-delete confirm ── */}
      <ConfirmDialog
        open={bulkDeleteIds !== null}
        title={t('dialog.deleteSelectedTitle')}
        description={t('dialog.deleteSelectedDescription', { count: bulkDeleteIds?.length ?? 0 })}
        confirmLabel={tc('actions.delete')}
        confirmVariant="danger"
        requireText="DELETE"
        requireTextLabel={t('dialog.requireDeleteSelectedText')}
        confirming={bulkDeleting}
        onClose={() => (bulkDeleting ? null : setBulkDeleteIds(null))}
        onConfirm={onBulkDelete}
      />

      {/* ── Brave single-delete confirm ── */}
      <ConfirmDialog
        open={!!braveKeyToDelete}
        title={t('dialog.deleteTitle')}
        description={t('dialog.deleteDescription', { label: braveKeyToDelete?.label ?? '' })}
        confirmLabel={tc('actions.delete')}
        confirmVariant="danger"
        requireText="DELETE"
        requireTextLabel={t('dialog.requireDeleteText')}
        confirming={braveDeleting}
        onClose={() => (braveDeleting ? null : setBraveKeyToDelete(null))}
        onConfirm={onDeleteBraveKey}
      />

      {/* ── Import/Export dialogs (Tavily) ── */}
      <FileImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={handleImport}
      />

      <ClipboardImportDialog
        open={clipboardImportOpen}
        onClose={() => setClipboardImportOpen(false)}
        onConfirm={handleImport}
      />

      <ExportKeysDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        api={api}
        initialAction={exportInitialAction}
      />
    </div>
  );
}
