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
import { Dialog } from '../ui/Dialog';
import { Drawer } from '../ui/Drawer';
import { ActionMenu } from '../ui/ActionMenu';
import { SegmentedControl } from '../ui/SegmentedControl';
import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconEye,
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

const REVEAL_DURATION = 30; // seconds

const STATUS_ICONS: Record<TokenStatus, React.ComponentType<{ className?: string }>> = {
  active: IconCheck,
  expiring: IconAlertCircle,
  expired: IconClock,
  revoked: IconX
};

type StatusFilter = 'all' | TokenStatus;

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

  // Create dialog state
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

  // Setup drawer state
  const [setupClientToken, setSetupClientToken] = useState('');
  const [activeTargetId, setActiveTargetId] = useState(() => MCP_SETUP_TARGETS[0]?.id ?? 'http-curl');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Reveal state
  const [revealTokenRow, setRevealTokenRow] = useState<ClientTokenDto | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(REVEAL_DURATION);
  // Ref tracks the id of the token being revealed so we can detect stale resolves
  const revealRequestIdRef = useRef<string | null>(null);

  // Revoke state
  const [tokenToRevoke, setTokenToRevoke] = useState<ClientTokenDto | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Delete state
  const [tokenToDelete, setTokenToDelete] = useState<ClientTokenDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // URL param driven open
  const createFromUrl = searchParams.get('create');
  const setupFromUrl = searchParams.get('setup');
  useEffect(() => {
    if (createFromUrl === '1') {
      resetCreateForm();
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
    if (setupFromUrl === '1') {
      setDrawerOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete('setup');
      setSearchParams(next, { replace: true });
    }
  }, [createFromUrl, searchParams, setSearchParams, setupFromUrl]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const mcpUrl = useMemo(() => resolveMcpUrl({ apiBaseUrl, origin }), [apiBaseUrl, origin]);

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
    // "Expires soon" tokens are still usable, so they count as active.
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
      // Text filter
      if (q) {
        const prefix = tok.tokenPrefix.toLowerCase();
        const desc = (tok.description ?? '').toLowerCase();
        if (!prefix.includes(q) && !desc.includes(q)) return false;
      }
      // Status filter
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

  // Clamp page when result set shrinks (e.g. after delete/revoke)
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
  }

  function closeCreate() {
    if (creating) return;
    setCreateOpen(false);
    resetCreateForm();
    setCreatedToken(null);
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
      setSetupClientToken(res.token);
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

  function onSetupClient() {
    closeCreate();
    setDrawerOpen(true);
  }

  // Closing the drawer drops the cleartext token from state so re-opening
  // via "Setup Info" never resurfaces a previously revealed token.
  function closeDrawer() {
    setDrawerOpen(false);
    setSetupClientToken('');
  }

  // ---- Reveal flow ----
  const clearRevealedToken = useCallback(() => {
    revealRequestIdRef.current = null;
    setRevealTokenRow(null);
    setRevealedToken(null);
    setRevealing(false);
    setRevealSecondsLeft(REVEAL_DURATION);
  }, []);

  // Countdown interval
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!revealedToken || !revealTokenRow) return;

    setRevealSecondsLeft(REVEAL_DURATION);

    const timeout = window.setTimeout(() => {
      clearRevealedToken();
    }, REVEAL_DURATION * 1000);

    countdownRef.current = setInterval(() => {
      setRevealSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    const onVisibilityChange = () => {
      if (document.hidden) clearRevealedToken();
    };

    window.addEventListener('blur', clearRevealedToken);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearTimeout(timeout);
      if (countdownRef.current) clearInterval(countdownRef.current);
      window.removeEventListener('blur', clearRevealedToken);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [clearRevealedToken, revealedToken, revealTokenRow]);

  async function onRevealToken(tok: ClientTokenDto) {
    revealRequestIdRef.current = tok.id;
    setRevealTokenRow(tok);
    setRevealedToken(null);
    setRevealing(true);
    try {
      const res = await api.revealToken(tok.id);
      // Guard: if the dialog was closed (clearRevealedToken called) while the
      // request was in-flight, revealRequestIdRef is set to null — discard.
      if (revealRequestIdRef.current !== tok.id) return;
      setRevealedToken(res.token);
    } catch (e: any) {
      clearRevealedToken();
      toast.push({
        title: t('toast.revealFailed'),
        message: typeof e?.message === 'string' ? e.message : tc('errors.unknownError')
      });
    } finally {
      setRevealing(false);
    }
  }

  function onUseInSetup() {
    if (revealedToken) setSetupClientToken(revealedToken);
    clearRevealedToken();
    setDrawerOpen(true);
  }

  // ---- Configure client from overflow menu ----
  async function onConfigureClient(tok: ClientTokenDto) {
    try {
      const res = await api.revealToken(tok.id);
      setSetupClientToken(res.token);
      setDrawerOpen(true);
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

  // ---- Setup drawer ----
  const activeTarget = useMemo(
    () => MCP_SETUP_TARGETS.find((target) => target.id === activeTargetId) ?? MCP_SETUP_TARGETS[0]!,
    [activeTargetId]
  );
  const activeSnippet = useMemo(
    () => activeTarget.render({ apiBaseUrl, origin, clientToken: setupClientToken }),
    [activeTarget, apiBaseUrl, origin, setupClientToken]
  );

  // ---- Expiry preview ----
  const expiryPreviewText = useMemo(() => {
    if (expiryPreset === 'never') return t('form.expiryAbsolute_never');
    const secs = resolveExpiresInSeconds(expiryPreset, customDuration, customUnit);
    if (!secs) return t('form.expiryAbsolute_never');
    const expiry = new Date(Date.now() + secs * 1000);
    return t('form.expiryAbsolute_at', { at: formatDateTime(expiry.toISOString()) });
  }, [expiryPreset, customDuration, customUnit, t]);

  // ---- Tool selection helpers ----
  function toggleGroupAll(groupTools: string[], selectAll: boolean) {
    if (selectAll) {
      setSelectedTools((prev) => {
        const set = new Set(prev);
        groupTools.forEach((tool) => set.add(tool));
        return [...set];
      });
    } else {
      setSelectedTools((prev) => prev.filter((t) => !groupTools.includes(t)));
    }
  }

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

  // ---- Expiry presets ----
  const expiryPresetOptions = useMemo(
    () =>
      EXPIRY_PRESETS.map((preset) => ({
        value: preset,
        label: t(`form.expiry${preset.charAt(0).toUpperCase() + preset.slice(1)}` as any)
      })),
    [t]
  );

  // Bound time translator for formatRelativeDate — ensures zh-CN parity
  const timeT = useCallback(
    (key: string, opts?: Record<string, unknown>) => tc(`time.${key}`, opts as any),
    [tc]
  );

  // ---- Table columns ----
  const columns = useMemo<DataTableColumn<ClientTokenDto>[]>(() => {
    const now = new Date();
    return [
      {
        id: 'token',
        header: t('table.prefix'),
        dataLabel: t('table.prefix'),
        cell: (tok) => (
          <div>
            <div className="mono" style={{ color: 'var(--text-hi)' }}>
              {tok.tokenPrefix}
            </div>
            {tok.description ? (
              <div className="help" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                {tok.description}
              </div>
            ) : null}
          </div>
        )
      },
      {
        id: 'status',
        header: t('table.status'),
        headerStyle: { width: 120 },
        dataLabel: t('table.status'),
        cell: (tok) => {
          const st = deriveTokenStatus(tok, now);
          const StatusIcon = STATUS_ICONS[st];
          return (
            <span className="badge" data-variant={tokenStatusVariant(st)}>
              <StatusIcon />
              {t(`status.${st}`)}
            </span>
          );
        }
      },
      {
        id: 'scope',
        header: t('table.scope'),
        headerStyle: { width: 140 },
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
            <div>
              <div
                className="mono"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--text-hi)' }}
                title={toolTitle}
              >
                {toolLabel}
              </div>
              {rpmLabel ? (
                <div
                  className="mono help"
                  style={{ fontSize: 'var(--text-2xs)', marginTop: 2 }}
                >
                  {rpmLabel}
                </div>
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
          if (!tok.expiresAt) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
          return (
            <span title={formatDateTime(tok.expiresAt)} style={{ color: 'var(--text-mid)' }}>
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
          <span title={formatDateTime(tok.createdAt)} style={{ color: 'var(--text-mid)' }}>
            {formatRelativeDate(tok.createdAt, timeT)}
          </span>
        )
      },
      {
        id: 'actions',
        header: t('table.actions'),
        headerStyle: { width: 140, textAlign: 'right' },
        headerAlign: 'right',
        dataLabel: t('table.actions'),
        cellAlign: 'right',
        cell: (tok) => {
          const st = deriveTokenStatus(tok, now);
          const isRevoked = st === 'revoked';
          return (
            <div className="flex gap-2 justify-end">
              <button
                className="btn btn--sm"
                data-variant="ghost"
                onClick={() => void onRevealToken(tok)}
                disabled={revealing && revealTokenRow?.id === tok.id}
              >
                <IconEye />
                {t('actions.reveal')}
              </button>
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
  }, [t, tc, timeT, revealing, revealTokenRow]);

  const isFiltered = debouncedSearch.trim() !== '' || statusFilter !== 'all';

  return (
    <div className="stack">
      {/* ---- Header card ---- */}
      <div className="card">
        <div className="cardHeader">
          <div className="row">
            <div>
              <div className="h2" role="heading" aria-level={2}>
                {t('title')}
              </div>
              <div className="help">
                {t('stats.summary', { total: stats.total, active: stats.active })}
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <button className="btn" data-variant="ghost" onClick={() => setDrawerOpen(true)}>
                {t('actions.setupInfo')}
              </button>
              <button className="btn" onClick={load} disabled={loading}>
                <IconRefresh />
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
                <IconPlus />
                {t('actions.createToken')}
              </button>
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div
          style={{
            padding: '10px var(--space-3)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            flexWrap: 'wrap'
          }}
        >
          <div className="searchInput" style={{ flex: '1 1 200px', minWidth: 160 }}>
            <span className="searchInputIcon">
              <IconSearch />
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
                <div
                  style={{
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                    color: 'var(--text-low)'
                  }}
                >
                  <p style={{ marginBottom: 8 }}>{t('filter.noResults')}</p>
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
                  message={t('empty.noTokens')}
                  action={{ label: t('actions.createToken'), onClick: () => setCreateOpen(true) }}
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
          Setup Drawer
          ================================================================ */}
      <Drawer open={drawerOpen} onClose={closeDrawer} title={t('setup.title')}>
        <div className="stack gap-6">
          <div className="stack">
            <label className="label" htmlFor="mcp-endpoint-input">
              {t('setup.mcpEndpoint')}
            </label>
            <input id="mcp-endpoint-input" className="input mono" value={mcpUrl} readOnly />
            {/* Safe JSX replacement for dangerouslySetInnerHTML */}
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
              value={activeTargetId}
              onChange={setActiveTargetId}
              aria-label={t('setup.configSnippets')}
              size="sm"
            />
            <div className="help">{activeTarget.description}</div>

            <div className="flex gap-3 items-center mt-2">
              <CopyButton
                text={activeSnippet}
                variant="primary"
                label={t('setup.copySnippet')}
                buttonText={t('setup.copySnippet')}
                disabled={!activeSnippet.trim()}
              />
            </div>
            <textarea
              id="mcp-config-snippet"
              className="textarea mono text-xs"
              value={activeSnippet}
              readOnly
              rows={Math.min(14, Math.max(6, activeSnippet.split('\n').length + 1))}
            />
          </div>
        </div>
      </Drawer>

      {/* ================================================================
          Create Dialog — Step 1: Form
          ================================================================ */}
      <Dialog
        title={t('dialog.createTitle')}
        open={createOpen && createStep === 'form'}
        onClose={closeCreate}
      >
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
                {selectedTools.length === 0 ? (
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
                  className="text-sm cursor-pointer"
                  style={{ fontSize: 'var(--text-sm)' }}
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

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <button className="btn" onClick={closeCreate} disabled={creating}>
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
              {t('actions.createToken')}
            </button>
          </div>
        </div>
      </Dialog>

      {/* ================================================================
          Create Dialog — Step 2: Token Issued
          ================================================================ */}
      <Dialog
        title={t('dialog.copyTitle')}
        open={createOpen && createStep === 'issued'}
        onClose={closeCreate}
      >
        <div className="stack">
          <div className="help">{t('copyDialog.warning')}</div>
          <div className="tokenWell" aria-label={t('copyDialog.copyToken')}>
            {createdToken ?? ''}
          </div>
          <CopyButton
            text={createdToken ?? ''}
            variant="primary"
            label={t('copyDialog.copyToken')}
            buttonText={t('copyDialog.copyToken')}
            disabled={!createdToken}
          />
          <div className="flex justify-end gap-3 mt-2">
            <button className="btn" data-variant="ghost" onClick={closeCreate}>
              {t('copyDialog.done')}
            </button>
            <button className="btn" data-variant="primary" onClick={onSetupClient}>
              {t('copyDialog.setupClient')}
            </button>
          </div>
        </div>
      </Dialog>

      {/* ================================================================
          Reveal Dialog
          ================================================================ */}
      <Dialog
        title={t('dialog.revealTitle')}
        open={Boolean(revealTokenRow)}
        onClose={clearRevealedToken}
      >
        <div className="stack">
          <div className="help">{t('revealDialog.warning')}</div>

          {revealing ? (
            <div className="tokenWell" style={{ color: 'var(--text-faint)' }}>
              ···
            </div>
          ) : (
            <div className="tokenWell">{revealedToken ?? ''}</div>
          )}

          {/* Countdown */}
          {revealedToken ? (
            <div className="revealCountdown">
              <div className="revealCountdownBar">
                <div
                  className="revealCountdownFill"
                  style={{ width: `${(revealSecondsLeft / REVEAL_DURATION) * 100}%` }}
                />
              </div>
              {/* Visual label updates every second; aria-hidden to avoid per-second AT spam */}
              <span className="revealCountdownLabel" aria-hidden="true">
                {t('revealDialog.hidesIn', { seconds: revealSecondsLeft })}
              </span>
              {/* Accessible live region updates only on 5-second boundaries */}
              <span
                className="sr-only"
                aria-live="polite"
                aria-atomic="true"
              >
                {revealSecondsLeft % 5 === 0
                  ? t('revealDialog.hidesIn', { seconds: revealSecondsLeft })
                  : ''}
              </span>
            </div>
          ) : null}

          <div className="flex gap-3">
            <CopyButton
              text={revealedToken ?? ''}
              variant="primary"
              label={t('revealDialog.copyToken')}
              buttonText={t('revealDialog.copyToken')}
              disabled={!revealedToken || revealing}
            />
            <button
              className="btn"
              data-variant="ghost"
              onClick={onUseInSetup}
              disabled={!revealedToken || revealing}
            >
              {t('actions.useInSetup')}
            </button>
          </div>
        </div>
      </Dialog>

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
