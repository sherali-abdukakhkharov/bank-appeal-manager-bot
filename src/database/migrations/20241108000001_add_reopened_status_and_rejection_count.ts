import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // First, add rejection_count column to appeals table
  await knex.schema.alterTable("appeals", (table) => {
    table.integer("rejection_count").defaultTo(0).notNullable();
  });

  // For the status enum, we need to drop and recreate the constraint
  // First, drop the old check constraint if it exists
  await knex.raw(`
    ALTER TABLE appeals DROP CONSTRAINT IF EXISTS appeals_status_check
  `);

  // Add new check constraint with 'reopened' included
  await knex.raw(`
    ALTER TABLE appeals ADD CONSTRAINT appeals_status_check
    CHECK (status IN ('new', 'in_progress', 'closed', 'forwarded', 'overdue', 'reopened'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove rejection_count column
  await knex.schema.alterTable("appeals", (table) => {
    table.dropColumn("rejection_count");
  });

  // Restore original status constraint
  await knex.raw(`
    ALTER TABLE appeals DROP CONSTRAINT IF EXISTS appeals_status_check
  `);

  await knex.raw(`
    ALTER TABLE appeals ADD CONSTRAINT appeals_status_check
    CHECK (status IN ('new', 'in_progress', 'closed', 'forwarded', 'overdue'))
  `);
}
