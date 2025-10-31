import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("districts", (table) => {
    table.increments("id").primary();
    table.string("name_uz", 255).notNullable();
    table.string("name_ru", 255).notNullable();
    table.boolean("is_central").defaultTo(false);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("districts");
}
