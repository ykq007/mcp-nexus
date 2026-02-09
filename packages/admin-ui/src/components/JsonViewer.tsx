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
      className={`json-viewer ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
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

  jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
