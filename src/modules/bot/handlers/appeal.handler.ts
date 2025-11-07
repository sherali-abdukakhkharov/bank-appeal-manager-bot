import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { AppealService } from "../../appeal/services/appeal.service";
import { FileService } from "../../file/services/file.service";
import { UserService } from "../../user/services/user.service";
import { NotificationService } from "../../notification/services/notification.service";
import { DistrictService } from "../../district/services/district.service";
import { FileMetadata } from "../../../common/types/file.types";
import { InlineKeyboard, Keyboard } from "grammy";
import { formatDate, formatDateTime } from "../../../common/utils/date.util";
import { MenuHandler } from "./menu.handler";
import { BotErrorLogger } from "../../../common/utils/bot-error-logger.util";

export class AppealHandler {
  constructor(
    private i18nService: I18nService,
    private appealService: AppealService,
    private fileService: FileService,
    private userService: UserService,
    private menuHandler: MenuHandler,
    private notificationService: NotificationService,
    private districtService: DistrictService,
  ) { }

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
      // Check if user has an approved approval request
      const approvedRequest = await this.appealService.getApprovedApprovalRequest(user.id);

      if (!approvedRequest) {
        // User already has active appeal and no approved request - ask if they want to request approval
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
      // If there's an approved request, continue with appeal creation
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
      BotErrorLogger.logError('User not found', ctx);
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

      // If user had an approved request, delete it now that they've used it
      const approvedRequest = await this.appealService.getApprovedApprovalRequest(user.id);
      if (approvedRequest) {
        await this.appealService.deleteApprovalRequest(approvedRequest.id);
      }

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

      // Show main menu
      await this.menuHandler.showMainMenu(ctx, user);

      // Notify moderators of the target district
      await this.notificationService.notifyModeratorsAboutNewAppeal(
        appeal,
        user,
      );
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
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
      BotErrorLogger.logError('User not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    try {
      // Check if user already has a pending request
      const existingRequest = await this.appealService.getPendingApprovalRequest(user.id);
      if (existingRequest) {
        await ctx.editMessageText(
          language === "uz"
            ? "⚠️ Sizda allaqachon kutilayotgan ruxsat so'rovi mavjud.\n\nModerator javobini kuting."
            : "⚠️ У вас уже есть ожидающий запрос на разрешение.\n\nДождитесь ответа модератора."
        );
        return;
      }

      const request = await this.appealService.requestMultipleAppealApproval(user.id);

      await ctx.editMessageText(
        this.i18nService.t("appeal.send.request_sent", language),
      );

      // Notify moderators about approval request
      await this.notificationService.notifyModeratorsAboutApprovalRequest(
        user,
        user.district_id!,
        request.id,
      );
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
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

    // Create inline keyboard with appeal buttons
    const keyboard = new InlineKeyboard();

    for (const appeal of appeals) {
      const statusEmoji = this.getStatusEmoji(appeal.status);
      const statusText = this.i18nService.t(`appeal.list.status_${appeal.status}`, language);
      const buttonText = `${statusEmoji} ${appeal.appeal_number} - ${statusText}`;

      keyboard.text(buttonText, `my_appeal_${appeal.id}`).row();
    }

    const message = language === "uz"
      ? "📋 *Mening murojaatlarim*\n\nBatafsil ko'rish uchun murojaatni tanlang:"
      : "📋 *Мои обращения*\n\nВыберите обращение для просмотра деталей:";

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
  }

  /**
   * Show detailed view of an appeal with history
   */
  async showAppealDetails(ctx: BotContext, appealId: number) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    try {
      const details = await this.appealService.getAppealDetails(appealId);

      if (!details || details.appeal.user_id !== user.id) {
        await ctx.reply(this.i18nService.t("common.error", language));
        return;
      }

      const { appeal, answer, logs } = details;

      // Build message
      const statusText = this.i18nService.t(`appeal.list.status_${appeal.status}`, language);
      const statusEmoji = this.getStatusEmoji(appeal.status);

      let message = language === "uz"
        ? `📋 *Murojaat tafsilotlari*\n\n`
        : `📋 *Детали обращения*\n\n`;

      message += `📝 ${language === "uz" ? "Raqam" : "Номер"}: ${appeal.appeal_number}\n`;
      message += `${statusEmoji} ${language === "uz" ? "Holat" : "Статус"}: ${statusText}\n`;
      message += `📅 ${language === "uz" ? "Yaratilgan" : "Создано"}: ${formatDateTime(appeal.created_at)}\n`;
      message += `⏰ ${language === "uz" ? "Muddat" : "Срок"}: ${formatDate(appeal.due_date)}\n\n`;

      if (appeal.text) {
        message += `💬 ${language === "uz" ? "Matn" : "Текст"}:\n${appeal.text}\n\n`;
      }

      // Show history if exists
      if (logs && logs.length > 0) {
        message += language === "uz" ? `📜 *Tarix*:\n\n` : `📜 *История*:\n\n`;

        for (const log of logs) {
          const logMessage = await this.formatLogEntry(log, language);
          message += `${logMessage}\n`;
        }
        message += `\n`;
      }

      // Show answer if closed
      if (answer) {
        message += language === "uz"
          ? `✅ *Javob*:\n${answer.text || ""}\n`
          : `✅ *Ответ*:\n${answer.text || ""}\n`;

        // Show approval status if already processed
        if (answer.approval_status === "approved") {
          message += language === "uz"
            ? `\n✅ *Siz javobni qabul qilgansiz*\n`
            : `\n✅ *Вы одобрили ответ*\n`;
        } else if (answer.approval_status === "rejected") {
          message += language === "uz"
            ? `\n❌ *Siz javobni rad etgansiz*\n`
            : `\n❌ *Вы отклонили ответ*\n`;
          if (answer.rejection_reason) {
            message += language === "uz"
              ? `💬 *Sabab:* ${answer.rejection_reason}\n`
              : `💬 *Причина:* ${answer.rejection_reason}\n`;
          }
        }
      }

      // Send message
      await ctx.editMessageText(message, { parse_mode: "Markdown" });

      // Send appeal files if any
      if (appeal.file_jsons && appeal.file_jsons.length > 0) {
        for (const file of appeal.file_jsons) {
          await this.sendFileToUser(ctx, file);
        }
      }

      // Send answer files if any
      if (answer?.file_jsons && answer.file_jsons.length > 0) {
        const answerFilesHeader = language === "uz"
          ? "📎 Javob fayllari:"
          : "📎 Файлы ответа:";
        await ctx.reply(answerFilesHeader);

        for (const file of answer.file_jsons) {
          await this.sendFileToUser(ctx, file);
        }
      }

      // Show action buttons based on answer status
      const keyboard = new InlineKeyboard();

      // If answer is pending, show approve/reject buttons
      if (answer && answer.approval_status === "pending") {
        keyboard
          .text(
            language === "uz" ? "✅ Javobni qabul qilish" : "✅ Одобрить ответ",
            `approve_answer_${answer.id}`
          )
          .row()
          .text(
            language === "uz" ? "❌ Javobni rad etish" : "❌ Отклонить ответ",
            `reject_answer_${answer.id}`
          )
          .row();
      }

      // Always show back button
      keyboard.text(language === "uz" ? "⬅️ Orqaga" : "⬅️ Назад", "back_to_my_appeals");

      await ctx.reply(
        language === "uz" ? "Nima qilmoqchisiz?" : "Что вы хотите сделать?",
        { reply_markup: keyboard }
      );
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Handle back to my appeals button
   */
  async handleBackToMyAppeals(ctx: BotContext) {
    await ctx.answerCallbackQuery();
    await this.showMyAppeals(ctx);
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case "new":
        return "🆕";
      case "in_progress":
        return "⏳";
      case "closed":
        return "✅";
      case "forwarded":
        return "🔄";
      case "overdue":
        return "🔴";
      case "reopened":
        return "🔄";
      default:
        return "📋";
    }
  }

  /**
   * Format log entry for display
   */
  private async formatLogEntry(log: any, language: string): Promise<string> {
    const timestamp = formatDateTime(log.created_at);

    switch (log.action_type) {
      case "created":
        return language === "uz"
          ? `🆕 ${timestamp} - Murojaat yaratildi`
          : `🆕 ${timestamp} - Обращение создано`;

      case "forwarded": {
        const fromDistrict = await this.districtService.findDistrictById(log.from_district_id);
        const toDistrict = await this.districtService.findDistrictById(log.to_district_id);
        const fromName = language === "uz" ? fromDistrict?.name_uz : fromDistrict?.name_ru;
        const toName = language === "uz" ? toDistrict?.name_uz : toDistrict?.name_ru;

        return language === "uz"
          ? `🔄 ${timestamp} - ${fromName} dan ${toName} ga yo'naltirildi`
          : `🔄 ${timestamp} - Перенаправлено из ${fromName} в ${toName}`;
      }

      case "extended": {
        const oldDate = formatDate(log.old_due_date);
        const newDate = formatDate(log.new_due_date);

        return language === "uz"
          ? `📅 ${timestamp} - Muddat uzaytirildi: ${oldDate} → ${newDate}`
          : `📅 ${timestamp} - Срок продлен: ${oldDate} → ${newDate}`;
      }

      case "closed":
        return language === "uz"
          ? `✅ ${timestamp} - Murojaat yopildi`
          : `✅ ${timestamp} - Обращение закрыто`;

      default:
        return `${timestamp} - ${log.action_type}`;
    }
  }

  /**
   * Send file to user based on file type
   */
  private async sendFileToUser(ctx: BotContext, file: FileMetadata) {
    try {
      const caption = file.file_name || undefined;

      switch (file.file_type) {
        case "photo":
          await ctx.replyWithPhoto(file.file_id, { caption });
          break;
        case "video":
          await ctx.replyWithVideo(file.file_id, { caption });
          break;
        case "audio":
          await ctx.replyWithAudio(file.file_id, { caption });
          break;
        case "voice":
          await ctx.replyWithVoice(file.file_id, { caption });
          break;
        case "document":
        default:
          await ctx.replyWithDocument(file.file_id, { caption });
          break;
      }
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
    }
  }

  /**
   * Handle approve answer action
   */
  async handleApproveAnswer(ctx: BotContext, answerId: number) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    try {
      const user = await this.userService.findByTelegramId(telegramId);
      if (!user) {
        BotErrorLogger.logError('User not found', ctx);
        await ctx.reply(this.i18nService.t("common.error", language));
        return;
      }

      // Approve the answer
      await this.appealService.approveAnswer(answerId, user.id);

      await ctx.reply(
        language === "uz"
          ? "✅ Javob qabul qilindi. Rahmat!\n\nMurojaat yopilgan bo'lib qoladi."
          : "✅ Ответ одобрен. Спасибо!\n\nОбращение останется закрытым.",
      );

      // Refresh appeal details to show updated status
      const details = await this.appealService.getAppealDetailsFromAnswerId(answerId);
      if (details) {
        await this.showAppealDetails(ctx, details.appeal.id);
      }
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Handle reject answer action
   */
  async handleRejectAnswer(ctx: BotContext, answerId: number) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    try {
      const user = await this.userService.findByTelegramId(telegramId);
      if (!user) {
        BotErrorLogger.logError('User not found', ctx);
        await ctx.reply(this.i18nService.t("common.error", language));
        return;
      }

      // Store answer ID in session for rejection reason input
      ctx.session.data.rejectionAnswerId = answerId;
      ctx.session.step = "reject_answer_reason";

      await ctx.reply(
        language === "uz"
          ? "❌ Javobni rad etish sababini yozing:\n\n(Bu moderatorga yuboriladi)"
          : "❌ Напишите причину отклонения ответа:\n\n(Это будет отправлено модератору)",
      );
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Handle rejection reason input
   */
  async handleRejectAnswerReason(ctx: BotContext, reason: string) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;
    const answerId = ctx.session.data.rejectionAnswerId;

    if (!answerId) {
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    try {
      const user = await this.userService.findByTelegramId(telegramId);
      if (!user) {
        BotErrorLogger.logError('User not found', ctx);
        await ctx.reply(this.i18nService.t("common.error", language));
        return;
      }

      // Reject the answer with reason and reopen the appeal
      const appealId = await this.appealService.rejectAnswer(answerId, user.id, reason.trim());

      // Clear session
      ctx.session.data.rejectionAnswerId = undefined;
      ctx.session.step = "main_menu";

      await ctx.reply(
        language === "uz"
          ? "❌ Javob rad etildi.\n\nMurojaat qayta ochildi va moderator xabardor qilindi."
          : "❌ Ответ отклонен.\n\nОбращение открыто заново, модератор уведомлен.",
      );

      // Notify moderators about rejection
      const details = await this.appealService.getAppealDetails(appealId);
      if (details) {
        await this.notificationService.notifyModeratorsAboutAnswerRejection(
          details.appeal,
          user,
          reason.trim(),
        );
      }
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }
}
