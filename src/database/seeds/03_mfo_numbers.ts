import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("mfo_numbers").del();

  // Inserts seed entries - MFO codes for Sirdaryo viloyati districts
  await knex("mfo_numbers").insert([
    { id: 1, mfo_code: "00365V", district_id: 1 }, // Sirdaryo viloyati (bosh ofis)

    // Sirdaryo viloyati districts
    { id: 2, mfo_code: "00365", district_id: 2 }, // Guliston shahri
    { id: 3, mfo_code: "00374", district_id: 3 }, // Sardoba tumani
    { id: 4, mfo_code: "00375", district_id: 4 }, // Sirdaryo tumani
    { id: 5, mfo_code: "00378", district_id: 5 }, // Yangiyеr shahri
    { id: 6, mfo_code: "00382", district_id: 6 }, // Boyovut tumani
    { id: 7, mfo_code: "00383", district_id: 7 }, // Shirin shahri
    { id: 8, mfo_code: "00386", district_id: 8 }, // Guliston tumani
    { id: 9, mfo_code: "00388", district_id: 9 }, // Sayxunobod tumani
    { id: 10, mfo_code: "00390", district_id: 10 }, // Oqoltin tumani
    { id: 11, mfo_code: "00392", district_id: 11 }, // Xovos tumani
  ]);

  // Reset sequence
  await knex.raw(
    "SELECT setval('mfo_numbers_id_seq', (SELECT MAX(id) FROM mfo_numbers))",
  );
}
