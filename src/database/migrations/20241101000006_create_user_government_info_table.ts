import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("user_government_info", (table) => {
    table.integer("user_id").unsigned().primary();
    table.integer("government_org_id").unsigned().notNullable();
    table.string("position", 255).notNullable();
    table.timestamps(true, true);

    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .foreign("government_org_id")
      .references("id")
      .inTable("government_organizations")
      .onDelete("RESTRICT");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("user_government_info");
}
