import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("appeal_answers", (table) => {
    table
      .enum("approval_status", ["pending", "approved", "rejected"])
      .notNullable()
      .defaultTo("pending");
    table.text("rejection_reason").nullable();
    table.timestamp("approved_at").nullable();
    table.timestamp("rejected_at").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("appeal_answers", (table) => {
    table.dropColumn("approval_status");
    table.dropColumn("rejection_reason");
    table.dropColumn("approved_at");
    table.dropColumn("rejected_at");
  });
}
