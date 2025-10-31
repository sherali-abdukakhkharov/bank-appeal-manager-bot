import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("appeal_approval_requests", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable();
    table
      .enum("status", ["pending", "approved", "rejected"])
      .notNullable()
      .defaultTo("pending");
    table.integer("moderator_id").unsigned().nullable();
    table.text("reason").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("resolved_at").nullable();

    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .foreign("moderator_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.index("user_id");
    table.index("status");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("appeal_approval_requests");
}
