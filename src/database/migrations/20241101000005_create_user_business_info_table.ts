import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("user_business_info", (table) => {
    table.integer("user_id").unsigned().primary();
    table.text("organization_address").notNullable();
    table.integer("bank_account_district_id").unsigned().notNullable();
    table.timestamps(true, true);

    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .foreign("bank_account_district_id")
      .references("id")
      .inTable("districts")
      .onDelete("RESTRICT");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("user_business_info");
}
