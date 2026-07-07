import { DrizzleAppSchema } from '@powersync/drizzle-driver';
import { drizzleSchema } from './drizzle-schema.js';

export const AppSchema = new DrizzleAppSchema(drizzleSchema);

export type Database = (typeof AppSchema)['types'];
