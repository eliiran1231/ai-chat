import type { AndValidatorSpec } from './AndValidatorSpec';
import type { LengthValidatorSpec } from './LengthValidatorSpec';
import type { OneOfValidatorSpec } from './OneOfValidatorSpec';
import type { OrValidatorSpec } from './OrValidatorSpec';
import type { RegexValidatorSpec } from './RegexValidatorSpec';
import type { RequiredValidatorSpec } from './RequiredValidatorSpec';

export type ValidatorSpec =
  | RequiredValidatorSpec
  | RegexValidatorSpec
  | LengthValidatorSpec
  | OneOfValidatorSpec
  | AndValidatorSpec
  | OrValidatorSpec;
