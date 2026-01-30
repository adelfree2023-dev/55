import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    subdomain: varchar('subdomain', { length: 255 }).notNull().unique(),
    ownerEmail: varchar('owner_email', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('active'),
    planId: varchar('plan_id', { length: 50 }).default('basic'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
