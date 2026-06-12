import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminApi, TavilyToolUsageDto, PaginationDto, TavilyToolUsageFilters, TavilyToolUsageSummaryDto } from '../lib/adminApi';
import { formatDateTime } from '../lib/format';
import { Drawer } from '../ui/Drawer';
import { IconRefresh, IconSearch, IconCheck, IconAlertCircle } from '../ui/icons';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Pagination } from '../ui/Pagination';
import { useDebounce } from '../lib/useDebounce';
import { EmptyState } from '../ui/EmptyState';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { CopyButton } from '../ui/CopyButton';
import '../styles/pages/usage.css';

const PAGE_SIZE = 20;

/**
 * Parse date input string (YYYY-MM-DD) into components
 */
function parseDateInput(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

/**
 * Convert date input to local start of day (00:00:00.000) in ISO format
 */
function toLocalStartOfDayIso(dateInput: string): string | null {
  const parts = parseDateInput(dateInput);
  if (!parts) return null;
  const date = new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Convert date input to local end of day (23:59:59.999) in ISO format
 */
function toLocalEndOfDayIso(dateInput: string): string | null {
  const parts = parseDateInput(dateInput);
  if (!parts) return null;
  const date = new Date(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function OutcomePill({ outcome }: { outcome: string }) {
  if (outcome === 'success') {
    return (
      <span className="badge statusPill--success usage-outcome-pill">
        <IconCheck aria-hidden="true" />
        {outcome}
      </span>
    );
  }
  return (
    <span className="badge statusPill--danger usage-outcome-pill">
      <IconAlertCircle aria-hidden="true" />
      {outcome}
    </span>
  );
}

function UsageDetailDrawer({
  event,
  onClose
}: {
  event: TavilyToolUsageDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('usage');

  if (!event) return null;

  const argsText = JSON.stringify(event.argsJson ?? {}, null, 2);

  return (
    <Drawer open={Boolean(event)} onClose={onClose} title={t('drawer.title')}>
      <div className="stack gap-4">
        {/* 2-col grid for compact fields */}
        <div className="usage-detail-grid">
          <div className="usage-detail-field">
            <div className="usage-detail-label">{t('drawer.time')}</div>
            <div className="usage-detail-value">{formatDateTime(event.timestamp)}</div>
          </div>
          <div className="usage-detail-field">
            <div className="usage-detail-label">{t('drawer.tool')}</div>
            <div className="usage-detail-value">{event.toolName}</div>
          </div>
          <div className="usage-detail-field">
            <div className="usage-detail-label">{t('drawer.client')}</div>
            <div className={`usage-detail-value${!event.clientTokenPrefix ? ' is-empty' : ''}`}>
              {event.clientTokenPrefix ?? '—'}
            </div>
          </div>
          <div className="usage-detail-field">
            <div className="usage-detail-label">{t('drawer.upstreamKey')}</div>
            <div className={`usage-detail-value${!event.upstreamKeyId ? ' is-empty' : ''}`}>
              {event.upstreamKeyId ?? '—'}
            </div>
          </div>
          <div className="usage-detail-field">
            <div className="usage-detail-label">{t('drawer.latency')}</div>
            <div className={`usage-detail-value${typeof event.latencyMs !== 'number' ? ' is-empty' : ''}`}>
              {typeof event.latencyMs === 'number' ? `${event.latencyMs}ms` : '—'}
            </div>
          </div>
          <div className="usage-detail-field">
            <div className="usage-detail-label">{t('drawer.outcome')}</div>
            <div className="usage-detail-value">
              <OutcomePill outcome={event.outcome} />
            </div>
          </div>
        </div>

        {/* Query — full width */}
        <div className="usage-detail-full">
          <div className="usage-detail-label">{t('drawer.query')}</div>
          {event.queryPreview ? (
            <div className="usage-detail-code" style={{ maxHeight: 80 }}>{event.queryPreview}</div>
          ) : (
            <div className="usage-detail-value is-empty">—</div>
          )}
          {event.queryHash ? (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-low)', fontFamily: 'var(--font-mono)' }}>
              {t('drawer.queryHash', { hash: event.queryHash })}
            </div>
          ) : null}
        </div>

        {/* Error — full width, only if present */}
        {event.errorMessage ? (
          <div className="usage-detail-full">
            <div className="usage-detail-label">{t('drawer.error')}</div>
            <div className="usage-detail-error">{event.errorMessage}</div>
          </div>
        ) : null}

        {/* Args JSON — full width */}
        <div className="usage-detail-full">
          <div className="usage-detail-args-label">
            <div className="usage-detail-label">{t('drawer.args')}</div>
            <CopyButton text={argsText} />
          </div>
          <pre className="usage-detail-code">{argsText}</pre>
        </div>
      </div>
    </Drawer>
  );
}

export function UsagePage({ api }: { api: AdminApi }) {
  const { t } = useTranslation('usage');
  const { t: tc } = useTranslation('common');
  const [logs, setLogs] = useState<TavilyToolUsageDto[]>([]);
  const [summary, setSummary] = useState<TavilyToolUsageSummaryDto | null>(null);
  const [pagination, setPagination] = useState<PaginationDto>({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    limit: PAGE_SIZE
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TavilyToolUsageDto | null>(null);

  // Filters
  const [toolName, setToolName] = useState<string>('');
  const [outcome, setOutcome] = useState<string>('');
  const [clientTokenPrefix, setClientTokenPrefix] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedTokenPrefix = useDebounce(clientTokenPrefix, 400);

  const filters = useMemo(() => {
    const f: TavilyToolUsageFilters = { page: currentPage, limit: PAGE_SIZE, order: 'desc' };
    if (toolName) f.toolName = toolName;
    if (outcome) f.outcome = outcome;
    if (debouncedTokenPrefix) f.clientTokenPrefix = debouncedTokenPrefix;
    if (dateFrom) {
      const iso = toLocalStartOfDayIso(dateFrom);
      if (iso) f.dateFrom = iso;
    }
    if (dateTo) {
      const iso = toLocalEndOfDayIso(dateTo);
      if (iso) f.dateTo = iso;
    }
    return f;
  }, [currentPage, toolName, outcome, debouncedTokenPrefix, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, summaryResp] = await Promise.all([
        api.listUsage(filters),
        api.getUsageSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      ]);
      setLogs(list.logs);
      setPagination(list.pagination);
      setSummary(summaryResp);
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : tc('errors.unknownError'));
      setLogs([]);
      setPagination({ totalItems: 0, totalPages: 0, currentPage: 1, limit: PAGE_SIZE });
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [api, filters, tc]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [toolName, outcome, debouncedTokenPrefix, dateFrom, dateTo]);

  const toolOptions = useMemo(() => {
    const fromSummary = summary?.byTool?.map((t) => t.toolName) ?? [];
    const unique = Array.from(new Set(fromSummary));
    return unique.length ? unique : ['tavily_search', 'tavily_extract', 'tavily_crawl', 'tavily_map', 'tavily_research'];
  }, [summary]);

  const hasActiveFilters = Boolean(toolName || outcome || clientTokenPrefix || dateFrom || dateTo);

  const columns = useMemo(() => {
    return [
      {
        id: 'time',
        header: t('table.time'),
        headerStyle: { width: 170 },
        dataLabel: t('table.time'),
        cellClassName: 'mono',
        cell: (row: TavilyToolUsageDto) => formatDateTime(row.timestamp)
      },
      {
        id: 'tool',
        header: t('table.tool'),
        headerStyle: { width: 160 },
        dataLabel: t('table.tool'),
        cellClassName: 'mono',
        cell: (row: TavilyToolUsageDto) => row.toolName
      },
      {
        id: 'outcome',
        header: t('table.outcome'),
        headerStyle: { width: 120 },
        dataLabel: t('table.outcome'),
        cell: (row: TavilyToolUsageDto) => <OutcomePill outcome={row.outcome} />
      },
      {
        id: 'token',
        header: t('table.client'),
        headerStyle: { width: 160 },
        dataLabel: t('table.client'),
        cellClassName: 'mono',
        cell: (row: TavilyToolUsageDto) => row.clientTokenPrefix ?? '—'
      },
      {
        id: 'query',
        header: t('table.query'),
        dataLabel: t('table.query'),
        cell: (row: TavilyToolUsageDto) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-mid)' }}>
            {row.queryPreview ?? (row.queryHash ? `${row.queryHash.slice(0, 10)}…` : '—')}
          </span>
        )
      },
      {
        id: 'latency',
        header: t('table.latency'),
        headerStyle: { width: 100, textAlign: 'right' as const },
        headerAlign: 'right' as const,
        dataLabel: t('table.latency'),
        cellAlign: 'right' as const,
        cellClassName: 'mono',
        cell: (row: TavilyToolUsageDto) =>
          typeof row.latencyMs === 'number' ? `${row.latencyMs}ms` : '—'
      }
    ] satisfies DataTableColumn<TavilyToolUsageDto>[];
  }, [t]);

  return (
    <div className="page-usage">
      {/* Page header */}
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">{t('title')}</h1>
          <p className="pageSubtitle">{t('subtitle')}</p>
        </div>
        <button className="btn" onClick={load} disabled={loading} type="button">
          <IconRefresh className={loading ? 'spin' : ''} aria-hidden="true" />
          {t('actions.refresh')}
        </button>
      </div>

      {/* Error */}
      {error ? <ErrorBanner message={error} onRetry={load} retrying={loading} /> : null}

      {/* Filter bar */}
      <div className="usage-filter-bar" role="search" aria-label="Filter usage events">
        {/* Tool */}
        <div className="usage-filter-field">
          <label htmlFor="usage-tool">{t('filters.tool')}</label>
          <select
            id="usage-tool"
            className="select"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
          >
            <option value="">{t('filters.allTools')}</option>
            {toolOptions.map((tool) => (
              <option key={tool} value={tool}>
                {tool}
              </option>
            ))}
          </select>
        </div>

        {/* Outcome */}
        <div className="usage-filter-field">
          <label htmlFor="usage-outcome">{t('filters.outcome')}</label>
          <select
            id="usage-outcome"
            className="select"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            <option value="">{t('filters.allOutcomes')}</option>
            <option value="success">{t('filters.success')}</option>
            <option value="error">{t('filters.error')}</option>
          </select>
        </div>

        {/* Client token prefix — debounced 400ms */}
        <div className="usage-filter-field">
          <label htmlFor="usage-client">{t('filters.clientTokenPrefix')}</label>
          <div className="usage-search-wrap">
            <IconSearch aria-hidden="true" />
            <input
              id="usage-client"
              type="search"
              className="input mono"
              placeholder={t('filters.clientPlaceholder')}
              value={clientTokenPrefix}
              onChange={(e) => setClientTokenPrefix(e.target.value)}
            />
          </div>
        </div>

        {/* Date from */}
        <div className="usage-filter-field">
          <label htmlFor="usage-date-from">{t('filters.from')}</label>
          <input
            id="usage-date-from"
            type="date"
            className="input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        {/* Date to */}
        <div className="usage-filter-field">
          <label htmlFor="usage-date-to">{t('filters.to')}</label>
          <input
            id="usage-date-to"
            type="date"
            className="input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Summary strip */}
      {summary ? (
        <div className="usage-summary" aria-live="polite" aria-atomic="true">
          <span>{t('summary.totalEvents')}</span>
          <span className="usage-summary-count">{summary.total}</span>
          {hasActiveFilters ? <span style={{ color: 'var(--text-low)', fontSize: 'var(--text-xs)' }}>(filtered)</span> : null}
        </div>
      ) : null}

      {/* Table card */}
      <div className="usage-table-card usageTableScroller">
        <div className="usage-table-scroll">
          <DataTable
            ariaLabel={t('title')}
            columns={columns}
            rows={logs}
            rowKey={(r) => r.id}
            loading={loading && logs.length === 0}
            getRowProps={(row) => ({
              onClick: () => setSelected(row),
              role: 'button',
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(row);
                }
              },
              'aria-label': `View detail for ${row.toolName} event at ${formatDateTime(row.timestamp)}`
            })}
            empty={
              <EmptyState
                message={hasActiveFilters ? t('empty.noEventsFiltered') : t('empty.noEvents')}
                compact
              />
            }
          />
        </div>

        {pagination.totalPages > 1 ? (
          <div className="usage-pagination">
            <Pagination
              total={pagination.totalItems}
              page={pagination.currentPage}
              pageSize={PAGE_SIZE}
              onChange={setCurrentPage}
            />
          </div>
        ) : null}
      </div>

      {/* Detail drawer — replaces modal; list stays visible while inspecting */}
      <UsageDetailDrawer event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
