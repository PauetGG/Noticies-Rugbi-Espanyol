import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db',
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});