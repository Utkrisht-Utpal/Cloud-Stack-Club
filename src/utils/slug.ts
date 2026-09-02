/**
 * Generates a URL-friendly slug from an event title.
 * Examples:
 * - "Elevate - X" -> "elevate-x"
 * - "AWS Cloud Day 2026!" -> "aws-cloud-day-2026"
 * - "GenAI & LLM Workshop" -> "genai-llm-workshop"
 */
export const generateSlug = (title: string): string => {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    // Replace ampersands with 'and' or remove
    .replace(/&+/g, 'and')
    // Remove all characters except alphanumeric and spaces/hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces or hyphens with a single hyphen
    .replace(/[\s-]+/g, '-')
    // Trim leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
};
