import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("mfo_numbers").del();

  // Inserts seed entries - sample MFO codes for different districts
  await knex("mfo_numbers").insert([
    // Central Bank MFOs
    { id: 1, mfo_code: "00014", district_id: 1 },
    { id: 2, mfo_code: "00015", district_id: 1 },

    // Tashkent city districts MFOs
    { id: 3, mfo_code: "00001", district_id: 2 }, // Chilonzor
    { id: 4, mfo_code: "00002", district_id: 3 }, // Yakkasaroy
    { id: 5, mfo_code: "00003", district_id: 4 }, // Yunusobod
    { id: 6, mfo_code: "00004", district_id: 5 }, // Mirzo Ulugbek
    { id: 7, mfo_code: "00005", district_id: 6 }, // Uchtepa
    { id: 8, mfo_code: "00006", district_id: 7 }, // Sergeli
    { id: 9, mfo_code: "00007", district_id: 8 }, // Olmazor
    { id: 10, mfo_code: "00008", district_id: 9 }, // Bektemir
    { id: 11, mfo_code: "00009", district_id: 10 }, // Shayxontoxur
    { id: 12, mfo_code: "00010", district_id: 11 }, // Yashnobod
    { id: 13, mfo_code: "00011", district_id: 12 }, // Mirobod

    // Regional centers MFOs
    { id: 14, mfo_code: "00101", district_id: 13 }, // Andijon
    { id: 15, mfo_code: "00102", district_id: 14 }, // Buxoro
    { id: 16, mfo_code: "00103", district_id: 15 }, // Jizzax
    { id: 17, mfo_code: "00104", district_id: 16 }, // Qashqadaryo
    { id: 18, mfo_code: "00105", district_id: 17 }, // Navoiy
    { id: 19, mfo_code: "00106", district_id: 18 }, // Namangan
    { id: 20, mfo_code: "00107", district_id: 19 }, // Samarqand
    { id: 21, mfo_code: "00108", district_id: 20 }, // Surxondaryo
    { id: 22, mfo_code: "00109", district_id: 21 }, // Sirdaryo
    { id: 23, mfo_code: "00110", district_id: 22 }, // Toshkent viloyati
    { id: 24, mfo_code: "00111", district_id: 23 }, // Farg'ona
    { id: 25, mfo_code: "00112", district_id: 24 }, // Xorazm
    { id: 26, mfo_code: "00113", district_id: 25 }, // Qoraqalpog'iston
  ]);

  // Reset sequence
  await knex.raw(
    "SELECT setval('mfo_numbers_id_seq', (SELECT MAX(id) FROM mfo_numbers))",
  );
}
