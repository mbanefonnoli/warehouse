import { pgTable, uuid, text, real, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  addressLine1: text('address_line1'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  notes: text('notes'),
  lat: real('lat'),
  lng: real('lng'),
  // Stores any CSV columns not in the fixed schema
  extra: jsonb('extra'),
});

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  updatedAt: timestamp('updated_at').defaultNow(),
  data: jsonb('data').$type<{
    matchSensitivity: 'strict' | 'normal' | 'loose';
    stripCompanySuffixes: boolean;
    includeAllColumns: boolean;
  }>(),
});
