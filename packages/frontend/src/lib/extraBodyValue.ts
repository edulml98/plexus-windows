/**
 * Extra body values are free text. They may legitimately be plain string
 * values (`allow`, `auto`) or JSON literals (`{"only":["tencent"]}`, `0.3`,
 * `false`).
 *
 * Text that can only be JSON must parse. Previously every parse failure was
 * silently stored as a raw string, so a pasted fragment such as
 * `"only":["tencent"]}` became a string value, was spread into the upstream
 * request body, and made the provider reject the whole request
 * ("Could not parse request body. Please ensure it is valid JSON.").
 */

export type ExtraBodyValueParse = { ok: true; value: unknown } | { ok: false; error: string };

/** Characters that can only begin a JSON literal — never a plain word. */
const STRUCTURED_JSON_START = /^[{["]/;

export function parseExtraBodyValue(raw: string): ExtraBodyValueParse {
  const text = raw.trim();
  if (text === '') return { ok: true, value: '' };

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    if (STRUCTURED_JSON_START.test(text)) {
      return { ok: false, error: 'Invalid JSON — value not saved' };
    }
    // Plain string value, e.g. `allow`.
    return { ok: true, value: raw };
  }
}

/**
 * Field names reach the provider verbatim, so surrounding quotes would become
 * part of the key (`"provider"` instead of `provider`). Strip accidental
 * quoting while leaving inner quotes untouched.
 */
export function normalizeExtraBodyKey(raw: string): string {
  return raw.trim().replace(/^"+/, '').replace(/"+$/, '');
}

/** Renders a value for the editor input. Strings are shown without quotes. */
export function formatExtraBodyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
