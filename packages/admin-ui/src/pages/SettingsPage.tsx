import React, { useEffect, useMemo, useState } from 'react';
import { AdminApiError, type AdminApi } from '../lib/adminApi';
import type { Theme } from '../app/prefs';
import { IconLogout, IconRefresh, IconSettings } from '../ui/icons';
import { useToast } from '../ui/toast';

export function SettingsPage({
  api,
  value,
  signedIn,
  onChange,
  onGoToLogin,
  onSignOut
}: {
  api: AdminApi;
  value: { apiBaseUrl: string; theme: Theme };
  signedIn: boolean;
  onChange: (next: { apiBaseUrl: string; theme: Theme }) => void;
  onGoToLogin: () => void;
  onSignOut: () => void;
}) {
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [serverInfo, setServerInfo] = useState<{ tavilyKeySelectionStrategy: 'round_robin' | 'random' } | null>(null);
  const [serverInfoError, setServerInfoError] = useState<string | null>(null);
  const [serverStrategyDraft, setServerStrategyDraft] = useState<'round_robin' | 'random'>('round_robin');
  const [savingServerStrategy, setSavingServerStrategy] = useState(false);
  const baseUrlNeedsScheme = useMemo(() => value.apiBaseUrl.trim() !== '' && !/^https?:\/\//.test(value.apiBaseUrl.trim()), [value.apiBaseUrl]);

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
      })
      .catch((e: any) => {
        if (cancelled) return;
        const msg = typeof e?.message === 'string' ? e.message : 'Failed to load server info';
        setServerInfoError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [api, signedIn]);

  async function saveServerStrategy(next: 'round_robin' | 'random') {
    if (!signedIn) {
      toast.push({ title: 'Sign in required', message: 'Sign in with the admin token to update server settings.' });
      return;
    }
    setSavingServerStrategy(true);
    try {
      const res = await api.updateServerInfo({ tavilyKeySelectionStrategy: next });
      setServerInfo({ tavilyKeySelectionStrategy: res.tavilyKeySelectionStrategy });
      setServerStrategyDraft(res.tavilyKeySelectionStrategy);
      toast.push({ title: 'Updated', message: `Upstream key selection set to ${res.tavilyKeySelectionStrategy}.` });
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to update server setting';
      toast.push({ title: 'Update failed', message: msg });
    } finally {
      setSavingServerStrategy(false);
    }
  }

  async function testConnection() {
    if (!signedIn) {
      toast.push({ title: 'Sign in required', message: 'Go to Login and enter the server ADMIN_API_TOKEN first.' });
      return;
    }
    setTesting(true);
    try {
      await api.listKeys();
      toast.push({ title: 'Connected', message: 'Admin API authenticated successfully.' });
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : null;
      if (e instanceof AdminApiError && status === 401) {
        toast.push({
          title: 'Authentication failed (401)',
          message: 'Admin token is invalid. It must match the bridge server environment variable ADMIN_API_TOKEN.'
        });
      } else if (e instanceof AdminApiError && status === 404) {
        toast.push({
          title: 'Not found (404)',
          message: 'Check the Admin API base URL and ensure the bridge server exposes /admin/api/* routes.'
        });
      } else if (e instanceof AdminApiError && status === 0) {
        toast.push({
          title: 'Network/CORS error',
          message:
            'Could not reach Admin API. In local dev, start bridge-server at http://127.0.0.1:8787 and rely on the Vite /admin/api proxy (leave base URL empty), or set base URL explicitly.'
        });
      } else {
        toast.push({ title: 'Connection failed', message: typeof e?.message === 'string' ? e.message : 'Unknown error' });
      }
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="cardHeader">
          <div className="row">
            <div>
              <div className="h2">Settings</div>
              <div className="help">Where to send admin requests and how to authenticate</div>
            </div>
            <button className="btn" onClick={testConnection} disabled={testing}>
              <IconRefresh />
              Test connection
            </button>
          </div>
        </div>
        <div className="cardBody">
          <div className="stack">
            <div className="grid2">
              <div className="stack">
                <label htmlFor="api-base-url-input" className="label">Admin API base URL</label>
                <input
                  id="api-base-url-input"
                  className="input mono"
                  value={value.apiBaseUrl}
                  onChange={(e) => onChange({ ...value, apiBaseUrl: e.target.value })}
                  placeholder="(empty = same origin)"
                  autoComplete="off"
                />
                <div className="help">
                  In production, leave this empty when served from the bridge server. In dev, set to e.g. <span className="mono">http://127.0.0.1:8787</span>.
                </div>
                {baseUrlNeedsScheme ? (
                  <div className="badge mono" data-variant="warning">
                    Tip: include http:// or https:// (e.g. http://127.0.0.1:8787)
                  </div>
                ) : null}
              </div>
              <div className="stack">
                <div className="label">Authentication</div>
                <div className="help">
                  Status:{' '}
                  {signedIn ? (
                    <span className="badge mono" data-variant="success">
                      signed in
                    </span>
                  ) : (
                    <span className="badge mono" data-variant="danger">
                      signed out
                    </span>
                  )}
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  {signedIn ? (
                    <button className="btn" data-variant="ghost" onClick={onGoToLogin}>
                      Change token
                    </button>
                  ) : (
                    <button className="btn" data-variant="primary" onClick={onGoToLogin}>
                      Sign in
                    </button>
                  )}
                  {signedIn ? (
                    <button className="btn" data-variant="danger" onClick={onSignOut}>
                      <IconLogout />
                      Sign out
                    </button>
                  ) : null}
                </div>
                <div className="help">Sign in (or Change token) uses the server ADMIN_API_TOKEN. Client tokens are for MCP clients and are managed in Tokens.</div>
              </div>
            </div>

            <div className="grid2">
              <div className="stack">
                <label htmlFor="theme-select" className="label">Theme</label>
                <select id="theme-select" className="select" value={value.theme} onChange={(e) => onChange({ ...value, theme: e.target.value as Theme })}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
                <div className="help">Matches OS by default.</div>
              </div>
              <div className="stack">
                <div className="label">Notes</div>
                <div className="help">The Admin UI cannot set server environment variables. The token you enter must match what the server was started with.</div>
              </div>
            </div>

            <div className="grid2">
              <div className="stack">
                <div className="label">Server</div>
                {!signedIn ? (
                  <div className="help">Sign in to view server-side settings.</div>
                ) : serverInfoError ? (
                  <div className="badge mono" data-variant="warning">
                    Unable to load server info
                  </div>
                ) : serverInfo ? (
                  <div className="stack">
                    <div className="flex gap-3 items-center">
                      <div className="help">Upstream key selection</div>
                      <span className="badge mono" data-variant="info">
                        {serverInfo.tavilyKeySelectionStrategy}
                      </span>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
                      <select
                        className="select"
                        value={serverStrategyDraft}
                        onChange={(e) => setServerStrategyDraft(e.target.value === 'random' ? 'random' : 'round_robin')}
                        disabled={savingServerStrategy}
                        aria-label="Upstream key selection strategy"
                      >
                        <option value="round_robin">Round robin</option>
                        <option value="random">Random</option>
                      </select>
                      <button
                        className="btn btn--sm"
                        data-variant="primary"
                        onClick={() => saveServerStrategy(serverStrategyDraft)}
                        disabled={savingServerStrategy || serverStrategyDraft === serverInfo.tavilyKeySelectionStrategy}
                      >
                        {savingServerStrategy ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                    <div className="help">
                      Persists on the server. When unset, it falls back to <span className="mono">TAVILY_KEY_SELECTION_STRATEGY</span> (<span className="mono">round_robin</span> or <span className="mono">random</span>).
                    </div>
                  </div>
                ) : (
                  <div className="help">Loading…</div>
                )}
              </div>
              <div className="stack">
                <div className="label">Rotation behavior</div>
                <div className="help">Key selection is evaluated per upstream request attempt and will fail over to another key on invalid/limited keys.</div>
              </div>
            </div>

            <div className="pill">
              <IconSettings />
              <span className="help">
                Server must be started with <span className="mono">ADMIN_API_TOKEN</span> and <span className="mono">KEY_ENCRYPTION_SECRET</span>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
