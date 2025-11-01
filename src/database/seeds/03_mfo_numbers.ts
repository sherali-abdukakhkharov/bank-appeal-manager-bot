import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("mfo_numbers").del();

  // Inserts seed entries - MFO codes for Sirdaryo viloyati districts
  await knex("mfo_numbers").insert([
    // Central Bank (Sirdaryo viloyati bosh ofis)
    { id: 1, mfo_code: "00014", district_id: 1 },
    { id: 2, mfo_code: "00015", district_id: 1 },

    // Sirdaryo viloyati districts
    { id: 3, mfo_code: "01001", district_id: 2 }, // Boyovut tumani
    { id: 4, mfo_code: "01002", district_id: 3 }, // Guliston shahar
    { id: 5, mfo_code: "01003", district_id: 4 }, // Guliston tumani
    { id: 6, mfo_code: "01004", district_id: 5 }, // Mirzaobod tumani
    { id: 7, mfo_code: "01005", district_id: 6 }, // Oqoltin tumani
    { id: 8, mfo_code: "01006", district_id: 7 }, // Sardoba tumani
    { id: 9, mfo_code: "01007", district_id: 8 }, // Sayxunobod tumani
    { id: 10, mfo_code: "01008", district_id: 9 }, // Sirdaryo tumani
    { id: 11, mfo_code: "01009", district_id: 10 }, // Shirin shahri
    { id: 12, mfo_code: "01010", district_id: 11 }, // Xovos tumani
    { id: 13, mfo_code: "01011", district_id: 12 }, // Yangiyеr shahri
  ]);

  // Reset sequence
  await knex.raw(
    "SELECT setval('mfo_numbers_id_seq', (SELECT MAX(id) FROM mfo_numbers))",
  );
}
