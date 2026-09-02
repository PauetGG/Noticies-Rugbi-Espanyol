import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,  // obligatorio con el transaction pooler de Supabase
  max: 10,
});

export const db = drizzle(client, {
  schema: { ...schema, ...relations },
});