import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("mfo_numbers", (table) => {
    table.increments("id").primary();
    table.string("mfo_code", 10).notNullable().unique();
    table.integer("district_id").unsigned().notNullable();
    table.timestamps(true, true);

    table
      .foreign("district_id")
      .references("id")
      .inTable("districts")
      .onDelete("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("mfo_numbers");
}
