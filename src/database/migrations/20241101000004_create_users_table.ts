import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.bigInteger("telegram_id").notNullable().unique();
    table
      .enum("type", [
        "individual",
        "business",
        "government",
        "moderator",
        "admin",
      ])
      .notNullable();
    table.string("full_name", 255).notNullable();
    table.string("phone", 20).notNullable();
    table.string("additional_phone", 20).nullable();
    table.date("birth_date").nullable();
    table.integer("district_id").unsigned().nullable();
    table.enum("language", ["uz", "ru"]).notNullable().defaultTo("uz");
    table.timestamps(true, true);

    table
      .foreign("district_id")
      .references("id")
      .inTable("districts")
      .onDelete("SET NULL");
    table.index("telegram_id");
    table.index("district_id");
    table.index("type");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("users");
}
