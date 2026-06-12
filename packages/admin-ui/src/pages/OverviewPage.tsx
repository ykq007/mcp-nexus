import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AdminApi,
  ClientTokenDto,
  CostEstimateDto,
  MetricsDto,
  TavilyKeyDto,
  TavilyToolUsageDto
} from '../lib/adminApi';
import { formatDateTime } from '../lib/format';
import { IconKey, IconRefresh, IconSearch, IconToken, IconCheck } from '../ui/icons';
import { KpiCard } from '../ui/KpiCard';
import { ErrorBanner } from '../ui/ErrorBanner';
import { EmptyState } from '../ui/EmptyState';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { MetricsCard, RecentErrorsCard } from '../ui/MetricsCard';
import '../styles/pages/overview.css';

type OverviewData = {
  keys: TavilyKeyDto[];
  tokens: ClientTokenDto[];
  usage: TavilyToolUsageDto[];
  metrics: MetricsDto | null;
  costEstimate: CostEstimateDto | null;
};

export function OverviewPage({
  api,
  onGoToKeys,
  onGoToTokens,
  onGoToUsage,
  onGoToPlayground
}: {
  api: AdminApi;
  onGoToKeys: () => void;
  onGoToTokens: () => void;
  onGoToUsage: () => void;
  onGoToPlayground: () => void;
}) {
  const { t } = useTranslation('overview');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [keys, tokens, usageResponse, metrics, costEstimate] = await Promise.all([
        api.listKeys(),
        api.listTokens(),
        api.listUsage({ limit: 10, order: 'desc' }),
        api.getMetrics().catch(() => null),
        api.getCostEstimate().catch(() => null)
      ]);
      setData({ keys, tokens, usage: usageResponse.logs, metrics, costEstimate });
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : tc('errors.unknownError'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api, tc]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    const keys = data?.keys ?? [];
    const tokens = data?.tokens ?? [];

    const activeKeys = keys.filter((k) => k.status === 'active').length;
    const unhealthyKeys = keys.filter(
      (k) => k.status === 'invalid' || k.status === 'cooldown'
    ).length;

    const activeTokens = tokens.filter((t) => !t.revokedAt).length;
    const revokedTokens = tokens.filter((t) => Boolean(t.revokedAt)).length;

    return {
      totalKeys: keys.length,
      activeKeys,
      unhealthyKeys,
      totalTokens: tokens.length,
      activeTokens,
      revokedTokens
    };
  }, [data]);

  /* ── First-run 3-step starter state ─────────────────────────────────────── */
  const [starterDismissed, setStarterDismissed] = useState(() => {
    try {
      return localStorage.getItem('mcp-nexus-onboarding-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissStarter = useCallback(() => {
    setStarterDismissed(true);
    try {
      localStorage.setItem('mcp-nexus-onboarding-dismissed', 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const showStarter =
    !starterDismissed && data !== null && (kpis.totalKeys === 0 || kpis.activeTokens === 0);

  /* ── Recent-usage table columns ─────────────────────────────────────────── */
  const usageColumns = useMemo(
    (): DataTableColumn<TavilyToolUsageDto>[] => [
      {
        id: 'time',
        header: t('table.time'),
        headerStyle: { width: 170 },
        dataLabel: t('table.time'),
        cellClassName: 'mono',
        cell: (row) => formatDateTime(row.timestamp)
      },
      {
        id: 'tool',
        header: t('table.tool'),
        headerStyle: { width: 140 },
        dataLabel: t('table.tool'),
        cellClassName: 'mono',
        cell: (row) => row.toolName
      },
      {
        id: 'outcome',
        header: t('table.outcome'),
        headerStyle: { width: 120 },
        dataLabel: t('table.outcome'),
        cell: (row) => <OutcomeBadge outcome={row.outcome} />
      },
      {
        id: 'query',
        header: t('table.query'),
        dataLabel: t('table.query'),
        cellClassName: 'mono',
        cell: (row) =>
          row.queryPreview ?? (row.queryHash ? `${row.queryHash.slice(0, 10)}…` : '—')
      }
    ],
    [t]
  );

  return (
    <div className="page-overview">
      {/* ── Page action row ─────────────────────────────────────────────── */}
      <div className="overview-header">
        <button
          type="button"
          className="btn"
          onClick={load}
          disabled={loading}
          aria-label={t('actions.refresh')}
        >
          <IconRefresh className={loading ? 'spin' : ''} />
          {t('actions.refresh')}
        </button>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {error ? <ErrorBanner message={error} onRetry={load} retrying={loading} /> : null}

      {/* ── 3-step first-run starter ─────────────────────────────────────── */}
      {showStarter ? (
        <OverviewStarter
          hasKeys={kpis.totalKeys > 0}
          hasTokens={kpis.activeTokens > 0}
          onGoToKeys={onGoToKeys}
          onGoToTokens={onGoToTokens}
          onGoToPlayground={onGoToPlayground}
          onDismiss={handleDismissStarter}
        />
      ) : null}

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="overview-kpi-row" role="list" aria-label={t('title')}>
        {loading && !data ? (
          <>
            <div className="skeleton" role="listitem" aria-hidden="true" />
            <div className="skeleton" role="listitem" aria-hidden="true" />
            <div className="skeleton" role="listitem" aria-hidden="true" />
          </>
        ) : (
          <>
            <div role="listitem">
              <KpiCard
                label={t('kpi.tavilyKeys')}
                value={kpis.totalKeys}
                hint={t('kpi.keysHint', {
                  active: kpis.activeKeys,
                  unhealthy: kpis.unhealthyKeys
                })}
                icon={<IconKey />}
                variant="keys"
                onClick={onGoToKeys}
              />
            </div>
            <div role="listitem">
              <KpiCard
                label={t('kpi.clientTokens')}
                value={kpis.totalTokens}
                hint={t('kpi.tokensHint', {
                  active: kpis.activeTokens,
                  revoked: kpis.revokedTokens
                })}
                icon={<IconToken />}
                variant="tokens"
                onClick={onGoToTokens}
              />
            </div>
            <div role="listitem">
              <KpiCard
                label={t('kpi.usage')}
                value={data?.usage?.length ?? 0}
                hint={t('kpi.usageHint')}
                icon={<IconSearch />}
                variant="usage"
                onClick={onGoToUsage}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Metrics + recent-errors bento ───────────────────────────────── */}
      <div className="overview-bento">
        <MetricsCard
          title={t('metrics.realtime')}
          subtitle={t('metrics.subtitle')}
          liveLabel={t('metrics.live')}
          loading={loading && !data}
          metrics={[
            {
              label: t('metrics.requestsPerMinute'),
              value: data?.metrics?.requestsPerMinute ?? 0,
              variant: 'neutral'
            },
            {
              label: t('metrics.requestsPerHour'),
              value: data?.metrics?.requestsPerHour ?? 0,
              variant: 'neutral'
            },
            {
              label: t('metrics.activeTokens'),
              value: data?.metrics?.activeTokens ?? 0,
              variant: 'success'
            },
            {
              label: t('metrics.activeKeys'),
              value: data?.metrics?.keyPool?.active ?? 0,
              variant: 'success'
            },
            {
              label: t('metrics.unhealthyKeys'),
              value: data?.metrics?.keyPool?.unhealthy ?? 0,
              variant:
                (data?.metrics?.keyPool?.unhealthy ?? 0) > 0 ? 'danger' : 'neutral'
            },
            {
              label: t('metrics.tavilyCost'),
              value: data?.costEstimate?.summary?.tavilyCreditsUsed ?? 0,
              variant: 'neutral'
            },
            {
              label: t('metrics.braveCost'),
              value:
                data?.costEstimate?.summary?.braveEstimatedCostUsd != null
                  ? `$${data.costEstimate.summary.braveEstimatedCostUsd.toFixed(2)}`
                  : '—',
              variant: 'neutral'
            }
          ]}
        />
        <RecentErrorsCard
          errors={data?.metrics?.recentErrors ?? []}
          loading={loading && !data}
        />
      </div>

      {/* ── Recent-usage table ───────────────────────────────────────────── */}
      <div className="card">
        <div className="overview-recent-header">
          <div className="overview-recent-title">
            <span className="section-title">{t('recentUsage.title')}</span>
            <span className="section-sub">{t('recentUsage.subtitle')}</span>
          </div>
          <button
            type="button"
            className="btn"
            data-variant="ghost"
            onClick={onGoToUsage}
          >
            {t('actions.viewAll')}
          </button>
        </div>
        <div style={{ padding: 0 }}>
          {loading && !data ? (
            <div className="overview-skeleton-row">
              <div className="skeleton skeletonTableRow" />
              <div className="skeleton skeletonTableRow" />
              <div className="skeleton skeletonTableRow" />
            </div>
          ) : (
            <DataTable
              ariaLabel={t('recentUsage.title')}
              columns={usageColumns}
              rows={data?.usage ?? []}
              rowKey={(row) => row.id}
              loading={loading && !data}
              empty={<EmptyState message={t('empty.noUsage')} compact />}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Outcome badge ─────────────────────────────────────────────────────────── */

function OutcomeBadge({ outcome }: { outcome: string }) {
  const variant =
    outcome === 'success' ? 'success' : outcome === 'error' ? 'danger' : 'neutral';
  return (
    <span className="badge mono" data-variant={variant}>
      {outcome}
    </span>
  );
}

/* ── 3-step first-run starter ──────────────────────────────────────────────── */

interface OverviewStarterProps {
  hasKeys: boolean;
  hasTokens: boolean;
  onGoToKeys: () => void;
  onGoToTokens: () => void;
  onGoToPlayground: () => void;
  onDismiss: () => void;
}

function OverviewStarter({
  hasKeys,
  hasTokens,
  onGoToKeys,
  onGoToTokens,
  onGoToPlayground,
  onDismiss
}: OverviewStarterProps) {
  const { t } = useTranslation('overview');

  const steps = [
    {
      number: 1,
      completed: hasKeys,
      title: t('onboarding.step1.title', 'Add an API key'),
      desc: t(
        'onboarding.step1.description',
        'Add your Tavily or Brave API key. The gateway uses it for every upstream search call.'
      ),
      action: hasKeys ? undefined : onGoToKeys,
      actionLabel: t('onboarding.step1.action', 'Add key')
    },
    {
      number: 2,
      completed: hasTokens,
      title: t('onboarding.step2.title', 'Mint a client token'),
      desc: t(
        'onboarding.step2.description',
        'Create a scoped token for your MCP client. Set expiry, allowed tools, and rate limit.'
      ),
      action: hasTokens ? undefined : onGoToTokens,
      actionLabel: t('onboarding.step2.action', 'Mint token')
    },
    {
      number: 3,
      completed: hasKeys && hasTokens,
      title: t('onboarding.step3.title', 'Test a tool'),
      desc: t(
        'onboarding.step3.description',
        'Use the Playground to fire a live MCP request with your token and confirm results.'
      ),
      action: onGoToPlayground,
      actionLabel: t('onboarding.step3.action', 'Open Playground')
    }
  ];

  return (
    <div className="overview-starter" role="region" aria-label={t('onboarding.title', 'Getting started')}>
      <div className="overview-starter-header">
        <div>
          <div className="overview-starter-title">
            {t('onboarding.title', 'Getting started')}
          </div>
          <div className="overview-starter-sub">
            {t('onboarding.subtitle', 'Complete these three steps to start serving MCP requests.')}
          </div>
        </div>
        <button
          type="button"
          className="btn"
          data-variant="ghost"
          onClick={onDismiss}
          aria-label={t('onboarding.dismiss', 'Dismiss')}
        >
          {t('onboarding.dismiss', 'Dismiss')}
        </button>
      </div>
      <div className="overview-starter-body">
        <div
          className="overview-starter-steps"
          role="list"
          aria-label={t('onboarding.title', 'Getting started')}
        >
          {steps.map((step, i) => (
            <React.Fragment key={step.number}>
              <div
                className="overview-starter-step"
                data-completed={String(step.completed)}
                role="listitem"
                aria-current={
                  !step.completed && (i === 0 || steps[i - 1].completed)
                    ? 'step'
                    : undefined
                }
              >
                <div className="overview-starter-step-num" aria-hidden="true">
                  {step.completed ? <IconCheck /> : step.number}
                </div>
                <div className="overview-starter-step-title">{step.title}</div>
                <div className="overview-starter-step-desc">{step.desc}</div>
                {!step.completed && step.action ? (
                  <button
                    type="button"
                    className="btn btn--sm"
                    data-variant="primary"
                    onClick={step.action}
                    style={{ marginTop: 'var(--space-1)', alignSelf: 'flex-start' }}
                  >
                    {step.actionLabel}
                  </button>
                ) : null}
              </div>
              {i < steps.length - 1 ? (
                <span
                  className="overview-starter-connector"
                  aria-hidden="true"
                >
                  →
                </span>
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
