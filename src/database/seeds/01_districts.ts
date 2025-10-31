import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("districts").del();

  // Inserts seed entries
  await knex("districts").insert([
    // Central Bank District (main)
    {
      id: 1,
      name_uz: "Markaziy bank",
      name_ru: "Центральный банк",
      is_central: true,
    },

    // Tashkent city districts
    {
      id: 2,
      name_uz: "Chilonzor tumani",
      name_ru: "Чиланзарский район",
      is_central: false,
    },
    {
      id: 3,
      name_uz: "Yakkasaroy tumani",
      name_ru: "Яккасарайский район",
      is_central: false,
    },
    {
      id: 4,
      name_uz: "Yunusobod tumani",
      name_ru: "Юнусабадский район",
      is_central: false,
    },
    {
      id: 5,
      name_uz: "Mirzo Ulug'bek tumani",
      name_ru: "Мирзо-Улугбекский район",
      is_central: false,
    },
    {
      id: 6,
      name_uz: "Uchtepa tumani",
      name_ru: "Учтепинский район",
      is_central: false,
    },
    {
      id: 7,
      name_uz: "Sergeli tumani",
      name_ru: "Сергелийский район",
      is_central: false,
    },
    {
      id: 8,
      name_uz: "Olmazor tumani",
      name_ru: "Алмазарский район",
      is_central: false,
    },
    {
      id: 9,
      name_uz: "Bektemir tumani",
      name_ru: "Бектемирский район",
      is_central: false,
    },
    {
      id: 10,
      name_uz: "Shayxontoxur tumani",
      name_ru: "Шайхантахурский район",
      is_central: false,
    },
    {
      id: 11,
      name_uz: "Yashnobod tumani",
      name_ru: "Яшнабадский район",
      is_central: false,
    },
    {
      id: 12,
      name_uz: "Mirobod tumani",
      name_ru: "Мирабадский район",
      is_central: false,
    },

    // Regional centers
    {
      id: 13,
      name_uz: "Andijon viloyati",
      name_ru: "Андижанская область",
      is_central: false,
    },
    {
      id: 14,
      name_uz: "Buxoro viloyati",
      name_ru: "Бухарская область",
      is_central: false,
    },
    {
      id: 15,
      name_uz: "Jizzax viloyati",
      name_ru: "Джизакская область",
      is_central: false,
    },
    {
      id: 16,
      name_uz: "Qashqadaryo viloyati",
      name_ru: "Кашкадарьинская область",
      is_central: false,
    },
    {
      id: 17,
      name_uz: "Navoiy viloyati",
      name_ru: "Навоийская область",
      is_central: false,
    },
    {
      id: 18,
      name_uz: "Namangan viloyati",
      name_ru: "Наманганская область",
      is_central: false,
    },
    {
      id: 19,
      name_uz: "Samarqand viloyati",
      name_ru: "Самаркандская область",
      is_central: false,
    },
    {
      id: 20,
      name_uz: "Surxondaryo viloyati",
      name_ru: "Сурхандарьинская область",
      is_central: false,
    },
    {
      id: 21,
      name_uz: "Sirdaryo viloyati",
      name_ru: "Сырдарьинская область",
      is_central: false,
    },
    {
      id: 22,
      name_uz: "Toshkent viloyati",
      name_ru: "Ташкентская область",
      is_central: false,
    },
    {
      id: 23,
      name_uz: "Farg'ona viloyati",
      name_ru: "Ферганская область",
      is_central: false,
    },
    {
      id: 24,
      name_uz: "Xorazm viloyati",
      name_ru: "Хорезмская область",
      is_central: false,
    },
    {
      id: 25,
      name_uz: "Qoraqalpog'iston Respublikasi",
      name_ru: "Республика Каракалпакстан",
      is_central: false,
    },
  ]);

  // Reset sequence
  await knex.raw(
    "SELECT setval('districts_id_seq', (SELECT MAX(id) FROM districts))",
  );
}
