import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("appeal_answers", (table) => {
    table.increments("id").primary();
    table.integer("appeal_id").unsigned().notNullable();
    table.integer("moderator_id").unsigned().notNullable();
    table.text("text").nullable();
    table.jsonb("file_jsons").nullable(); // Stores array of file metadata
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table
      .foreign("appeal_id")
      .references("id")
      .inTable("appeals")
      .onDelete("CASCADE");
    table
      .foreign("moderator_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.index("appeal_id");
    table.index("moderator_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("appeal_answers");
}
