import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { AdminApi, ClientTokenDto } from '../lib/adminApi';
import { formatDateTime, formatRelativeDate } from '../lib/format';
import {
  deriveTokenStatus,
  tokenStatusVariant,
  resolveExpiresInSeconds,
  type ExpiryPreset,
  type TokenStatus
} from '../lib/tokenStatus';
import { useDebounce } from '../lib/useDebounce';
import { MCP_SETUP_TARGETS, resolveMcpUrl } from '../app/mcpSetupTemplates';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CopyButton } from '../ui/CopyButton';
import { Drawer } from '../ui/Drawer';
import { ActionMenu } from '../ui/ActionMenu';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TokenReveal } from '../ui/Reveal';
import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconPlus,
  IconRefresh,
  IconToken,
  IconSearch,
  IconTrash,
  IconX
} from '../ui/icons';
import { Pagination } from '../ui/Pagination';
import { useToast } from '../ui/toast';
import { ErrorBanner } from '../ui/ErrorBanner';
import { EmptyState } from '../ui/EmptyState';
import { DataTable, type DataTableColumn } from '../ui/DataTable';

import '../styles/pages/tokens.css';

const PAGE_SIZE = 10;

const TOOL_GROUPS: { id: string; tools: string[] }[] = [
  {
    id: 'tavily',
    tools: [
      'tavily_search',
      'tavily_extract',
      'tavily_crawl',
      'tavily_map',
      'tavily_research'
    ]
  },
  {
    id: 'brave',
    tools: ['brave_web_search', 'brave_local_search']
  }
];

const ALL_TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);

const EXPIRY_PRESETS: ExpiryPreset[] = [
  'never',
  '1h',
  '24h',
  '7d',
  '30d',
  '90d',
  'custom'
];

const STATUS_ICONS: Record<TokenStatus, React.ComponentType<{ className?: string }>> = {
  active: IconCheck,
  expiring: IconAlertCircle,
  expired: IconClock,
  revoked: IconX
};

type StatusFilter = 'all' | TokenStatus;

// ---- Create Drawer — Step 1: Configuration ----

interface CreateStep1Props {
  t: (k: string, opts?: Record<string, unknown>) => string;
  tc: (k: string, opts?: Record<string, unknown>) => string;
  description: string;
  setDescription: (v: string) => void;
  expiryPreset: ExpiryPreset;
  setExpiryPreset: (v: ExpiryPreset) => void;
  customDuration: number;
  setCustomDuration: (v: number) => void;
  customUnit: 'hours' | 'days';
  setCustomUnit: (v: 'hours' | 'days') => void;
  restrictTools: boolean;
  setRestrictTools: (v: boolean) => void;
  selectedTools: string[];
  setSelectedTools: React.Dispatch<React.SetStateAction<string[]>>;
  restrictRate: boolean;
  setRestrictRate: (v: boolean) => void;
  rateLimitRpm: number | '';
  setRateLimitRpm: (v: number | '') => void;
  creating: boolean;
  canCreate: boolean;
  onCancel: () => void;
  onCreate: () => void;
  expiryPreviewText: string;
  expiryPresetOptions: { value: ExpiryPreset; label: string }[];
  rateValid: boolean;
  restrictToolsValid: boolean;
}

