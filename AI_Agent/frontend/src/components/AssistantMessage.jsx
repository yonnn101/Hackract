import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

const ALLOWED_TAGS = [
  'p','br','strong','em','b','i','u','s','del','a','ul','ol','li',
  'h1','h2','h3','h4','h5','h6','blockquote','pre','code','hr',
  'table','thead','tbody','tr','th','td',
];

function renderMarkdown(text) {
  let html = marked.parse(text || '');
  html = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
  });
  return html;
}

export default function AssistantMessage({ content, ts }) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div className="message assistant">
      <div className="assistant-inner">
        <div className="assistant-avatar" aria-hidden="true" title="Assistant">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l2.2 6.8H21l-5.5 4 2.1 6.7L12 15.9 6.4 19.5l2.1-6.7L3 8.8h6.8L12 2z" />
          </svg>
        </div>
        <div className="assistant-body">
          <div className="prose-msg" dangerouslySetInnerHTML={{ __html: html }} />
          {ts && <div className="timestamp">{new Date(ts).toLocaleTimeString()}</div>}
        </div>
      </div>
    </div>
  );
}
