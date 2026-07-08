import DOMPurify from 'dompurify';

export function sanitizeMarkdown(value: string): string {
  return DOMPurify.sanitize(value, { ADD_TAGS: ['mark'] });
}
