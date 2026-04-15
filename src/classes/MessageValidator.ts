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
type ValidatorType = ValidatorSpec['type'];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function hasOwnKey<TObj extends object>(obj: TObj, key: PropertyKey): key is keyof TObj {
  return Object.prototype.hasOwnProperty.call(obj, key);
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

function isValidLogicalRules(record: UnknownRecord): boolean {
  const rules = record['rules'];
  return Array.isArray(rules) && rules.length > 0 && rules.every((rule) => isValidatorSpec(rule));
}

const isValidatorSpecByType: Record<ValidatorType, (record: UnknownRecord) => boolean> = {
  required: () => true,
  regex: (record) => {
    const pattern = record['pattern'];
    const flags = record['flags'];
    return (
      typeof pattern === 'string' &&
      (flags === undefined || typeof flags === 'string') &&
      isValidRegex(pattern, flags)
    );
  },
  length: (record) => {
    const min = record['min'];
    const max = record['max'];
    const hasMin = min !== undefined;
    const hasMax = max !== undefined;
    if (!hasMin && !hasMax) {
      return false;
    }

    if ((hasMin && !isFiniteNumber(min)) || (hasMax && !isFiniteNumber(max))) {
      return false;
    }

    return min === undefined || max === undefined || min <= max;
  },
  oneOf: (record) => {
    const allowedValues = record['values'];
    return Array.isArray(allowedValues) && allowedValues.every((item) => typeof item === 'string');
  },
  and: isValidLogicalRules,
  or: isValidLogicalRules,
};

const evaluateValidatorByType = {
  required: (inputValue: string, _specValue: RequiredValidatorSpec): ValidationResult => ({
    isValid: inputValue.trim().length > 0,
  }),
  regex: (inputValue: string, specValue: RegexValidatorSpec): ValidationResult => ({
    isValid: new RegExp(specValue.pattern, specValue.flags).test(inputValue),
  }),
  length: (inputValue: string, specValue: LengthValidatorSpec): ValidationResult => {
    const valueLength = inputValue.length;
    const meetsMinimum = specValue.min === undefined || valueLength >= specValue.min;
    const meetsMaximum = specValue.max === undefined || valueLength <= specValue.max;
    return { isValid: meetsMinimum && meetsMaximum };
  },
  oneOf: (inputValue: string, specValue: OneOfValidatorSpec): ValidationResult => ({
    isValid: specValue.values.includes(inputValue),
  }),
  and: (inputValue: string, specValue: AndValidatorSpec): ValidationResult => ({
    isValid: specValue.rules.every((rule) => evaluateValidator(inputValue, rule).isValid),
  }),
  or: (inputValue: string, specValue: OrValidatorSpec): ValidationResult => ({
    isValid: specValue.rules.some((rule) => evaluateValidator(inputValue, rule).isValid),
  }),
} satisfies {
  [K in ValidatorSpec['type']]: (
    inputValue: string,
    specValue: Extract<ValidatorSpec, { type: K }>
  ) => ValidationResult;
};

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

  if (!hasOwnKey(isValidatorSpecByType, type)) {
    return false;
  }

  return isValidatorSpecByType[type](value);
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

  const evaluator = evaluateValidatorByType[validatorSpec.type] as (
    inputValue: string,
    specValue: typeof validatorSpec
  ) => ValidationResult;

  return evaluator(value, validatorSpec);
}

export function validateValue(value: string, validatorSpec?: ValidatorSpec): boolean {
  return evaluateValidator(value, validatorSpec).isValid;
}