function TokenCreateStep1({
  t,
  tc,
  description,
  setDescription,
  expiryPreset,
  setExpiryPreset,
  customDuration,
  setCustomDuration,
  customUnit,
  setCustomUnit,
  restrictTools,
  setRestrictTools,
  selectedTools,
  setSelectedTools,
  restrictRate,
  setRestrictRate,
  rateLimitRpm,
  setRateLimitRpm,
  creating,
  canCreate,
  onCancel,
  onCreate,
  expiryPreviewText,
  expiryPresetOptions,
  rateValid,
  restrictToolsValid
}: CreateStep1Props) {
  function toggleGroupAll(groupTools: string[], selectAll: boolean) {
    if (selectAll) {
      setSelectedTools((prev) => {
        const set = new Set(prev);
        groupTools.forEach((tool) => set.add(tool));
        return [...set];
      });
    } else {
      setSelectedTools((prev) => prev.filter((tool) => !groupTools.includes(tool)));
    }
  }

  // Live summary data
  const scopeSummary = restrictTools
    ? selectedTools.length === 0
      ? t('liveSummary.noTools')
      : t('liveSummary.restrictedTools', { count: selectedTools.length })
    : t('liveSummary.allTools');

  const rateSummary = restrictRate && typeof rateLimitRpm === 'number' && rateLimitRpm >= 1
    ? t('liveSummary.rateEnabled', { rpm: rateLimitRpm })
    : t('liveSummary.rateUnlimited');

  return (
    <div className="page-tokens__createStepContent">
      {/* Step indicator */}
      <div className="page-tokens__stepIndicator" aria-label={t('createDrawer.stepIndicator', { current: 1, total: 2 })}>
        <span className="page-tokens__stepDot page-tokens__stepDot--active" />
        <span className="page-tokens__stepDot" />
      </div>

      <div className="stack">
        {/* Description */}
        <div className="stack">
          <label htmlFor="token-description-input" className="label">
            {t('form.description')}
          </label>
          <input
            id="token-description-input"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
            disabled={creating}
          />
          <div className="help">{t('form.descriptionHelp')}</div>
        </div>

        {/* Expiry presets */}
        <div className="stack">
          <div className="label">{t('form.expiresIn')}</div>
          <SegmentedControl
            options={expiryPresetOptions}
            value={expiryPreset}
            onChange={setExpiryPreset}
            aria-label={t('form.expiresIn')}
            size="sm"
          />
          {expiryPreset === 'custom' ? (
            <div className="flex gap-2 items-center mt-2">
              <input
                type="number"
                className="input mono"
                min={1}
                value={customDuration}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setCustomDuration(Number.isFinite(n) && n > 0 ? n : 1);
                }}
                style={{ width: 100 }}
                disabled={creating}
                aria-label={t('form.expiryCustomValue')}
              />
              <select
                className="input"
                style={{ width: 100 }}
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as 'hours' | 'days')}
                disabled={creating}
              >
                <option value="hours">{t('form.expiryCustomUnit_hours')}</option>
                <option value="days">{t('form.expiryCustomUnit_days')}</option>
              </select>
            </div>
          ) : null}
          <div className="expiryPreview">{expiryPreviewText}</div>
        </div>

        {/* Tool access */}
        <div className="stack gap-3">
          <div className="row">
            <div className="label" style={{ marginBottom: 0 }}>
              {t('form.allowedTools')}
            </div>
          </div>
          <SegmentedControl
            options={[
              { value: 'all', label: t('form.allTools') },
              { value: 'restrict', label: t('form.restrictTools') }
            ]}
            value={restrictTools ? 'restrict' : 'all'}
            onChange={(v) => {
              const restrict = v === 'restrict';
              setRestrictTools(restrict);
              if (restrict && selectedTools.length === 0) {
                setSelectedTools([...ALL_TOOLS]);
              }
            }}
            aria-label={t('form.allowedTools')}
            size="sm"
          />

          {restrictTools ? (
            <div className="stack gap-3">
              {TOOL_GROUPS.map((group) => {
                const groupSelected = group.tools.filter((tool) =>
                  selectedTools.includes(tool)
                );
                const allGroupSelected = groupSelected.length === group.tools.length;
                return (
                  <div key={group.id} className="toolGroup">
                    <div className="toolGroupHeader">
                      <span className="toolGroupLabel">{t(`form.groups.${group.id}`)}</span>
                      <button
                        type="button"
                        className="btn btn--xs"
                        data-variant="ghost"
                        onClick={() => toggleGroupAll(group.tools, !allGroupSelected)}
                        disabled={creating}
                      >
                        {allGroupSelected ? t('form.deselectAll') : t('form.selectAll')}
                      </button>
                    </div>
                    <div className="toolCheckList">
                      {group.tools.map((tool) => (
                        <label key={tool} className="toolCheckItem">
                          <input
                            type="checkbox"
                            checked={selectedTools.includes(tool)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTools((prev) => [...prev, tool]);
                              } else {
                                setSelectedTools((prev) =>
                                  prev.filter((t) => t !== tool)
                                );
                              }
                            }}
                            disabled={creating}
                          />
                          <span className="toolCheckItemLabel">{tool}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="help">
                {t('form.selected', {
                  selected: selectedTools.length,
                  total: ALL_TOOLS.length
                })}
              </div>
              {!restrictToolsValid ? (
                <div className="fieldError">{t('form.restrictToolsHint')}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Rate limit */}
        <div className="stack gap-3">
          <div className="row">
            <div className="label" style={{ marginBottom: 0 }}>
              {t('form.rateLimit')}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="checkbox"
                id="restrict-rate-check"
                checked={restrictRate}
                onChange={(e) => setRestrictRate(e.target.checked)}
                disabled={creating}
              />
              <label
                htmlFor="restrict-rate-check"
                style={{ fontSize: 'var(--text-sm)', cursor: 'pointer' }}
              >
                {t('form.enableRateLimit')}
              </label>
            </div>
          </div>
          {restrictRate ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  className="input mono"
                  type="number"
                  min="1"
                  placeholder="60"
                  value={rateLimitRpm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setRateLimitRpm(isNaN(val) ? '' : Math.max(1, val));
                  }}
                  style={{ width: 100 }}
                  disabled={creating}
                />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-mid)' }}>
                  {t('form.requestsPerMinute')}
                </span>
              </div>
              {!rateValid ? (
                <div className="fieldError">{t('form.rateLimitHint')}</div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Live summary */}
        <div className="page-tokens__liveSummary" aria-label={t('liveSummary.label')}>
          <div className="page-tokens__liveSummaryTitle">{t('liveSummary.label')}</div>
          <div className="page-tokens__liveSummaryRow">
            <span className="page-tokens__liveSummaryKey">{t('liveSummary.keyScope')}</span>
            <span className="page-tokens__liveSummaryVal">{scopeSummary}</span>
          </div>
          <div className="page-tokens__liveSummaryRow">
            <span className="page-tokens__liveSummaryKey">{t('liveSummary.keyExpiry')}</span>
            <span className="page-tokens__liveSummaryVal">{expiryPreviewText}</span>
          </div>
          <div className="page-tokens__liveSummaryRow">
            <span className="page-tokens__liveSummaryKey">{t('liveSummary.keyRate')}</span>
            <span className="page-tokens__liveSummaryVal">{rateSummary}</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3">
          <button className="btn" onClick={onCancel} disabled={creating}>
            {tc('actions.cancel')}
          </button>
          <button
            className="btn"
            data-variant="primary"
            onClick={onCreate}
            disabled={!canCreate}
          >
            {creating ? (
              <span className="spin">
                <IconToken />
              </span>
            ) : (
              <IconToken />
            )}
            {t('createDrawer.createAndReveal')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Create Drawer — Step 2: Reveal + Wire-up ----

interface CreateStep2Props {
  t: (k: string, opts?: Record<string, unknown>) => string;
  tc: (k: string, opts?: Record<string, unknown>) => string;
  createdToken: string;
  apiBaseUrl: string;
  origin: string;
  onDone: () => void;
}

function TokenCreateStep2({ t, tc: _tc, createdToken, apiBaseUrl, origin, onDone }: CreateStep2Props) {
  const [activeTargetId, setActiveTargetId] = useState(() => MCP_SETUP_TARGETS[0]?.id ?? 'http-curl');
  const mcpUrl = useMemo(() => resolveMcpUrl({ apiBaseUrl, origin }), [apiBaseUrl, origin]);

  const activeTarget = useMemo(
    () => MCP_SETUP_TARGETS.find((t) => t.id === activeTargetId) ?? MCP_SETUP_TARGETS[0]!,
    [activeTargetId]
  );
  const activeSnippet = useMemo(
    () => activeTarget.render({ apiBaseUrl, origin, clientToken: createdToken }),
    [activeTarget, apiBaseUrl, origin, createdToken]
  );

  return (
    <div className="page-tokens__createStepContent">
      {/* Step indicator */}
      <div className="page-tokens__stepIndicator" aria-label={t('createDrawer.stepIndicator', { current: 2, total: 2 })}>
        <span className="page-tokens__stepDot page-tokens__stepDot--done" />
        <span className="page-tokens__stepDot page-tokens__stepDot--active" />
      </div>

      <div className="stack">
        {/* Security notice */}
        <div className="page-tokens__securityNotice">
          <IconAlertCircle aria-hidden="true" />
          <span>{t('copyDialog.warning')}</span>
        </div>

        {/* Token well — cleartext, copy */}
        <div className="stack">
          <div className="label">{t('copyDialog.copyToken')}</div>
          <div className="tokenWell" aria-label={t('copyDialog.copyToken')}>
            {createdToken}
          </div>
          <CopyButton
            text={createdToken}
            variant="primary"
            label={t('copyDialog.copyToken')}
            buttonText={t('copyDialog.copyToken')}
          />
        </div>

        {/* MCP endpoint (read-only context) */}
        <div className="stack">
          <label className="label" htmlFor="create-step2-mcp-endpoint">
            {t('setup.mcpEndpoint')}
          </label>
          <input
            id="create-step2-mcp-endpoint"
            className="input mono"
            value={mcpUrl}
            readOnly
            tabIndex={-1}
          />
        </div>

        {/* Inline setup snippet */}
        <div className="stack gap-3">
          <div className="label">{t('setup.configSnippets')}</div>
          <SegmentedControl
            options={MCP_SETUP_TARGETS.map((target) => ({
              value: target.id,
              label: target.title
            }))}
            value={activeTargetId}
            onChange={setActiveTargetId}
            aria-label={t('setup.configSnippets')}
            size="sm"
          />
          <div className="help">{activeTarget.description}</div>
          <CopyButton
            text={activeSnippet}
            variant="primary"
            label={t('setup.copySnippet')}
            buttonText={t('setup.copySnippet')}
            disabled={!activeSnippet.trim()}
          />
          <textarea
            className="textarea mono text-xs"
            value={activeSnippet}
            readOnly
            rows={Math.min(14, Math.max(6, activeSnippet.split('\n').length + 1))}
            aria-label={t('setup.configSnippets')}
          />
        </div>

        <div className="flex justify-end">
          <button className="btn" data-variant="primary" onClick={onDone}>
            {t('copyDialog.done')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main page ----

export function TokensPage({ api, apiBaseUrl }: { api: AdminApi; apiBaseUrl: string }) {
  const { t } = useTranslation('tokens');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tokens, setTokens] = useState<ClientTokenDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const debouncedSearch = useDebounce(searchQuery, 250);

  // Create drawer state
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<'form' | 'issued'>('form');
  const [creating, setCreating] = useState(false);
  const [description, setDescription] = useState('');

  // Expiry preset state
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('never');
  const [customDuration, setCustomDuration] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('days');

  // Tools state
  const [restrictTools, setRestrictTools] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([...ALL_TOOLS]);

  // Rate limit state
  const [restrictRate, setRestrictRate] = useState(false);
  const [rateLimitRpm, setRateLimitRpm] = useState<number | ''>('');

  // Post-create
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  // Setup drawer state (separate from create)
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupClientToken, setSetupClientToken] = useState('');
  const [setupTargetId, setSetupTargetId] = useState(() => MCP_SETUP_TARGETS[0]?.id ?? 'http-curl');

  // Revoke state
  const [tokenToRevoke, setTokenToRevoke] = useState<ClientTokenDto | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Delete state
  const [tokenToDelete, setTokenToDelete] = useState<ClientTokenDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // URL param driven open
  const createFromUrl = searchParams.get('create');
  const setupFromUrl = searchParams.get('setup');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const mcpUrl = useMemo(() => resolveMcpUrl({ apiBaseUrl, origin }), [apiBaseUrl, origin]);

  useEffect(() => {
    if (createFromUrl === '1') {
      resetCreateForm();
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
    if (setupFromUrl === '1') {
      setSetupOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete('setup');
      setSearchParams(next, { replace: true });
    }
  }, [createFromUrl, searchParams, setSearchParams, setupFromUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTokens(await api.listTokens());
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : tc('errors.unknownError'));
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [api, tc]);

  useEffect(() => {
    void load();
  }, [load]);

  // Derived stats
  const stats = useMemo(() => {
    const now = new Date();
    const active = tokens.filter((tok) => {
      const st = deriveTokenStatus(tok, now);
      return st === 'active' || st === 'expiring';
    }).length;
    return { active, total: tokens.length };
  }, [tokens]);

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    const now = new Date();
    const q = debouncedSearch.trim().toLowerCase();
    return tokens.filter((tok) => {
      if (q) {
        const prefix = tok.tokenPrefix.toLowerCase();
        const desc = (tok.description ?? '').toLowerCase();
        if (!prefix.includes(q) && !desc.includes(q)) return false;
      }
      if (statusFilter !== 'all') {
        const st = deriveTokenStatus(tok, now);
        if (st !== statusFilter) return false;
      }
      return true;
    });
  }, [tokens, debouncedSearch, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  // Clamp page when result set shrinks
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredTokens.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [filteredTokens.length, page]);

  const paginatedTokens = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTokens.slice(start, start + PAGE_SIZE);
  }, [filteredTokens, page]);

  // ---- Create flow ----
  function resetCreateForm() {
    setDescription('');
    setExpiryPreset('never');
    setCustomDuration(1);
    setCustomUnit('days');
    setRestrictTools(false);
    setSelectedTools([...ALL_TOOLS]);
    setRestrictRate(false);
    setRateLimitRpm('');
    setCreateStep('form');
    setCreatedToken(null);
  }

  function closeCreate() {
    if (creating) return;
    // Clear the created token from state/DOM on close — secret hygiene
    setCreatedToken(null);
    setCreateOpen(false);
    // Defer form reset until the drawer has animated out
    setTimeout(resetCreateForm, 250);
  }

  async function onCreate() {
    setCreating(true);
    try {
      const expiresInSeconds = resolveExpiresInSeconds(expiryPreset, customDuration, customUnit);
      const res = await api.createToken({
        description: description.trim() ? description.trim() : undefined,
        expiresInSeconds,
        allowedTools: restrictTools ? selectedTools : undefined,
        rateLimit:
          restrictRate && typeof rateLimitRpm === 'number'
            ? { requestsPerMinute: rateLimitRpm }
            : undefined
      });
      setCreatedToken(res.token);
      setCreateStep('issued');
      await load();
    } catch (e: any) {
      toast.push({
        title: t('toast.createFailed'),
        message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError')
      });
    } finally {
      setCreating(false);
    }
  }

  // ---- Setup drawer ----
  const setupTarget = useMemo(
    () => MCP_SETUP_TARGETS.find((t) => t.id === setupTargetId) ?? MCP_SETUP_TARGETS[0]!,
    [setupTargetId]
  );
  const setupSnippet = useMemo(
    () => setupTarget.render({ apiBaseUrl, origin, clientToken: setupClientToken }),
    [setupTarget, apiBaseUrl, origin, setupClientToken]
  );

  function closeSetup() {
    setSetupOpen(false);
    // Clear any revealed token from the setup drawer on close — secret hygiene
    setTimeout(() => setSetupClientToken(''), 250);
  }

  // ---- Reveal via TokenReveal ----
  // onRevealToken is passed into TokenReveal as an async factory.
  // TokenReveal manages countdown, auto-clear on blur/hidden/timeout.
  function makeRevealCallback(tok: ClientTokenDto) {
    return async () => {
      const res = await api.revealToken(tok.id);
      return res.token;
    };
  }

  // ---- Configure client from overflow menu ----
  async function onConfigureClient(tok: ClientTokenDto) {
    try {
      const res = await api.revealToken(tok.id);
      setSetupClientToken(res.token);
      setSetupOpen(true);
    } catch (e: any) {
      toast.push({
        title: t('toast.revealFailed'),
        message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError')
      });
    }
  }

  // ---- Revoke ----
  async function onRevokeToken() {
    if (!tokenToRevoke) return;
    setRevoking(true);
    try {
      await api.revokeToken(tokenToRevoke.id);
      toast.push({
        title: t('toast.revoked'),
        message: t('toast.revokedMessage', { prefix: tokenToRevoke.tokenPrefix })
      });
      setTokenToRevoke(null);
      await load();
    } catch (e: any) {
      toast.push({
        title: t('toast.revokeFailed'),
        message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError')
      });
    } finally {
      setRevoking(false);
    }
  }

  // ---- Delete ----
  async function onDeleteToken() {
    if (!tokenToDelete) return;
    setDeleting(true);
    try {
      await api.deleteToken(tokenToDelete.id);
      toast.push({
        title: t('toast.deleted'),
        message: t('toast.deletedMessage', { prefix: tokenToDelete.tokenPrefix })
      });
      setTokenToDelete(null);
      await load();
    } catch (e: any) {
      toast.push({
        title: t('toast.deleteFailed'),
        message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError')
      });
    } finally {
      setDeleting(false);
    }
  }

  // ---- Expiry preview ----
  const expiryPreviewText = useMemo(() => {
    if (expiryPreset === 'never') return t('form.expiryAbsolute_never');
    const secs = resolveExpiresInSeconds(expiryPreset, customDuration, customUnit);
    if (!secs) return t('form.expiryAbsolute_never');
    const expiry = new Date(Date.now() + secs * 1000);
    return t('form.expiryAbsolute_at', { at: formatDateTime(expiry.toISOString()) });
  }, [expiryPreset, customDuration, customUnit, t]);

  // ---- Expiry presets ----
  const expiryPresetOptions = useMemo(
    () =>
      EXPIRY_PRESETS.map((preset) => ({
        value: preset,
        label: t(`form.expiry${preset.charAt(0).toUpperCase() + preset.slice(1)}` as any)
      })),
    [t]
  );

  const restrictToolsValid = !restrictTools || selectedTools.length > 0;
  const rateValid = !restrictRate || (typeof rateLimitRpm === 'number' && rateLimitRpm >= 1);
  const canCreate = !creating && restrictToolsValid && rateValid;

  // ---- Status filter options ----
  const statusFilterOptions = useMemo(
    () => [
      { value: 'all' as StatusFilter, label: t('filter.statusAll') },
      { value: 'active' as StatusFilter, label: t('filter.statusActive') },
      { value: 'expiring' as StatusFilter, label: t('filter.statusExpiring') },
      { value: 'expired' as StatusFilter, label: t('filter.statusExpired') },
      { value: 'revoked' as StatusFilter, label: t('filter.statusRevoked') }
    ],
    [t]
  );

  // Bound time translator for formatRelativeDate
  const timeT = useCallback(
    (key: string, opts?: Record<string, unknown>): string => tc(`time.${key}`, opts as any) as string,
    [tc]
  );

  // ---- Table columns ----
  // We use a ref for revealCallbacks to avoid column re-creation on every render,
  // since makeRevealCallback is stable per token id at render time.
  const revealCallbacksRef = useRef<Map<string, () => Promise<string>>>(new Map());

  const columns = useMemo<DataTableColumn<ClientTokenDto>[]>(() => {
    const now = new Date();
    return [
      {
        id: 'token',
        header: t('table.prefix'),
        dataLabel: t('table.prefix'),
        cell: (tok) => (
          <div className="page-tokens__tokenCell">
            <span className="mono page-tokens__tokenPrefix">{tok.tokenPrefix}</span>
            {tok.description ? (
              <span className="page-tokens__tokenDescription">{tok.description}</span>
            ) : null}
          </div>
        )
      },
      {
        id: 'status',
        header: t('table.status'),
        headerStyle: { width: 130 },
        dataLabel: t('table.status'),
        cell: (tok) => {
          const st = deriveTokenStatus(tok, now);
          const StatusIcon = STATUS_ICONS[st];
          return (
            <span className="badge" data-variant={tokenStatusVariant(st)}>
              <StatusIcon aria-hidden="true" />
              {t(`status.${st}`)}
            </span>
          );
        }
      },
      {
        id: 'scope',
        header: t('table.scope'),
        headerStyle: { width: 150 },
        dataLabel: t('table.scope'),
        cell: (tok) => {
          const toolLabel =
            tok.allowedTools == null
              ? t('scope.allTools')
              : t('scope.nTools', { count: tok.allowedTools.length });
          const toolTitle = tok.allowedTools?.join(', ');
          const rpmLabel =
            tok.rateLimit != null
              ? t('scope.rpm', { count: tok.rateLimit.requestsPerMinute })
              : null;
          return (
            <div className="page-tokens__scopeCell">
              <span className="mono page-tokens__scopeTools" title={toolTitle}>
                {toolLabel}
              </span>
              {rpmLabel ? (
                <span className="mono page-tokens__scopeRate">{rpmLabel}</span>
              ) : null}
            </div>
          );
        }
      },
      {
        id: 'expires',
        header: t('table.expires'),
        headerStyle: { width: 120 },
        dataLabel: t('table.expires'),
        cellClassName: 'mono',
        cell: (tok) => {
          if (!tok.expiresAt)
            return <span className="page-tokens__muted">—</span>;
          return (
            <span
              className="mono"
              title={formatDateTime(tok.expiresAt)}
              style={{ color: 'var(--text-mid)' }}
            >
              {formatRelativeDate(tok.expiresAt, timeT)}
            </span>
          );
        }
      },
      {
        id: 'created',
        header: t('table.created'),
        headerStyle: { width: 120 },
        dataLabel: t('table.created'),
        cellClassName: 'mono',
        cell: (tok) => (
          <span
            className="mono"
            title={formatDateTime(tok.createdAt)}
            style={{ color: 'var(--text-mid)' }}
          >
            {formatRelativeDate(tok.createdAt, timeT)}
          </span>
        )
      },
      {
        id: 'actions',
        header: t('table.actions'),
        headerStyle: { width: 160, textAlign: 'right' },
        headerAlign: 'right',
        dataLabel: t('table.actions'),
        cellAlign: 'right',
        cell: (tok) => {
          const st = deriveTokenStatus(tok, now);
          const isRevoked = st === 'revoked';

          // Stable reveal callback per token id
          if (!revealCallbacksRef.current.has(tok.id)) {
            revealCallbacksRef.current.set(tok.id, makeRevealCallback(tok));
          }
          const revealCb = revealCallbacksRef.current.get(tok.id)!;

          return (
            <div className="page-tokens__actionsCell">
              <TokenReveal
                onReveal={revealCb}
                triggerLabel={t('actions.reveal')}
                copyLabel={t('revealDialog.copyToken')}
              />
              <ActionMenu
                aria-label={t('actions.rowMenuLabel', { prefix: tok.tokenPrefix })}
                options={[
                  {
                    id: 'configure',
                    label: t('actions.configureClient'),
                    onClick: () => void onConfigureClient(tok)
                  },
                  {
                    id: 'revoke',
                    label: t('actions.revoke'),
                    disabled: isRevoked,
                    onClick: () => setTokenToRevoke(tok)
                  },
                  {
                    id: 'delete',
                    label: tc('actions.delete'),
                    danger: true,
                    icon: <IconTrash style={{ width: 15, height: 15 }} />,
                    onClick: () => setTokenToDelete(tok)
                  }
                ]}
              />
            </div>
          );
        }
      }
    ];
  }, [t, tc, timeT]);

  const isFiltered = debouncedSearch.trim() !== '' || statusFilter !== 'all';

  return (
    <div className="stack page-tokens">
      {/* ---- Header card ---- */}
      <div className="card">
        <div className="cardHeader">
          <div>
            <h1 className="page-tokens__pageTitle">{t('title')}</h1>
            <p className="page-tokens__pageSubtitle">
              {t('stats.summary', { total: stats.total, active: stats.active })}
            </p>
          </div>
          <div className="page-tokens__headerActions">
            <button className="btn" data-variant="ghost" onClick={() => setSetupOpen(true)}>
              {t('actions.setupInfo')}
            </button>
            <button className="btn" onClick={load} disabled={loading}>
              <IconRefresh aria-hidden="true" />
              {t('actions.refresh')}
            </button>
            <button
              className="btn"
              data-variant="primary"
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
            >
              <IconPlus aria-hidden="true" />
              {t('actions.createToken')}
            </button>
          </div>
        </div>

        {/* Toolbar: search + status filter */}
        <div className="page-tokens__toolbar">
          <div className="searchInput page-tokens__searchWrap">
            <span className="searchInputIcon">
              <IconSearch aria-hidden="true" />
            </span>
            <input
              type="search"
              className="input"
              placeholder={t('filter.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('filter.searchPlaceholder')}
            />
          </div>
          <SegmentedControl
            options={statusFilterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            aria-label={t('table.status')}
            size="sm"
          />
        </div>

        <div className="cardBody p-0">
          {error ? (
            <div className="p-4">
              <ErrorBanner message={error} onRetry={load} retrying={loading} />
            </div>
          ) : null}

          <DataTable
            ariaLabel={t('title')}
            columns={columns}
            rows={paginatedTokens}
            rowKey={(tok) => tok.id}
            loading={loading}
            getRowProps={(tok) => {
              const st = deriveTokenStatus(tok, new Date());
              return st === 'revoked' ? { className: 'tokenRow--revoked' } : {};
            }}
            empty={
              isFiltered ? (
                <div className="page-tokens__filteredEmpty">
                  <p>{t('filter.noResults')}</p>
                  <button
                    className="btn btn--sm"
                    data-variant="ghost"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    {t('filter.clearFilters')}
                  </button>
                </div>
              ) : (
                <EmptyState
                  icon={<IconToken />}
                  title={t('empty.noTokensTitle')}
                  message={t('empty.noTokens')}
                  action={{
                    label: t('actions.createToken'),
                    onClick: () => {
                      resetCreateForm();
                      setCreateOpen(true);
                    }
                  }}
                  compact
                />
              )
            }
          />
          <Pagination
            total={filteredTokens.length}
            page={page}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      </div>

      {/* ================================================================
          Create Drawer — guided two-step flow
          Step 1: Configure (form + live summary)
          Step 2: Reveal token + inline setup snippet
          ================================================================ */}
      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title={
          createStep === 'form'
            ? t('createDrawer.stepTitle1')
            : t('createDrawer.stepTitle2')
        }
      >
        {createStep === 'form' ? (
          <TokenCreateStep1
            t={t}
            tc={tc}
            description={description}
            setDescription={setDescription}
            expiryPreset={expiryPreset}
            setExpiryPreset={setExpiryPreset}
            customDuration={customDuration}
            setCustomDuration={setCustomDuration}
            customUnit={customUnit}
            setCustomUnit={setCustomUnit}
            restrictTools={restrictTools}
            setRestrictTools={setRestrictTools}
            selectedTools={selectedTools}
            setSelectedTools={setSelectedTools}
            restrictRate={restrictRate}
            setRestrictRate={setRestrictRate}
            rateLimitRpm={rateLimitRpm}
            setRateLimitRpm={setRateLimitRpm}
            creating={creating}
            canCreate={canCreate}
            onCancel={closeCreate}
            onCreate={onCreate}
            expiryPreviewText={expiryPreviewText}
            expiryPresetOptions={expiryPresetOptions}
            rateValid={rateValid}
            restrictToolsValid={restrictToolsValid}
          />
        ) : createdToken ? (
          <TokenCreateStep2
            t={t}
            tc={tc}
            createdToken={createdToken}
            apiBaseUrl={apiBaseUrl}
            origin={origin}
            onDone={closeCreate}
          />
        ) : null}
      </Drawer>

      {/* ================================================================
          Setup Drawer — reachable from "Setup Info" + "Configure client"
          ================================================================ */}
      <Drawer open={setupOpen} onClose={closeSetup} title={t('setup.title')}>
        <div className="stack gap-6">
          <div className="stack">
            <label className="label" htmlFor="mcp-endpoint-input">
              {t('setup.mcpEndpoint')}
            </label>
            <input id="mcp-endpoint-input" className="input mono" value={mcpUrl} readOnly />
            <div className="help">
              {t('setup.mcpEndpointHelp_line1')}
              <code className="mono">{t('setup.mcpEndpointHelp_endpoint')}</code>
              {t('setup.mcpEndpointHelp_line2')}
              <code className="mono">{t('setup.mcpEndpointHelp_header')}</code>
              {t('setup.mcpEndpointHelp_line3')}
              <code className="mono">{t('setup.mcpEndpointHelp_envUrl')}</code>
              {t('setup.mcpEndpointHelp_plus')}
              <code className="mono">{t('setup.mcpEndpointHelp_envToken')}</code>
              {t('setup.mcpEndpointHelp_end')}
            </div>
          </div>

          <div className="stack">
            <label className="label" htmlFor="mcp-client-token-input">
              {t('setup.clientToken')}
            </label>
            <input
              id="mcp-client-token-input"
              className="input mono"
              type="password"
              value={setupClientToken}
              onChange={(e) => setSetupClientToken(e.target.value)}
              placeholder={t('setup.clientTokenPlaceholder')}
              autoComplete="off"
            />
            <div className="help">{t('setup.clientTokenHelp')}</div>
          </div>

          <div className="stack gap-3">
            <label className="label" htmlFor="mcp-config-snippet">
              {t('setup.configSnippets')}
            </label>
            <SegmentedControl
              options={MCP_SETUP_TARGETS.map((target) => ({
                value: target.id,
                label: target.title
              }))}
              value={setupTargetId}
              onChange={setSetupTargetId}
              aria-label={t('setup.configSnippets')}
              size="sm"
            />
            <div className="help">{setupTarget.description}</div>
            <div className="flex gap-3 items-center mt-2">
              <CopyButton
                text={setupSnippet}
                variant="primary"
                label={t('setup.copySnippet')}
                buttonText={t('setup.copySnippet')}
                disabled={!setupSnippet.trim()}
              />
            </div>
            <textarea
              id="mcp-config-snippet"
              className="textarea mono text-xs"
              value={setupSnippet}
              readOnly
              rows={Math.min(14, Math.max(6, setupSnippet.split('\n').length + 1))}
            />
          </div>
        </div>
      </Drawer>

      {/* ================================================================
          Revoke Confirm Dialog
          ================================================================ */}
      <ConfirmDialog
        open={!!tokenToRevoke}
        title={t('dialog.revokeTitle')}
        description={t('dialog.revokeDescription', {
          prefix: tokenToRevoke?.tokenPrefix ?? ''
        })}
        confirmLabel={t('actions.revoke')}
        confirmVariant="danger"
        confirming={revoking}
        onClose={() => (revoking ? null : setTokenToRevoke(null))}
        onConfirm={onRevokeToken}
      />

      {/* ================================================================
          Delete Confirm Dialog
          ================================================================ */}
      <ConfirmDialog
        open={!!tokenToDelete}
        title={t('dialog.deleteTitle')}
        description={t('dialog.deleteDescription', { prefix: tokenToDelete?.tokenPrefix ?? '' })}
        confirmLabel={tc('actions.delete')}
        confirmVariant="danger"
        requireText="DELETE"
        requireTextLabel={t('dialog.requireDeleteText')}
        confirming={deleting}
        onClose={() => (deleting ? null : setTokenToDelete(null))}
        onConfirm={onDeleteToken}
      />
    </div>
  );
}
