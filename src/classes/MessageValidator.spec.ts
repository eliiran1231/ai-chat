import {
  coerceValidatorSpec,
  evaluateValidator,
  normalizeValidatorSpec,
} from './MessageValidator';

describe('MessageValidator', () => {
  it('accepts values when no validator is provided', () => {
    expect(evaluateValidator('anything').isValid).toBe(true);
  });

  it('evaluates required validators using trimmed content', () => {
    expect(evaluateValidator('   ', { type: 'required' }).isValid).toBe(false);
    expect(evaluateValidator('hello', { type: 'required' }).isValid).toBe(true);
  });

  it('evaluates regex validators', () => {
    expect(
      evaluateValidator('12345', { type: 'regex', pattern: '^\\d+$' }).isValid,
    ).toBe(true);
    expect(
      evaluateValidator('12ab', { type: 'regex', pattern: '^\\d+$' }).isValid,
    ).toBe(false);
  });

  it('evaluates length validators', () => {
    expect(evaluateValidator('ab', { type: 'length', min: 3 }).isValid).toBe(false);
    expect(evaluateValidator('abcd', { type: 'length', min: 3, max: 5 }).isValid).toBe(true);
    expect(evaluateValidator('abcdef', { type: 'length', max: 5 }).isValid).toBe(false);
  });

  it('evaluates oneOf validators', () => {
    expect(
      evaluateValidator('blue', { type: 'oneOf', values: ['red', 'blue', 'green'] }).isValid,
    ).toBe(true);
    expect(
      evaluateValidator('yellow', { type: 'oneOf', values: ['red', 'blue', 'green'] }).isValid,
    ).toBe(false);
  });

  it('evaluates composed and/or validators', () => {
    expect(
      evaluateValidator('1234', {
        type: 'and',
        rules: [
          { type: 'required' },
          { type: 'regex', pattern: '^\\d+$' },
          { type: 'length', min: 4, max: 4 },
        ],
      }).isValid,
    ).toBe(true);

    expect(
      evaluateValidator('yes', {
        type: 'or',
        rules: [
          { type: 'oneOf', values: ['no'] },
          { type: 'oneOf', values: ['yes'] },
        ],
      }).isValid,
    ).toBe(true);
  });

  it('normalizes RegExp validators into JSON-safe specs', () => {
    expect(normalizeValidatorSpec(/^\d+$/i)).toEqual({
      type: 'regex',
      pattern: '^\\d+$',
      flags: 'i',
    });
  });

  it('rejects malformed persisted validator specs without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(
      coerceValidatorSpec({
        type: 'regex',
        pattern: '[',
      }),
    ).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
