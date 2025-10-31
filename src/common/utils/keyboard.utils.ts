import { InlineKeyboard, Keyboard } from "grammy";

/**
 * Keyboard utilities for creating inline and reply keyboards
 */

/**
 * Create language selection keyboard
 */
export function createLanguageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("O'zbek tili 🇺🇿", "lang_uz")
    .text("Русский язык 🇷🇺", "lang_ru");
}

/**
 * Create user type selection keyboard
 */
export function createUserTypeKeyboard(lang: "uz" | "ru"): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (lang === "uz") {
    keyboard
      .text("Jismoniy shaxs", "type_individual")
      .row()
      .text("Yuridik shaxs", "type_business")
      .row()
      .text("Davlat tashkiloti", "type_government")
      .row()
      .text("Moderator", "type_moderator")
      .row()
      .text("Administrator", "type_admin");
  } else {
    keyboard
      .text("Физическое лицо", "type_individual")
      .row()
      .text("Юридическое лицо", "type_business")
      .row()
      .text("Государственная организация", "type_government")
      .row()
      .text("Модератор", "type_moderator")
      .row()
      .text("Администратор", "type_admin");
  }

  return keyboard;
}

/**
 * Create district selection keyboard
 */
export function createDistrictKeyboard(
  districts: Array<{ id: number; name_uz: string; name_ru: string }>,
  lang: "uz" | "ru",
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  districts.forEach((district) => {
    const name = lang === "uz" ? district.name_uz : district.name_ru;
    keyboard.text(name, `district_${district.id}`).row();
  });

  return keyboard;
}

/**
 * Create government organization selection keyboard
 */
export function createGovOrgKeyboard(
  organizations: Array<{ id: number; name_uz: string; name_ru: string }>,
  lang: "uz" | "ru",
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  organizations.forEach((org) => {
    const name = lang === "uz" ? org.name_uz : org.name_ru;
    keyboard.text(name, `govorg_${org.id}`).row();
  });

  return keyboard;
}

/**
 * Create "Skip" button for optional fields
 */
export function createSkipKeyboard(lang: "uz" | "ru"): InlineKeyboard {
  const text = lang === "uz" ? "O'tkazib yuborish" : "Пропустить";
  return new InlineKeyboard().text(text, "skip");
}

/**
 * Create "Yes/No" keyboard
 */
export function createYesNoKeyboard(lang: "uz" | "ru"): InlineKeyboard {
  const yes = lang === "uz" ? "Ha" : "Да";
  const no = lang === "uz" ? "Yo'q" : "Нет";

  return new InlineKeyboard().text(yes, "yes").text(no, "no");
}

/**
 * Create cancel button
 */
export function createCancelKeyboard(lang: "uz" | "ru"): InlineKeyboard {
  const text = lang === "uz" ? "Bekor qilish" : "Отменить";
  return new InlineKeyboard().text(text, "cancel");
}

/**
 * Create phone request keyboard with contact sharing option
 */
export function createPhoneRequestKeyboard(lang: "uz" | "ru"): Keyboard {
  const text =
    lang === "uz" ? "📱 Kontaktni yuborish" : "📱 Отправить контакт";
  return new Keyboard().requestContact(text).resized();
}

/**
 * Remove reply keyboard
 */
export function removeKeyboard() {
  return { remove_keyboard: true as const };
}
