import { pgTable, uuid } from 'drizzle-orm/pg-core';

export const placeholder = pgTable('placeholder', {
  id: uuid('id').primaryKey().defaultRandom(),
});
