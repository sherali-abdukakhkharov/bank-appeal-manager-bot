import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("government_organizations").del();

  // Inserts seed entries
  await knex("government_organizations").insert([
    {
      id: 1,
      name_uz: "Prokuratura",
      name_ru: "Прокуратура",
    },
    {
      id: 2,
      name_uz: "MIB",
      name_ru: "БПИ",
    },
    {
      id: 3,
      name_uz: "Sud",
      name_ru: "Суд",
    },
    {
      id: 4,
      name_uz: "Soliq",
      name_ru: "Налоговая",
    },
  ]);

  // Reset sequence
  await knex.raw(
    "SELECT setval('government_organizations_id_seq', (SELECT MAX(id) FROM government_organizations))",
  );
}
