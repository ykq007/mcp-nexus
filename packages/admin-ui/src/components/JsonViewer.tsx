import React, { useMemo } from 'react';

type JsonViewerProps = {
  data: unknown;
  className?: string;
};

export function JsonViewer({ data, className }: JsonViewerProps) {
  const html = useMemo(() => {
    if (data === undefined) return '<span class="json-null">undefined</span>';
    return syntaxHighlight(data);
  }, [data]);

  return (
    <pre
      className={`json-viewer ${className ?? ''}`.trim()}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
      aria-label="JSON response"
      tabIndex={0}
    />
  );
}

function syntaxHighlight(json: unknown): string {
  let jsonStr: string;
  if (typeof json !== 'string') {
    jsonStr = JSON.stringify(json, undefined, 2);
  } else {
    jsonStr = json;
  }

  // Escape HTML
  jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Syntax colorize
  return jsonStr.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
    (match: string) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
