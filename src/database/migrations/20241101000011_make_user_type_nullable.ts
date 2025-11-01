import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE users
    ALTER COLUMN type DROP NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE users
    ALTER COLUMN type SET NOT NULL
  `);
}
