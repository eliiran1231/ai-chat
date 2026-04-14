export interface RequiredValidatorSpec {
  type: 'required';
}

export interface RegexValidatorSpec {
  type: 'regex';
  pattern: string;
  flags?: string;
}

export interface LengthValidatorSpec {
  type: 'length';
  min?: number;
  max?: number;
}

export interface OneOfValidatorSpec {
  type: 'oneOf';
  values: string[];
}

export interface AndValidatorSpec {
  type: 'and';
  rules: ValidatorSpec[];
}

export interface OrValidatorSpec {
  type: 'or';
  rules: ValidatorSpec[];
}

export type ValidatorSpec =
  | RequiredValidatorSpec
  | RegexValidatorSpec
  | LengthValidatorSpec
  | OneOfValidatorSpec
  | AndValidatorSpec
  | OrValidatorSpec;

export interface ValidationResult {
  isValid: boolean;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidRegex(pattern: string, flags?: string): boolean {
  try {
    void new RegExp(pattern, flags);
    return true;
  } catch {
    return false;
  }
}

export function normalizeValidatorSpec(validator: RegExp | ValidatorSpec): ValidatorSpec {
  if (validator instanceof RegExp) {
    return {
      type: 'regex',
      pattern: validator.source,
      flags: validator.flags,
    };
  }

  return validator;
}

export function isValidatorSpec(value: unknown): value is ValidatorSpec {
  if (!isRecord(value) || typeof value['type'] !== 'string') {
    return false;
  }

  const type = value['type'];

  switch (type) {
    case 'required':
      return true;
    case 'regex': {
      const pattern = value['pattern'];
      const flags = value['flags'];
      return (
        typeof pattern === 'string' &&
        (flags === undefined || typeof flags === 'string') &&
        isValidRegex(pattern, flags)
      );
    }
    case 'length': {
      const min = value['min'];
      const max = value['max'];
      const hasMin = min !== undefined;
      const hasMax = max !== undefined;
      if (!hasMin && !hasMax) {
        return false;
      }

      if ((hasMin && !isFiniteNumber(min)) || (hasMax && !isFiniteNumber(max))) {
        return false;
      }

      return min === undefined || max === undefined || min <= max;
    }
    case 'oneOf': {
      const allowedValues = value['values'];
      return (
        Array.isArray(allowedValues) &&
        allowedValues.every((item) => typeof item === 'string')
      );
    }
    case 'and':
    case 'or': {
      const rules = value['rules'];
      return (
        Array.isArray(rules) &&
        rules.length > 0 &&
        rules.every((rule) => isValidatorSpec(rule))
      );
    }
    default:
      return false;
  }
}

export function coerceValidatorSpec(value: unknown): ValidatorSpec | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (isValidatorSpec(value)) {
    return value;
  }

  console.warn('Unknown validator spec encountered. Ignoring persisted validator.', value);
  return undefined;
}

export function evaluateValidator(value: string, validatorSpec?: ValidatorSpec): ValidationResult {
  if (!validatorSpec) {
    return { isValid: true };
  }

  switch (validatorSpec.type) {
    case 'required':
      return { isValid: value.trim().length > 0 };
    case 'regex':
      return {
        isValid: new RegExp(validatorSpec.pattern, validatorSpec.flags).test(value),
      };
    case 'length': {
      const valueLength = value.length;
      const meetsMinimum = validatorSpec.min === undefined || valueLength >= validatorSpec.min;
      const meetsMaximum = validatorSpec.max === undefined || valueLength <= validatorSpec.max;
      return { isValid: meetsMinimum && meetsMaximum };
    }
    case 'oneOf':
      return { isValid: validatorSpec.values.includes(value) };
    case 'and':
      return {
        isValid: validatorSpec.rules.every((rule) => evaluateValidator(value, rule).isValid),
      };
    case 'or':
      return {
        isValid: validatorSpec.rules.some((rule) => evaluateValidator(value, rule).isValid),
      };
  }
}

export function validateValue(value: string, validatorSpec?: ValidatorSpec): boolean {
  return evaluateValidator(value, validatorSpec).isValid;
}
