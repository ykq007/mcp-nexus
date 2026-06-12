import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminApiError, type AdminApi, type SearchSourceMode, type ServerInfoDto } from '../lib/adminApi';
import {
  IconLogout,
  IconRefresh,
  IconSettings,
  IconInfo,
  IconAlertCircle,
  IconKey,
  IconSun
} from '../ui/icons';
import { useToast } from '../ui/toast';
import {
  supportedLanguages,
  changeLanguage,
  getCurrentLanguage,
  type SupportedLocale
} from '../i18n';
import '../styles/pages/settings.css';

export function SettingsPage({
  api,
  value,
  signedIn,
  onChange,
  onGoToLogin,
  onSignOut
}: {
  api: AdminApi;
  value: { apiBaseUrl: string; locale: SupportedLocale };
  signedIn: boolean;
  onChange: (next: { apiBaseUrl: string; locale: SupportedLocale }) => void;
  onGoToLogin: () => void;
  onSignOut: () => void;
}) {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [serverInfo, setServerInfo] = useState<ServerInfoDto | null>(null);
  const [serverInfoError, setServerInfoError] = useState<string | null>(null);
  const [serverStrategyDraft, setServerStrategyDraft] = useState<'round_robin' | 'random'>(
    'round_robin'
  );
  const [savingServerStrategy, setSavingServerStrategy] = useState(false);
  const [searchSourceModeDraft, setSearchSourceModeDraft] = useState<SearchSourceMode>(
    'brave_prefer_tavily_fallback'
  );
  const [savingSearchSourceMode, setSavingSearchSourceMode] = useState(false);
  const [savingResearch, setSavingResearch] = useState(false);

  const baseUrlNeedsScheme = useMemo(
    () =>
      value.apiBaseUrl.trim() !== '' && !/^https?:\/\//.test(value.apiBaseUrl.trim()),
    [value.apiBaseUrl]
  );

  /* ── Server info fetch ───────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    if (!signedIn) {
      setServerInfo(null);
      setServerInfoError(null);
      return;
    }
    setServerInfoError(null);
    api
      .getServerInfo()
      .then((info) => {
        if (cancelled) return;
        setServerInfo(info);
        setServerStrategyDraft(info.tavilyKeySelectionStrategy);
        setSearchSourceModeDraft(info.searchSourceMode);
      })
      .catch((e: any) => {
        if (cancelled) return;
        const msg =
          typeof e?.message === 'string' ? e.message : tc('errors.unknownError');
        setServerInfoError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [api, signedIn, tc]);

  /* ── Action handlers ─────────────────────────────────────────────────────── */
  async function saveServerStrategy(next: 'round_robin' | 'random') {
    if (!signedIn) {
      toast.push({
        title: t('toast.signInRequired'),
        message: t('toast.signInRequiredMessage')
      });
      return;
    }
    setSavingServerStrategy(true);
    try {
      const res = await api.updateServerInfo({ tavilyKeySelectionStrategy: next });
      setServerInfo(res);
      setServerStrategyDraft(res.tavilyKeySelectionStrategy);
      toast.push({
        title: t('toast.updated'),
        message: t('toast.updatedMessage', { strategy: res.tavilyKeySelectionStrategy })
      });
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string' ? e.message : tc('errors.unknownError');
      toast.push({ title: t('toast.updateFailed'), message: msg });
    } finally {
      setSavingServerStrategy(false);
    }
  }

  async function saveSearchSourceMode(next: SearchSourceMode) {
    if (!signedIn) {
      toast.push({
        title: t('toast.signInRequired'),
        message: t('toast.signInRequiredMessage')
      });
      return;
    }
    setSavingSearchSourceMode(true);
    try {
      const res = await api.updateServerInfo({ searchSourceMode: next });
      setServerInfo(res);
      setSearchSourceModeDraft(res.searchSourceMode);
      toast.push({
        title: t('toast.searchSourceModeUpdated'),
        message: t('toast.searchSourceModeUpdatedMessage', { mode: res.searchSourceMode })
      });
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string' ? e.message : tc('errors.unknownError');
      toast.push({ title: t('toast.updateFailed'), message: msg });
    } finally {
      setSavingSearchSourceMode(false);
    }
  }

  async function toggleResearch(enabled: boolean) {
    if (!signedIn) {
      toast.push({
        title: t('toast.signInRequired'),
        message: t('toast.signInRequiredMessage')
      });
      return;
    }
    setSavingResearch(true);
    try {
      const res = await api.updateServerInfo({ researchEnabled: enabled });
      setServerInfo(res);
      const status = res.researchEnabled
        ? t('server.research.enabled').toLowerCase()
        : t('server.research.disabled').toLowerCase();
      toast.push({
        title: t('toast.researchToggled'),
        message: t('toast.researchToggledMessage', { status })
      });
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string' ? e.message : tc('errors.unknownError');
      toast.push({ title: t('toast.updateFailed'), message: msg });
    } finally {
      setSavingResearch(false);
    }
  }

  async function testConnection() {
    if (!signedIn) {
      toast.push({
        title: t('toast.signInRequired'),
        message: t('toast.goToLoginMessage')
      });
      return;
    }
    setTesting(true);
    try {
      await api.listKeys();
      toast.push({ title: t('toast.connected'), message: t('toast.connectedMessage') });
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : null;
      if (e instanceof AdminApiError && status === 401) {
        toast.push({
          title: t('toast.authFailed'),
          message: t('toast.authFailedMessage')
        });
      } else if (e instanceof AdminApiError && status === 404) {
        toast.push({
          title: t('toast.notFound'),
          message: t('toast.notFoundMessage')
        });
      } else if (e instanceof AdminApiError && status === 0) {
        toast.push({
          title: t('toast.networkError'),
          message: t('toast.networkErrorMessage')
        });
      } else {
        toast.push({
          title: t('toast.connectionFailed'),
          message:
            typeof e?.message === 'string' ? e.message : tc('errors.unknownError')
        });
      }
    } finally {
      setTesting(false);
    }
  }

  function handleLanguageChange(locale: SupportedLocale) {
    changeLanguage(locale);
    onChange({ ...value, locale });
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="page-settings">

      {/* ── Section 1: Connection ────────────────────────────────────────── */}
      <section className="settings-section" aria-labelledby="settings-connection-heading">
        <div className="settings-section-header">
          <span className="settings-section-icon" aria-hidden="true">
            <IconRefresh />
          </span>
          <h2 className="settings-section-title" id="settings-connection-heading">
            {t('section.connection', 'Connection')}
          </h2>
        </div>
        <div className="settings-section-body">

          {/* API base URL */}
          <div className="settings-row">
            <label htmlFor="api-base-url-input" className="settings-field-label">
              {t('apiBaseUrl.label')}
            </label>
            <input
              id="api-base-url-input"
              className="input mono"
              value={value.apiBaseUrl}
              onChange={(e) => onChange({ ...value, apiBaseUrl: e.target.value })}
              placeholder={t('apiBaseUrl.placeholder')}
              autoComplete="off"
              spellCheck={false}
            />
            {baseUrlNeedsScheme ? (
              <div className="settings-scheme-warning" role="alert">
                <IconAlertCircle aria-hidden="true" />
                <span>{t('apiBaseUrl.schemeTip')}</span>
              </div>
            ) : null}
            <p
              className="settings-field-help"
              dangerouslySetInnerHTML={{
                __html: t('apiBaseUrl.help')
                  .replace(/<mono>/g, '<span class="mono">')
                  .replace(/<\/mono>/g, '</span>')
              }}
            />
          </div>

          {/* Test connection */}
          <div className="settings-row">
            <button
              type="button"
              className="btn"
              onClick={testConnection}
              disabled={testing}
              style={{ alignSelf: 'flex-start' }}
            >
              <IconRefresh className={testing ? 'spin' : ''} />
              {t('actions.testConnection')}
            </button>
          </div>

          <div className="settings-divider" role="separator" />

          {/* Auth status */}
          <div className="settings-row">
            <span className="settings-field-label">{t('auth.label')}</span>
            <div className="settings-auth-status">
              <span className="settings-field-help">{t('auth.status')}</span>
              {signedIn ? (
                <span className="badge mono" data-variant="success">
                  {t('auth.signedIn')}
                </span>
              ) : (
                <span className="badge mono" data-variant="danger">
                  {t('auth.signedOut')}
                </span>
              )}
            </div>
            <div className="settings-auth-actions">
              {signedIn ? (
                <button
                  type="button"
                  className="btn"
                  data-variant="ghost"
                  onClick={onGoToLogin}
                >
                  {t('auth.changeToken')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  data-variant="primary"
                  onClick={onGoToLogin}
                >
                  {tc('actions.signIn')}
                </button>
              )}
              {signedIn ? (
                <button
                  type="button"
                  className="btn"
                  data-variant="danger"
                  onClick={onSignOut}
                >
                  <IconLogout />
                  {tc('actions.signOut')}
                </button>
              ) : null}
            </div>
            <p className="settings-field-help">{t('auth.help')}</p>
          </div>
        </div>
      </section>

      {/* ── Section 2: Server strategy (auth-gated) ──────────────────────── */}
      <section className="settings-section" aria-labelledby="settings-server-heading">
        <div className="settings-section-header">
          <span className="settings-section-icon" aria-hidden="true">
            <IconKey />
          </span>
          <h2 className="settings-section-title" id="settings-server-heading">
            {t('section.serverStrategy', 'Server strategy')}
          </h2>
        </div>
        <div className="settings-section-body">

          {/* Gate: must be signed in */}
          {!signedIn ? (
            <div className="settings-server-gate" role="status">
              <span className="settings-field-help">{t('server.signInRequired')}</span>
            </div>
          ) : serverInfoError ? (
            <div className="settings-field-warning" role="alert">
              <IconAlertCircle aria-hidden="true" />
              <span>{t('server.loadError')}: {serverInfoError}</span>
            </div>
          ) : !serverInfo ? (
            <div className="settings-server-gate" role="status">
              <span className="settings-field-help">{tc('status.loading')}</span>
            </div>
          ) : (
            <>
              {/* Tavily key selection strategy */}
              <div className="settings-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span className="settings-field-label" style={{ marginBottom: 0 }}>
                    {t('server.keySelection')}
                  </span>
                  <span className="badge mono settings-current-badge" data-variant="info">
                    {serverInfo.tavilyKeySelectionStrategy}
                  </span>
                </div>
                <div className="settings-strategy-control">
                  <select
                    className="select"
                    value={serverStrategyDraft}
                    onChange={(e) =>
                      setServerStrategyDraft(
                        e.target.value === 'random' ? 'random' : 'round_robin'
                      )
                    }
                    disabled={savingServerStrategy}
                    aria-label={t('server.keySelection')}
                    style={{ width: 'auto', flexShrink: 0 }}
                  >
                    <option value="round_robin">{t('server.roundRobin')}</option>
                    <option value="random">{t('server.random')}</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn--sm"
                    data-variant="primary"
                    onClick={() => saveServerStrategy(serverStrategyDraft)}
                    disabled={
                      savingServerStrategy ||
                      serverStrategyDraft === serverInfo.tavilyKeySelectionStrategy
                    }
                  >
                    {savingServerStrategy ? tc('status.saving') : tc('actions.save')}
                  </button>
                </div>
                <p
                  className="settings-field-help"
                  dangerouslySetInnerHTML={{
                    __html: t('server.keySelectionHelp')
                      .replace(/<mono>/g, '<span class="mono">')
                      .replace(/<\/mono>/g, '</span>')
                  }}
                />
              </div>

              <div className="settings-divider" role="separator" />

              {/* Search source mode */}
              <div className="settings-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span className="settings-field-label" style={{ marginBottom: 0 }}>
                    {t('server.searchSourceMode.label')}
                  </span>
                  <span className="badge mono settings-current-badge" data-variant="info">
                    {serverInfo.searchSourceMode}
                  </span>
                </div>
                <div className="settings-strategy-control">
                  <select
                    className="select"
                    value={searchSourceModeDraft}
                    onChange={(e) =>
                      setSearchSourceModeDraft(e.target.value as SearchSourceMode)
                    }
                    disabled={savingSearchSourceMode}
                    aria-label={t('server.searchSourceMode.label')}
                    style={{ width: 'auto', flexShrink: 0 }}
                  >
                    <option value="brave_prefer_tavily_fallback">
                      {t('server.searchSourceMode.brave_prefer_tavily_fallback')}
                    </option>
                    <option value="combined">
                      {t('server.searchSourceMode.combined')}
                    </option>
                    <option value="tavily_only">
                      {t('server.searchSourceMode.tavily_only')}
                    </option>
                    <option value="brave_only">
                      {t('server.searchSourceMode.brave_only')}
                    </option>
                  </select>
                  <button
                    type="button"
                    className="btn btn--sm"
                    data-variant="primary"
                    onClick={() => saveSearchSourceMode(searchSourceModeDraft)}
                    disabled={
                      savingSearchSourceMode ||
                      searchSourceModeDraft === serverInfo.searchSourceMode
                    }
                  >
                    {savingSearchSourceMode ? tc('status.saving') : tc('actions.save')}
                  </button>
                </div>
                <p className="settings-field-help">
                  {t('server.searchSourceMode.help')}
                </p>

                {/* Cost warning — combined mode */}
                {searchSourceModeDraft === 'combined' ? (
                  <div className="settings-field-warning" role="alert">
                    <IconAlertCircle aria-hidden="true" />
                    <span>{t('server.searchSourceMode.costNote')}</span>
                  </div>
                ) : null}

                {/* Availability warning — brave unavailable */}
                {searchSourceModeDraft === 'brave_only' &&
                !serverInfo.braveSearchEnabled ? (
                  <div className="settings-field-warning" role="alert">
                    <IconAlertCircle aria-hidden="true" />
                    <span>{t('server.searchSourceMode.braveUnavailableWarning')}</span>
                  </div>
                ) : null}

                {searchSourceModeDraft === 'combined' &&
                !serverInfo.braveSearchEnabled ? (
                  <div className="settings-field-warning" role="alert">
                    <IconAlertCircle aria-hidden="true" />
                    <span>
                      {t('server.searchSourceMode.combinedUnavailableWarning')}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="settings-divider" role="separator" />

              {/* Research toggle */}
              <div className="settings-research-row">
                <div className="settings-research-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="settings-field-label" style={{ marginBottom: 0 }}>
                      {t('server.research.label')}
                    </span>
                    <span
                      className="badge mono settings-current-badge"
                      data-variant={serverInfo.researchEnabled ? 'success' : 'neutral'}
                    >
                      {serverInfo.researchEnabled
                        ? t('server.research.enabled')
                        : t('server.research.disabled')}
                    </span>
                  </div>
                  <p className="settings-field-help">{t('server.research.help')}</p>
                </div>
                <button
                  type="button"
                  className="btn btn--sm"
                  data-variant={serverInfo.researchEnabled ? 'danger' : 'primary'}
                  onClick={() => toggleResearch(!serverInfo.researchEnabled)}
                  disabled={savingResearch}
                  style={{ flexShrink: 0, alignSelf: 'flex-start' }}
                >
                  {savingResearch
                    ? tc('status.saving')
                    : serverInfo.researchEnabled
                    ? t('server.research.disabled')
                    : t('server.research.enabled')}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Section 3: Appearance & language ─────────────────────────────── */}
      <section className="settings-section" aria-labelledby="settings-appearance-heading">
        <div className="settings-section-header">
          <span className="settings-section-icon" aria-hidden="true">
            <IconSun />
          </span>
          <h2 className="settings-section-title" id="settings-appearance-heading">
            {t('section.appearance', 'Appearance & language')}
          </h2>
        </div>
        <div className="settings-section-body">
          <div className="settings-appearance-grid">
            {/* Language selector */}
            <div className="settings-row">
              <label htmlFor="language-select" className="settings-field-label">
                {t('language.label')}
              </label>
              <select
                id="language-select"
                className="select"
                value={getCurrentLanguage()}
                onChange={(e) => handleLanguageChange(e.target.value as SupportedLocale)}
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="settings-field-help">{t('language.help')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Env-vars note ─────────────────────────────────────────────────── */}
      <div className="settings-env-note" role="note">
        <IconInfo aria-hidden="true" />
        <span
          dangerouslySetInnerHTML={{
            __html: t('pill.envVars')
              .replace(/<mono>/g, '<span class="mono">')
              .replace(/<\/mono>/g, '</span>')
          }}
        />
      </div>
    </div>
  );
}
