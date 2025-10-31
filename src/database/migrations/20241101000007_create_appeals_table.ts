import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("appeals", (table) => {
    table.increments("id").primary();
    table.string("appeal_number", 50).notNullable().unique();
    table.integer("user_id").unsigned().notNullable();
    table.integer("district_id").unsigned().notNullable();
    table.text("text").nullable();
    table.jsonb("file_jsons").nullable(); // Stores array of file metadata
    table
      .enum("status", ["new", "in_progress", "closed", "forwarded", "overdue"])
      .notNullable()
      .defaultTo("new");
    table.date("due_date").notNullable();
    table.integer("closed_by_moderator_id").unsigned().nullable();
    table.timestamp("closed_at").nullable();
    table.timestamps(true, true);

    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .foreign("district_id")
      .references("id")
      .inTable("districts")
      .onDelete("RESTRICT");
    table
      .foreign("closed_by_moderator_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.index("appeal_number");
    table.index("user_id");
    table.index("district_id");
    table.index("status");
    table.index("due_date");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("appeals");
}
