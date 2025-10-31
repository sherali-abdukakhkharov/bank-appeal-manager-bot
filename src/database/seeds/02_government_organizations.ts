import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex("government_organizations").del();

  // Inserts seed entries
  await knex("government_organizations").insert([
    {
      id: 1,
      name_uz: "O'zbekiston Respublikasi Prezidenti Administratsiyasi",
      name_ru: "Администрация Президента Республики Узбекистан",
    },
    {
      id: 2,
      name_uz: "O'zbekiston Respublikasi Vazirlar Mahkamasi",
      name_ru: "Кабинет Министров Республики Узбекистан",
    },
    { id: 3, name_uz: "Moliya vazirligi", name_ru: "Министерство финансов" },
    {
      id: 4,
      name_uz: "Iqtisodiyot va moliya vazirligi",
      name_ru: "Министерство экономики и финансов",
    },
    {
      id: 5,
      name_uz: "Ichki ishlar vazirligi",
      name_ru: "Министерство внутренних дел",
    },
    { id: 6, name_uz: "Soliq qo'mitasi", name_ru: "Налоговый комитет" },
    { id: 7, name_uz: "Bojxona qo'mitasi", name_ru: "Таможенный комитет" },
    {
      id: 8,
      name_uz: "Davlat xavfsizlik xizmati",
      name_ru: "Служба государственной безопасности",
    },
    { id: 9, name_uz: "Bosh prokuratura", name_ru: "Генеральная прокуратура" },
    { id: 10, name_uz: "Adliya vazirligi", name_ru: "Министерство юстиции" },
    {
      id: 11,
      name_uz: "Markaziy saylov komissiyasi",
      name_ru: "Центральная избирательная комиссия",
    },
    {
      id: 12,
      name_uz: "Davlat statistika qo'mitasi",
      name_ru: "Государственный комитет по статистике",
    },
    {
      id: 13,
      name_uz: "Davlat aktivlarini boshqarish agentligi",
      name_ru: "Агентство по управлению государственными активами",
    },
    {
      id: 14,
      name_uz:
        "Raqobatni rivojlantirish va iste'molchilar huquqlarini himoya qilish qo'mitasi",
      name_ru: "Комитет по развитию конкуренции и защите прав потребителей",
    },
    {
      id: 15,
      name_uz: "Boshqa davlat tashkiloti",
      name_ru: "Другая государственная организация",
    },
  ]);

  // Reset sequence
  await knex.raw(
    "SELECT setval('government_organizations_id_seq', (SELECT MAX(id) FROM government_organizations))",
  );
}
