import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { AppealService } from "../../appeal/services/appeal.service";
import { FileService } from "../../file/services/file.service";
import { UserService } from "../../user/services/user.service";
import { FileMetadata } from "../../../common/types/file.types";
import { InlineKeyboard, Keyboard } from "grammy";

export class AppealHandler {
  constructor(
    private i18nService: I18nService,
    private appealService: AppealService,
    private fileService: FileService,
    private userService: UserService,
  ) {}

  /**
   * Start appeal creation flow
   */
  async startAppealCreation(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    // Check if user exists
    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(
        "Iltimos, avval ro'yxatdan o'ting / Пожалуйста, сначала зарегистрируйтесь",
      );
      return;
    }

    // Check if user has active appeal
    const activeAppeal = await this.appealService.getActiveAppealByUserId(
      user.id,
    );

    if (activeAppeal) {
      // User already has active appeal - ask if they want to request approval
      const keyboard = new InlineKeyboard()
        .text(
          language === "uz"
            ? "✅ Ruxsat so'rash"
            : "✅ Запросить разрешение",
          "request_approval",
        )
        .row()
        .text(language === "uz" ? "❌ Bekor qilish" : "❌ Отменить", "cancel");

      await ctx.reply(
        this.i18nService.t("appeal.send.already_active", language),
        { reply_markup: keyboard },
      );
      return;
    }

    // Initialize appeal data
    ctx.session.data.appealText = undefined;
    ctx.session.data.appealFiles = [];
    ctx.session.data.appealCustomNumber = undefined;

    // For government users, ask if they want custom appeal number
    if (user.type === "government") {
      ctx.session.step = "appeal_custom_number_prompt";

      const keyboard = new InlineKeyboard()
        .text(language === "uz" ? "Ha" : "Да", "custom_number_yes")
        .text(language === "uz" ? "Yo'q" : "Нет", "custom_number_no");

      await ctx.reply(
        this.i18nService.t("appeal.send.custom_number", language),
        { reply_markup: keyboard },
      );
    } else {
      // Go directly to text input
      this.startTextInput(ctx);
    }
  }

  /**
   * Handle custom number response
   */
  async handleCustomNumberPrompt(ctx: BotContext, response: "yes" | "no") {
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    if (response === "yes") {
      ctx.session.step = "appeal_custom_number_input";
      await ctx.editMessageText(
        this.i18nService.t("appeal.send.enter_number", language),
      );
    } else {
      await ctx.editMessageText(
        this.i18nService.t("appeal.send.enter_text", language),
      );
      this.startTextInput(ctx);
    }
  }

  /**
   * Handle custom number input
   */
  async handleCustomNumberInput(ctx: BotContext, customNumber: string) {
    const { language } = ctx.session;

    ctx.session.data.appealCustomNumber = customNumber.trim();
    await ctx.reply(this.i18nService.t("appeal.send.enter_text", language));
    this.startTextInput(ctx);
  }

  /**
   * Start text/file input
   */
  private async startTextInput(ctx: BotContext) {
    const { language } = ctx.session;

    ctx.session.step = "appeal_text_input";

    const submitText = language === "uz" ? "✅ Yuborish" : "✅ Отправить";
    const keyboard = new Keyboard()
      .text(submitText)
      .resized()
      .persistent();

    await ctx.reply(this.i18nService.t("appeal.send.attach_files", language), {
      reply_markup: keyboard,
    });
  }

  /**
   * Handle text message (appeal content or files)
   */
  async handleAppealContent(ctx: BotContext) {
    const { language } = ctx.session;

    // Extract text if available
    if (ctx.message?.text) {
      ctx.session.data.appealText = ctx.message.text;
      await ctx.reply(
        language === "uz"
          ? "✅ Matn qabul qilindi"
          : "✅ Текст принят",
      );
    }

    // Extract file metadata if available
    const fileMetadata = this.fileService.extractFileMetadata(ctx.message);
    if (fileMetadata) {
      if (!ctx.session.data.appealFiles) {
        ctx.session.data.appealFiles = [];
      }
      ctx.session.data.appealFiles.push(fileMetadata);

      await ctx.reply(
        language === "uz"
          ? `✅ Fayl qabul qilindi (${ctx.session.data.appealFiles.length})`
          : `✅ Файл принят (${ctx.session.data.appealFiles.length})`,
      );
    }
  }

  /**
   * Submit appeal
   */
  async submitAppeal(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language, data } = ctx.session;

    // Answer callback query if it's from inline button (backward compatibility)
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery();
    }

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    // Validate appeal content
    const hasText = !!data.appealText && data.appealText.trim().length > 0;
    const files = data.appealFiles || [];

    const validation = this.fileService.validateAppealFiles(files, hasText);
    if (!validation.valid) {
      await ctx.reply(
        this.i18nService.t("appeal.send.need_text", language),
      );
      return;
    }

    try {
      // Create appeal
      const appeal = await this.appealService.createAppeal({
        user_id: user.id,
        district_id: 0, // Will be set by AppealService based on user type
        text: data.appealText,
        file_jsons: files,
        custom_number: data.appealCustomNumber,
      });

      // Clear appeal data
      ctx.session.data.appealText = undefined;
      ctx.session.data.appealFiles = [];
      ctx.session.data.appealCustomNumber = undefined;
      ctx.session.step = "main_menu";

      const successMessage = this.i18nService.t("appeal.send.success", language).replace(
        "{{number}}",
        appeal.appeal_number,
      );

      // Use editMessageText if callback query, otherwise reply
      if (ctx.callbackQuery) {
        await ctx.editMessageText(successMessage);
      } else {
        await ctx.reply(successMessage);
      }

      // TODO: Notify moderators of the target district
    } catch (error) {
      console.error("Error creating appeal:", error);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Request approval for multiple appeals
   */
  async requestApproval(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    try {
      await this.appealService.requestMultipleAppealApproval(user.id);

      await ctx.editMessageText(
        this.i18nService.t("appeal.send.request_sent", language),
      );

      // TODO: Notify moderators about approval request
    } catch (error) {
      console.error("Error requesting approval:", error);
      await ctx.reply(
        error instanceof Error ? error.message : this.i18nService.t("common.error", language),
      );
    }
  }

  /**
   * Get user's appeals (My Appeals feature)
   */
  async showMyAppeals(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(
        "Iltimos, avval ro'yxatdan o'ting / Пожалуйста, сначала зарегистрируйтесь",
      );
      return;
    }

    const appeals = await this.appealService.getUserAppeals(user.id);

    if (appeals.length === 0) {
      await ctx.reply(this.i18nService.t("appeal.list.empty", language));
      return;
    }

    // Format appeals list
    let message = language === "uz" ? "📋 Mening murojaatlarim:\n\n" : "📋 Мои обращения:\n\n";

    for (const appeal of appeals) {
      const statusText = this.i18nService.t(`appeal.list.status_${appeal.status}`, language);
      message += `🔹 ${appeal.appeal_number}\n`;
      message += `   ${language === "uz" ? "Holat" : "Статус"}: ${statusText}\n`;
      message += `   ${language === "uz" ? "Sana" : "Дата"}: ${new Date(appeal.created_at).toLocaleDateString()}\n\n`;
    }

    await ctx.reply(message);
  }
}
