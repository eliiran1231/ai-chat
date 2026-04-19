import type { ValidatorSpec } from './ValidatorSpec';

export interface OrValidatorSpec {
  type: 'or';
  rules: ValidatorSpec[];
}
