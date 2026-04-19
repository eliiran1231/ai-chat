import type { ValidatorSpec } from './ValidatorSpec';

export interface AndValidatorSpec {
  type: 'and';
  rules: ValidatorSpec[];
}
