import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("appeal_logs", (table) => {
    table.increments("id").primary();
    table.integer("appeal_id").unsigned().notNullable();
    table
      .enum("action_type", [
        "created",
        "forwarded",
        "extended",
        "closed",
        "reopened",
      ])
      .notNullable();
    table.integer("from_district_id").unsigned().nullable();
    table.integer("to_district_id").unsigned().nullable();
    table.date("old_due_date").nullable();
    table.date("new_due_date").nullable();
    table.integer("moderator_id").unsigned().nullable();
    table.text("comment").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table
      .foreign("appeal_id")
      .references("id")
      .inTable("appeals")
      .onDelete("CASCADE");
    table
      .foreign("from_district_id")
      .references("id")
      .inTable("districts")
      .onDelete("SET NULL");
    table
      .foreign("to_district_id")
      .references("id")
      .inTable("districts")
      .onDelete("SET NULL");
    table
      .foreign("moderator_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.index("appeal_id");
    table.index("action_type");
    table.index("created_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("appeal_logs");
}
