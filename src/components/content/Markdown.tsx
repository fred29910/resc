"use client";

// A client-side markdown renderer will be implemented here.
// It might use a library like 'react-markdown' or 'marked'.

export function Markdown({ content }: { content: string }) {
  // For now, just a placeholder
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}