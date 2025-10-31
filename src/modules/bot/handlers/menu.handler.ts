import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { User } from "../../user/interfaces/user.interface";
import { InlineKeyboard } from "grammy";

export class MenuHandler {
  constructor(private i18nService: I18nService) {}

  /**
   * Show main menu based on user type
   */
  async showMainMenu(ctx: BotContext, user: User) {
    const { language, type } = user;

    let keyboard: InlineKeyboard;
    let menuText: string;

    switch (type) {
      case "individual":
      case "business":
      case "government":
        keyboard = this.createUserMenu(language);
        menuText = this.i18nService.t("menu.user_menu", language);
        break;

      case "moderator":
        keyboard = this.createModeratorMenu(language);
        menuText = this.i18nService.t("menu.moderator_menu", language);
        break;

      case "admin":
        keyboard = this.createAdminMenu(language);
        menuText = this.i18nService.t("menu.admin_menu", language);
        break;

      default:
        menuText = this.i18nService.t("common.error", language);
        keyboard = new InlineKeyboard();
    }

    await ctx.reply(menuText, { reply_markup: keyboard });
  }

  /**
   * Create menu for Individual/Business/Government users
   */
  private createUserMenu(lang: "uz" | "ru"): InlineKeyboard {
    const sendAppealText = lang === "uz" ? "📝 Murojaat yuborish" : "📝 Отправить обращение";
    const myAppealsText = lang === "uz" ? "📋 Mening murojaatlarim" : "📋 Мои обращения";

    return new InlineKeyboard()
      .text(sendAppealText, "menu_send_appeal")
      .row()
      .text(myAppealsText, "menu_my_appeals");
  }

  /**
   * Create menu for Moderators
   */
  private createModeratorMenu(lang: "uz" | "ru"): InlineKeyboard {
    const reviewAppealsText = lang === "uz" ? "📝 Murojaatlarni ko'rib chiqish" : "📝 Рассмотреть обращения";
    const statisticsText = lang === "uz" ? "📊 Statistika" : "📊 Статистика";

    return new InlineKeyboard()
      .text(reviewAppealsText, "menu_review_appeals")
      .row()
      .text(statisticsText, "menu_statistics");
  }

  /**
   * Create menu for Admins
   */
  private createAdminMenu(lang: "uz" | "ru"): InlineKeyboard {
    const allAppealsText = lang === "uz" ? "📋 Barcha faol murojaatlar" : "📋 Все активные обращения";
    const reviewAppealText = lang === "uz" ? "📝 Murojaatni ko'rib chiqish" : "📝 Рассмотреть обращение";
    const statisticsText = lang === "uz" ? "📊 Statistika" : "📊 Статистика";

    return new InlineKeyboard()
      .text(allAppealsText, "menu_all_appeals")
      .row()
      .text(reviewAppealText, "menu_review_appeal")
      .row()
      .text(statisticsText, "menu_statistics");
  }
}
