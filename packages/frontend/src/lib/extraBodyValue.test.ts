import { describe, expect, test } from 'bun:test';

import { formatExtraBodyValue, normalizeExtraBodyKey, parseExtraBodyValue } from './extraBodyValue';

describe('parseExtraBodyValue', () => {
  test('keeps plain string values as strings', () => {
    expect(parseExtraBodyValue('allow')).toEqual({ ok: true, value: 'allow' });
    expect(parseExtraBodyValue('auto')).toEqual({ ok: true, value: 'auto' });
    expect(parseExtraBodyValue('us-east-1')).toEqual({ ok: true, value: 'us-east-1' });
  });

  test('parses JSON objects and arrays', () => {
    expect(parseExtraBodyValue('{"only":["tencent","openai","meta"]}')).toEqual({
      ok: true,
      value: { only: ['tencent', 'openai', 'meta'] },
    });
    expect(parseExtraBodyValue('["a","b"]')).toEqual({ ok: true, value: ['a', 'b'] });
  });

  test('parses JSON scalars instead of stringifying them', () => {
    expect(parseExtraBodyValue('0.3')).toEqual({ ok: true, value: 0.3 });
    expect(parseExtraBodyValue('false')).toEqual({ ok: true, value: false });
    expect(parseExtraBodyValue('null')).toEqual({ ok: true, value: null });
  });

  test('treats an empty value as an empty string', () => {
    expect(parseExtraBodyValue('')).toEqual({ ok: true, value: '' });
    expect(parseExtraBodyValue('   ')).toEqual({ ok: true, value: '' });
  });

  // Regression: a pasted fragment used to be stored as a raw string and then
  // spread into the upstream body, so the provider answered
  // "Could not parse request body. Please ensure it is valid JSON."
  test('rejects malformed JSON fragments instead of storing them as strings', () => {
    const fragment = parseExtraBodyValue('"only":["particle-ai","tencent"]}');
    expect(fragment.ok).toBe(false);
    expect(!fragment.ok && fragment.error).toContain('Invalid JSON');

    expect(parseExtraBodyValue('{"only":').ok).toBe(false);
    expect(parseExtraBodyValue('{not json}').ok).toBe(false);
    expect(parseExtraBodyValue('["unclosed"').ok).toBe(false);
  });
});

describe('normalizeExtraBodyKey', () => {
  test('strips surrounding quotes that would become part of the key', () => {
    expect(normalizeExtraBodyKey('"provider"')).toBe('provider');
    expect(normalizeExtraBodyKey('  "provider"  ')).toBe('provider');
    expect(normalizeExtraBodyKey('provider')).toBe('provider');
  });

  test('leaves inner quotes untouched', () => {
    expect(normalizeExtraBodyKey('a"b')).toBe('a"b');
  });
});

describe('formatExtraBodyValue', () => {
  test('renders strings without quotes and objects as JSON', () => {
    expect(formatExtraBodyValue('allow')).toBe('allow');
    expect(formatExtraBodyValue({ only: ['tencent'] })).toBe('{"only":["tencent"]}');
    expect(formatExtraBodyValue(null)).toBe('null');
    expect(formatExtraBodyValue(undefined)).toBe('');
    expect(formatExtraBodyValue(0.3)).toBe('0.3');
  });
});
