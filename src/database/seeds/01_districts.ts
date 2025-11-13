import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries (with CASCADE to handle foreign key constraints)
  await knex.raw("TRUNCATE TABLE districts RESTART IDENTITY CASCADE");

  // Inserts seed entries
  await knex("districts").insert([
    // Central Bank (main)
    {
      id: 1,
      name_uz: "Sirdaryo viloyati (bosh ofis)",
      name_ru: "Сырдарьинская область (главный офис)",
      is_central: true,
    },
    {
      id: 2,
      name_uz: "Guliston shahri",
      name_ru: "Город Гулистан",
      is_central: false,
    },
    {
      id: 3,
      name_uz: "Sardoba tumani",
      name_ru: "Сардобинский район",
      is_central: false,
    },
    {
      id: 4,
      name_uz: "Sirdaryo tumani",
      name_ru: "Сырдарьинский район",
      is_central: false,
    },
    {
      id: 5,
      name_uz: "Yangiyеr shahri",
      name_ru: "Город Янгиер",
      is_central: false,
    },
    {
      id: 6,
      name_uz: "Boyovut tumani",
      name_ru: "Баяутский район",
      is_central: false,
    },
    {
      id: 7,
      name_uz: "Shirin shahri",
      name_ru: "Город Ширин",
      is_central: false,
    },
    {
      id: 8,
      name_uz: "Guliston tumani",
      name_ru: "Гулистанский район",
      is_central: false,
    },
    {
      id: 9,
      name_uz: "Sayxunobod tumani",
      name_ru: "Сайхунабадский район",
      is_central: false,
    },
    {
      id: 10,
      name_uz: "Oqoltin tumani",
      name_ru: "Акалтынский район",
      is_central: false,
    },
    {
      id: 11,
      name_uz: "Xovos tumani",
      name_ru: "Хавастский район",
      is_central: false,
    },
  ]);

  // Reset sequence
  await knex.raw(
    "SELECT setval('districts_id_seq', (SELECT MAX(id) FROM districts))",
  );
}
