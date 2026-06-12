import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { JsonViewer } from '../components/JsonViewer';
import { ToolSelector, type McpTool, coerceMcpTool } from '../components/ToolSelector';
import { IconRefresh, IconSearch, IconTrash, IconInfo, IconCheck, IconAlertCircle } from '../ui/icons';
import { ErrorBanner } from '../ui/ErrorBanner';
import { resolveMcpUrl } from '../app/mcpSetupTemplates';
import {
  buildMcpHeaders,
  getJsonRpcErrorMessage,
  isSessionInvalidErrorMessage,
  parseMcpResponseMessages,
  pickJsonRpcResponse,
  type JsonRpcMessage
} from './playgroundMcp';
import '../styles/pages/playground.css';

// Types
type PlaygroundHistoryItem = {
  id: string;
  timestamp: number;
  tool: McpTool;
  params: unknown;
  response?: unknown;
  error?: unknown;
  status: 'success' | 'error';
  duration: number;
};

// Persist state in localStorage across sessions
function useStickyState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore write errors (private browsing, storage quota, etc.)
    }
  }, [key, value]);

  return [value, setValue];
}

export function PlaygroundPage({ apiBaseUrl = '' }: { apiBaseUrl?: string }) {
  const { t } = useTranslation('playground');

  // Sticky state — persisted across reloads
  const [clientToken, setClientToken] = useStickyState<string>('mcp-playground-token', '');
  const [selectedToolRaw, setSelectedToolRaw] = useStickyState<McpTool>('mcp-playground-tool', 'tavily_search');
  const selectedTool = coerceMcpTool(selectedToolRaw);

  // Sync coerced tool back if the stored value was invalid
  useEffect(() => {
    if (selectedToolRaw !== selectedTool) {
      setSelectedToolRaw(selectedTool);
    }
  }, [selectedToolRaw, selectedTool, setSelectedToolRaw]);

  const [paramsJson, setParamsJson] = useStickyState<string>(
    'mcp-playground-params',
    `{\n  "query": "what is the weather in San Francisco?"\n}`
  );
  const [history, setHistory] = useStickyState<PlaygroundHistoryItem[]>('mcp-playground-history', []);
  const [sessionId, setSessionId] = useStickyState<string>('mcp-playground-session-id', '');

  // Local UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [paramsError, setParamsError] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const mcpUrl = resolveMcpUrl({ apiBaseUrl, origin });

  // Show the most-recently executed item when nothing is explicitly selected
  const displayedItem = selectedHistoryId
    ? history.find((h) => h.id === selectedHistoryId) ?? history[0]
    : history[0];

  // ---------------------------------------------------------------------------
  // Execute
  // ---------------------------------------------------------------------------
  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = clientToken.trim();
    if (!token) {
      setError('Client Token is required');
      return;
    }

    let params: unknown;
    try {
      params = JSON.parse(paramsJson);
      setParamsError(false);
      setError(null);
    } catch {
      setParamsError(true);
      setError(t('toolParametersInvalid'));
      return;
    }

    setLoading(true);
    const startTime = Date.now();
    const newItemBase = {
      id: uuidv4(),
      timestamp: startTime,
      tool: selectedTool,
      params
    };

    try {
      const parseResponse = async (
        response: Response,
        requestId: number
      ): Promise<{ message: JsonRpcMessage | undefined; rawText: string }> => {
        const rawText = await response.text();
        const messages = parseMcpResponseMessages(rawText, response.headers.get('content-type'));
        const message = pickJsonRpcResponse(messages, requestId);
        return { message, rawText };
      };

      const initializeSession = async (): Promise<string> => {
        const initializeRequestId = Date.now();
        const initializeResponse = await fetch(mcpUrl, {
          method: 'POST',
          headers: buildMcpHeaders(token),
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: initializeRequestId,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'mcp-nexus-admin-playground', version: '1.0.0' }
            }
          })
        });

        const { message, rawText } = await parseResponse(initializeResponse, initializeRequestId);
        const initializeError = getJsonRpcErrorMessage(message?.error);
        if (initializeError) {
          throw new Error(initializeError);
        }
        if (!initializeResponse.ok && !message) {
          throw new Error(rawText || `HTTP ${initializeResponse.status}`);
        }

        const nextSessionId = initializeResponse.headers.get('mcp-session-id');
        if (!nextSessionId) {
          throw new Error('Initialize succeeded but no MCP session ID was returned');
        }

        setSessionId(nextSessionId);
        return nextSessionId;
      };

      let activeSessionId = sessionId.trim();
      let responseMessage: JsonRpcMessage | undefined;
      let responseRawText = '';

      // Two-attempt retry: on session-invalid error, re-initialize and retry once
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (!activeSessionId) {
          activeSessionId = await initializeSession();
        }

        const callRequestId = Date.now() + attempt + 1;
        const callResponse = await fetch(mcpUrl, {
          method: 'POST',
          headers: buildMcpHeaders(token, activeSessionId),
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: callRequestId,
            method: 'tools/call',
            params: {
              name: selectedTool,
              arguments: params
            }
          })
        });

        const returnedSessionId = callResponse.headers.get('mcp-session-id');
        if (returnedSessionId && returnedSessionId !== activeSessionId) {
          activeSessionId = returnedSessionId;
          setSessionId(returnedSessionId);
        }

        const parsed = await parseResponse(callResponse, callRequestId);
        responseMessage = parsed.message;
        responseRawText = parsed.rawText;

        const messageText = getJsonRpcErrorMessage(responseMessage?.error);
        if (attempt === 0 && isSessionInvalidErrorMessage(messageText)) {
          // Session expired — clear and retry with a fresh session
          activeSessionId = '';
          setSessionId('');
          continue;
        }

        if (!callResponse.ok && !responseMessage) {
          throw new Error(responseRawText || `HTTP ${callResponse.status}`);
        }

        break;
      }

      if (!responseMessage) {
        throw new Error(responseRawText || 'No JSON-RPC response received from MCP endpoint');
      }

      const isError = !!responseMessage.error;
      const result = isError ? responseMessage.error : responseMessage.result;
      const duration = Date.now() - startTime;

      const newItem: PlaygroundHistoryItem = {
        ...newItemBase,
        response: result,
        error: isError ? result : undefined,
        status: isError ? 'error' : 'success',
        duration
      };

      setHistory([newItem, ...history].slice(0, 50));
      setSelectedHistoryId(newItem.id);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const newItem: PlaygroundHistoryItem = {
        ...newItemBase,
        error: { message: (err as Error).message || 'Network Error' },
        status: 'error',
        duration
      };
      setHistory([newItem, ...history].slice(0, 50));
      setSelectedHistoryId(newItem.id);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm(t('clearHistoryConfirm'))) {
      setHistory([]);
      setSelectedHistoryId(null);
    }
  };

  const loadHistoryItem = (item: PlaygroundHistoryItem) => {
    setSelectedToolRaw(item.tool);
    setParamsJson(JSON.stringify(item.params, null, 2));
    setSelectedHistoryId(item.id);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="page-playground">
      {/* Two-pane: request / response */}
      <div className="playground-panes">
        {/* ---- Request panel ---- */}
        <div className="playground-panel">
          <div className="playground-panel-header">
            <h2 className="playground-panel-title">{t('request')}</h2>
          </div>
          <div className="playground-panel-body">
            <form onSubmit={handleExecute} className="stack gap-4" noValidate>
              {error ? <ErrorBanner message={error} /> : null}

              {/* Client token */}
              <div className="playground-field">
                <label htmlFor="playground-client-token" className="playground-field-label">
                  {t('clientToken')}
                </label>
                <input
                  id="playground-client-token"
                  type="password"
                  className="input"
                  placeholder={t('clientTokenPlaceholder')}
                  value={clientToken}
                  onChange={(e) => setClientToken(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="playground-field-hint">{t('clientTokenDescription')}</div>
              </div>

              {/* Tool selector */}
              <ToolSelector value={selectedTool} onChange={setSelectedToolRaw} disabled={loading} />

              {/* JSON parameters */}
              <div className="playground-field">
                <label htmlFor="playground-params" className="playground-field-label">
                  {t('toolParameters')}
                </label>
                <textarea
                  id="playground-params"
                  className={`textarea mono playground-params-textarea${paramsError ? ' input--error' : ''}`}
                  rows={8}
                  value={paramsJson}
                  onChange={(e) => {
                    setParamsJson(e.target.value);
                    setParamsError(false);
                  }}
                  placeholder="{}"
                  spellCheck={false}
                  aria-invalid={paramsError ? 'true' : undefined}
                  aria-describedby={paramsError ? 'params-error' : undefined}
                />
                {paramsError ? (
                  <div id="params-error" className="inputError" role="alert">
                    {t('toolParametersInvalid')}
                  </div>
                ) : null}
              </div>

              {/* Execute */}
              <div className="playground-execute-row">
                <button
                  type="submit"
                  className="btn"
                  data-variant="primary"
                  disabled={loading || !clientToken.trim()}
                >
                  {loading ? (
                    <>
                      <IconRefresh className="spin" aria-hidden="true" />
                      {t('executing')}
                    </>
                  ) : (
                    <>
                      <IconSearch aria-hidden="true" />
                      {t('execute')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ---- Response panel ---- */}
        <div className="playground-panel">
          <div className="playground-panel-header">
            <h2 className="playground-panel-title">{t('response')}</h2>
            {displayedItem ? (
              <div className="playground-response-status">
                <span
                  className="badge"
                  data-variant={displayedItem.status === 'success' ? 'success' : 'danger'}
                >
                  {displayedItem.status === 'success' ? (
                    <IconCheck aria-hidden="true" />
                  ) : (
                    <IconAlertCircle aria-hidden="true" />
                  )}
                  {t(displayedItem.status === 'success' ? 'statusSuccess' : 'statusError')}
                </span>
                <span className="playground-response-duration" aria-label={`${displayedItem.duration} milliseconds`}>
                  {displayedItem.duration}ms
                </span>
              </div>
            ) : null}
          </div>
          <div className="playground-panel-body playground-response-body">
            {displayedItem ? (
              <JsonViewer
                data={displayedItem.error ?? displayedItem.response}
                className="flex-1"
              />
            ) : (
              <div className="playground-empty-response" aria-label={t('noResponse')}>
                <IconInfo aria-hidden="true" />
                <span>{t('noResponse')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- History panel ---- */}
      <div className="playground-history-card">
        <div className="playground-history-header">
          <h2 className="playground-history-title">{t('history')}</h2>
          {history.length > 0 ? (
            <button
              type="button"
              className="btn btn--sm"
              data-variant="ghost"
              onClick={handleClearHistory}
              aria-label={t('clearHistory')}
            >
              <IconTrash aria-hidden="true" />
              {t('clearHistory')}
            </button>
          ) : null}
        </div>

        {history.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-low)', fontSize: 'var(--text-sm)' }}>
            {t('noHistory')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" aria-label={t('history')}>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>{t('historyTable.time')}</th>
                  <th>{t('historyTable.tool')}</th>
                  <th style={{ width: 110 }}>{t('historyTable.status')}</th>
                  <th style={{ width: 100 }}>{t('historyTable.duration')}</th>
                  <th style={{ width: 80, textAlign: 'right' }}>{t('historyTable.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    data-selected={
                      (selectedHistoryId === item.id || (!selectedHistoryId && item === history[0]))
                        ? 'true'
                        : undefined
                    }
                    onClick={() => setSelectedHistoryId(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedHistoryId(item.id);
                      }
                    }}
                    tabIndex={0}
                    role="row"
                    aria-selected={
                      selectedHistoryId === item.id || (!selectedHistoryId && item === history[0])
                    }
                  >
                    <td className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-mid)' }}>
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </td>
                    <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>
                      {item.tool}
                    </td>
                    <td>
                      {item.status === 'success' ? (
                        <span className="badge" data-variant="success">
                          <IconCheck aria-hidden="true" />
                          {t('statusSuccess')}
                        </span>
                      ) : (
                        <span className="badge" data-variant="danger">
                          <IconAlertCircle aria-hidden="true" />
                          {t('statusError')}
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                      {item.duration}ms
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadHistoryItem(item);
                        }}
                        aria-label={`Load params from ${item.tool} request`}
                      >
                        {t('loadParams')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
