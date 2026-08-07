import React from 'react';
import ReactMarkdown from 'react-markdown';

// Wrap bare http(s):// URLs in markdown link syntax so they render as
// clickable links, while leaving existing markdown links / autolinks intact.
function autoLink(text) {
  return text.replace(/(?<!\]\()(?<!<)(https?:\/\/[^\s<\]]+)/g, '[$1]($1)');
}

const LinkRenderer = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary underline hover:opacity-80 break-words"
  >
    {children}
  </a>
);

export default function RichText({ content, className = '' }) {
  if (!content) return null;
  return (
    <div className={`leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:ml-5 [&_a]:break-words ${className}`}>
      <ReactMarkdown components={{ a: LinkRenderer }}>{autoLink(content)}</ReactMarkdown>
    </div>
  );
}