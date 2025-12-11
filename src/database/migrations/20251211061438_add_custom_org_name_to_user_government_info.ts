import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("user_government_info", (table) => {
    table.string("custom_org_name", 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("user_government_info", (table) => {
    table.dropColumn("custom_org_name");
  });
}
