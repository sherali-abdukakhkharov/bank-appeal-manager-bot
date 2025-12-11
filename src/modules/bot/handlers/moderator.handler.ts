import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { AppealService } from "../../appeal/services/appeal.service";
import { UserService } from "../../user/services/user.service";
import { DistrictService } from "../../district/services/district.service";
import { FileService } from "../../file/services/file.service";
import { NotificationService } from "../../notification/services/notification.service";
import { MenuHandler } from "./menu.handler";
import { InlineKeyboard, InputFile, Keyboard } from "grammy";
import { formatDate, formatDateTime, getDaysFromNow, getDateInTashkent, parseDate } from "../../../common/utils/date.util";
import { BotErrorLogger } from "../../../common/utils/bot-error-logger.util";
import * as ExcelJS from "exceljs";

export class ModeratorHandler {
  constructor(
    private i18nService: I18nService,
    private appealService: AppealService,
    private userService: UserService,
    private districtService: DistrictService,
    private fileService: FileService,
    private notificationService: NotificationService,
    private menuHandler: MenuHandler,
  ) { }

  /**
   * Show list of active appeals for moderator's district
   */
  async showReviewAppeals(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      BotErrorLogger.logError('User not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    // Ensure user is moderator or admin
    if (!["moderator", "admin"].includes(user.type || "")) {
      BotErrorLogger.logError('moderator or admin role not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    // Fetch active appeals for moderator's district, sorted by nearest deadline
    const appeals = await this.appealService.getAppealsByDistrictAndStatus(
      user.district_id!,
      ["new", 'in_progress', 'forwarded', 'reopened', 'overdue'],
    );

    if (appeals.length === 0) {
      await ctx.reply(
        language === "uz"
          ? "📋 Hozircha faol murojaatlar yo'q"
          : "📋 Пока нет активных обращений",
      );
      return;
    }

    // Format appeals list with buttons
    let message =
      language === "uz"
        ? `📋 *Faol murojaatlar (${appeals.length})*\n\n`
        : `📋 *Активные обращения (${appeals.length})*\n\n`;

    const keyboard = new InlineKeyboard();

    for (const appeal of appeals) {
      const daysLeft = getDaysFromNow(appeal.due_date);
      const urgencyEmoji = await this.getUrgencyEmoji(appeal);

      // Get user info
      const appealUser = await this.userService.findById(appeal.user_id);
      const userName = appealUser?.full_name || "Unknown";

      message += `${urgencyEmoji} *${appeal.appeal_number}*\n`;
      message += `   ${language === "uz" ? "Foydalanuvchi" : "Пользователь"}: ${userName}\n`;
      message += `   ${language === "uz" ? "Muddat" : "Срок"}: ${formatDate(appeal.due_date)} (${daysLeft} ${language === "uz" ? "kun" : "дней"})\n\n`;

      // Add button for this appeal
      keyboard
        .text(
          `${urgencyEmoji} ${appeal.appeal_number}`,
          `view_appeal_${appeal.id}`,
        )
        .row();
    }

    // Add back button
    keyboard.text(
      language === "uz" ? "◀️ Ortga" : "◀️ Назад",
      "menu_main",
    );

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  }

  /**
   * Show detailed view of a specific appeal for moderator
   */
  async showAppealDetail(ctx: BotContext, appealId: number) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      BotErrorLogger.logError('User not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    const details = await this.appealService.getAppealDetails(appealId);
    if (!details) {
      BotErrorLogger.logError('appeal details not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    const { appeal, answer, logs } = details;

    // Check if moderator has access to this appeal
    if (
      user.type === "moderator" &&
      appeal.district_id !== user.district_id
    ) {
      BotErrorLogger.logError('appeal not relate to this moderator', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    // Get appeal user info
    const appealUser = await this.userService.findById(appeal.user_id);

    // Format appeal details
    const daysLeft = getDaysFromNow(appeal.due_date);
    const urgencyEmoji = await this.getUrgencyEmoji(appeal);

    let message = language === "uz" ? "📄 *Murojaat tafsilotlari*\n\n" : "📄 *Детали обращения*\n\n";
    message += `*${language === "uz" ? "Raqam" : "Номер"}:* ${appeal.appeal_number}\n`;
    message += `*${language === "uz" ? "Holat" : "Статус"}:* ${this.i18nService.t(`appeal.list.status_${appeal.status}`, language)}\n`;
    message += `*${language === "uz" ? "Foydalanuvchi" : "Пользователь"}:* ${appealUser?.full_name}\n`;
    message += `*${language === "uz" ? "Telefon" : "Телефон"}:* ${appealUser?.phone}\n`;
    message += `*${language === "uz" ? "Yaratilgan" : "Создано"}:* ${formatDateTime(appeal.created_at)}\n`;
    message += `*${language === "uz" ? "Muddat" : "Срок"}:* ${urgencyEmoji} ${formatDate(appeal.due_date)} (${daysLeft} ${language === "uz" ? "kun" : "дней"})\n\n`;

    if (appeal.text) {
      message += `*${language === "uz" ? "Matn" : "Текст"}:*\n${appeal.text}\n\n`;
    }

    if (appeal.file_jsons && appeal.file_jsons.length > 0) {
      message += `*${language === "uz" ? "Fayllar" : "Файлы"}:* ${appeal.file_jsons.length} ${language === "uz" ? "ta" : "шт."}\n`;
    }

    // Show history if exists
    if (logs && logs.length > 0) {
      message += language === "uz" ? `\n📜 *Tarix*:\n\n` : `\n📜 *История*:\n\n`;

      for (const log of logs) {
        const logMessage = await this.formatLogEntry(log, language);
        message += `${logMessage}\n`;
      }
      message += `\n`;
    }

    // Create action buttons
    const keyboard = new InlineKeyboard()
      .text(
        language === "uz" ? "✅ Yopish" : "✅ Закрыть",
        `close_appeal_${appeal.id}`,
      )
      .row()
      .text(
        language === "uz" ? "➡️ Yo'naltirish" : "➡️ Переслать",
        `forward_appeal_${appeal.id}`,
      )
      .row()
      .text(
        language === "uz" ? "📅 Muddatni uzaytirish" : "📅 Продлить срок",
        `extend_appeal_${appeal.id}`,
      )
      .row()
      .text(
        language === "uz" ? "◀️ Ortga" : "◀️ Назад",
        "menu_review_appeals",
      );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });

    // Send appeal files if any
    if (appeal.file_jsons && appeal.file_jsons.length > 0) {
      for (const file of appeal.file_jsons) {
        try {
          const caption = file.file_name || undefined;

          switch (file.file_type) {
            case "photo":
              await ctx.api.sendPhoto(ctx.chat!.id, file.file_id, { caption });
              break;
            case "video":
              await ctx.api.sendVideo(ctx.chat!.id, file.file_id, { caption });
              break;
            case "video_note":
              await ctx.api.sendVideoNote(ctx.chat!.id, file.file_id);
              break;
            case "audio":
              await ctx.api.sendAudio(ctx.chat!.id, file.file_id, { caption });
              break;
            case "voice":
              await ctx.api.sendVoice(ctx.chat!.id, file.file_id, { caption });
              break;
            case "document":
            default:
              await ctx.api.sendDocument(ctx.chat!.id, file.file_id, { caption });
              break;
          }
        } catch (error) {
          BotErrorLogger.logError(error, ctx);
        }
      }
    }
  }

  /**
   * Start close appeal flow
   */
  async startCloseAppeal(ctx: BotContext, appealId: number) {
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    // Store appeal ID in session
    ctx.session.data.moderatorAppealId = appealId;
    ctx.session.step = "moderator_close_appeal_text";

    await ctx.editMessageText(
      language === "uz"
        ? "✍️ Iltimos, javob matnini yuboring:\n\n(Fayllar qo'shish uchun avval matnni yuboring)"
        : "✍️ Пожалуйста, отправьте текст ответа:\n\n(Чтобы добавить файлы, сначала отправьте текст)",
    );
  }

  /**
   * Handle close appeal text input
   */
  async handleCloseAppealText(ctx: BotContext, text: string) {
    const { language } = ctx.session;

    ctx.session.data.moderatorAnswerText = text;
    ctx.session.data.moderatorAnswerFiles = [];
    ctx.session.step = "moderator_close_appeal_files";

    const keyboard = new Keyboard()
      .text(language === "uz" ? "✅ Javobni yuborish" : "✅ Отправить ответ")
      .text(language === "uz" ? "❌ Bekor qilish" : "❌ Отменить")
      .resized()
      .persistent();

    await ctx.reply(
      language === "uz"
        ? "✅ Matn qabul qilindi.\n\nAgar kerak bo'lsa, fayllarni yuboring, keyin \"Javobni yuborish\" tugmasini bosing."
        : "✅ Текст принят.\n\nЕсли нужно, отправьте файлы, затем нажмите \"Отправить ответ\".",
      { reply_markup: keyboard },
    );
  }

  /**
   * Handle files during close appeal flow
   */
  async handleCloseAppealFiles(ctx: BotContext) {
    const { language } = ctx.session;

    const fileMetadata = this.fileService.extractFileMetadata(ctx.message);
    if (fileMetadata) {
      if (!ctx.session.data.moderatorAnswerFiles) {
        ctx.session.data.moderatorAnswerFiles = [];
      }
      ctx.session.data.moderatorAnswerFiles.push(fileMetadata);

      await ctx.reply(
        language === "uz"
          ? `✅ Fayl qabul qilindi (${ctx.session.data.moderatorAnswerFiles.length})`
          : `✅ Файл принят (${ctx.session.data.moderatorAnswerFiles.length})`,
      );
    }
  }

  /**
   * Submit close appeal with answer
   */
  async submitCloseAppeal(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language, data } = ctx.session;

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      BotErrorLogger.logError('User not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    const appealId = data.moderatorAppealId;
    if (!appealId) {
      BotErrorLogger.logError('closing appeal_id not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    try {
      // Close appeal with answer
      await this.appealService.closeAppeal(
        appealId,
        user.id,
        data.moderatorAnswerText!,
        data.moderatorAnswerFiles || [],
      );

      // Clear session data
      ctx.session.data.moderatorAppealId = undefined;
      ctx.session.data.moderatorAnswerText = undefined;
      ctx.session.data.moderatorAnswerFiles = [];
      ctx.session.step = "main_menu";

      await ctx.reply(
        language === "uz"
          ? "✅ Murojaat muvaffaqiyatli yopildi!\n\nFoydalanuvchiga javob yuborildi."
          : "✅ Обращение успешно закрыто!\n\nОтвет отправлен пользователю.",
        { reply_markup: { remove_keyboard: true } }
      );

      // Notify user about closed appeal with answer
      const appeal = await this.appealService.getAppealById(appealId);
      if (appeal) {
        const appealUser = await this.userService.findById(appeal.user_id);
        if (appealUser) {
          await this.notificationService.notifyUserAboutAppealClosure(
            appeal,
            appealUser,
            data.moderatorAnswerText,
            data.moderatorAnswerFiles,
          );
        }
      }

      // Show main menu
      await this.menuHandler.showMainMenu(ctx, user);
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Cancel close appeal flow
   */
  async cancelCloseAppeal(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      BotErrorLogger.logError('User not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    // Clear session data
    ctx.session.data.moderatorAppealId = undefined;
    ctx.session.data.moderatorAnswerText = undefined;
    ctx.session.data.moderatorAnswerFiles = [];
    ctx.session.step = "main_menu";

    await ctx.reply(
      language === "uz" ? "❌ Bekor qilindi." : "❌ Отменено.",
      { reply_markup: { remove_keyboard: true } }
    );

    // Show main menu
    await this.menuHandler.showMainMenu(ctx, user);
  }

  /**
   * Start forward appeal flow
   */
  async startForwardAppeal(ctx: BotContext, appealId: number) {
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    // Get all districts except current
    const appeal = await this.appealService.getAppealById(appealId);
    if (!appeal) {
      BotErrorLogger.logError('appeal not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    const districts = await this.districtService.getAllDistricts();

    // Create district keyboard
    const keyboard = new InlineKeyboard();
    for (const district of districts) {
      if (district.id !== appeal.district_id) {
        const name = language === "uz" ? district.name_uz : district.name_ru;
        keyboard.text(name, `forward_to_${appeal.id}_${district.id}`).row();
      }
    }

    keyboard.text(
      language === "uz" ? "❌ Bekor qilish" : "❌ Отменить",
      `view_appeal_${appeal.id}`,
    );

    await ctx.editMessageText(
      language === "uz"
        ? "📍 Qaysi tumanga yo'naltirmoqchisiz?"
        : "📍 В какой район переслать?",
      { reply_markup: keyboard },
    );
  }

  /**
   * Submit forward appeal
   */
  async submitForwardAppeal(
    ctx: BotContext,
    appealId: number,
    targetDistrictId: number,
  ) {
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
      // Get appeal before forwarding to capture old district
      const appealBeforeForward = await this.appealService.getAppealById(appealId);
      const oldDistrictId = appealBeforeForward?.district_id;

      await this.appealService.forwardAppeal(appealId, targetDistrictId, user.id);

      const district = await this.districtService.findDistrictById(targetDistrictId);
      const districtName = language === "uz" ? district?.name_uz : district?.name_ru;

      await ctx.editMessageText(
        language === "uz"
          ? `✅ Murojaat ${districtName} tumaniga yo'naltirildi.`
          : `✅ Обращение переслано в ${districtName}.`,
      );

      // Notify new district moderators
      const appeal = await this.appealService.getAppealById(appealId);
      if (appeal) {
        await this.notificationService.notifyModeratorsAboutForwarding(
          appeal,
          targetDistrictId,
          user,
          oldDistrictId,
        );

        // Notify user about forwarding
        const appealUser = await this.userService.findById(appeal.user_id);
        if (appealUser) {
          await this.notificationService.notifyUserAboutForwarding(
            appeal,
            appealUser,
            targetDistrictId,
          );
        }
      }
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Start extend due date flow
   */
  async startExtendDueDate(ctx: BotContext, appealId: number) {
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    ctx.session.data.moderatorAppealId = appealId;
    ctx.session.step = "moderator_extend_due_date";

    // Delete the message with buttons to avoid confusion
    try {
      await ctx.deleteMessage();
    } catch (error) {
      // If delete fails (message too old), just continue
      BotErrorLogger.logError(error, ctx);
    }

    // Send a new clear message asking for the new due date
    await ctx.reply(
      language === "uz"
        ? "📅 Yangi muddatni kiriting (format: DD.MM.YYYY):\n\nMasalan: 15.12.2025"
        : "📅 Введите новый срок (формат: DD.MM.YYYY):\n\nНапример: 15.12.2025",
    );
  }

  /**
   * Handle extend due date input
   */
  async handleExtendDueDate(ctx: BotContext, dateString: string) {
    const telegramId = ctx.from!.id;
    const { language, data } = ctx.session;

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user) {
      BotErrorLogger.logError('User not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    const appealId = data.moderatorAppealId;
    if (!appealId) {
      BotErrorLogger.logError('appeal id not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    // Validate date format
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(dateString)) {
      await ctx.reply(
        language === "uz"
          ? "❌ Noto'g'ri format. Iltimos, DD.MM.YYYY formatida kiriting."
          : "❌ Неверный формат. Пожалуйста, введите в формате DD.MM.YYYY.",
      );
      return;
    }

    const newDueDate = parseDate(dateString);
    if (!newDueDate.isValid()) {
      await ctx.reply(
        language === "uz"
          ? "❌ Noto'g'ri sana. Iltimos, qaytadan kiriting."
          : "❌ Неверная дата. Пожалуйста, введите снова.",
      );
      return;
    }

    // Check if new date is in the future
    if (newDueDate.isBefore(getDateInTashkent(), "day")) {
      await ctx.reply(
        language === "uz"
          ? "❌ Muddat kelajak sanada bo'lishi kerak."
          : "❌ Срок должен быть в будущем.",
      );
      return;
    }

    try {
      await this.appealService.extendDueDate(
        appealId,
        newDueDate.toDate(),
        user.id,
      );

      // Clear session
      ctx.session.data.moderatorAppealId = undefined;
      ctx.session.step = "main_menu";

      await ctx.reply(
        language === "uz"
          ? `✅ Muddat ${formatDate(newDueDate.toDate())} gacha uzaytirildi.`
          : `✅ Срок продлен до ${formatDate(newDueDate.toDate())}.`,
      );

      // Resend the appeal details with updated due date
      const appeal = await this.appealService.getAppealById(appealId);
      if (appeal) {
        // Get appeal user info
        const appealUser = await this.userService.findById(appeal.user_id);

        // Format appeal details
        const daysLeft = getDaysFromNow(appeal.due_date);
        const urgencyEmoji = await this.getUrgencyEmoji(appeal);

        let message = language === "uz" ? "📄 *Murojaat tafsilotlari*\n\n" : "📄 *Детали обращения*\n\n";
        message += `*${language === "uz" ? "Raqam" : "Номер"}:* ${appeal.appeal_number}\n`;
        message += `*${language === "uz" ? "Holat" : "Статус"}:* ${this.i18nService.t(`appeal.list.status_${appeal.status}`, language)}\n`;
        message += `*${language === "uz" ? "Foydalanuvchi" : "Пользователь"}:* ${appealUser?.full_name}\n`;
        message += `*${language === "uz" ? "Telefon" : "Телефон"}:* ${appealUser?.phone}\n`;
        message += `*${language === "uz" ? "Yaratilgan" : "Создано"}:* ${formatDateTime(appeal.created_at)}\n`;
        message += `*${language === "uz" ? "Muddat" : "Срок"}:* ${urgencyEmoji} ${formatDate(appeal.due_date)} (${daysLeft} ${language === "uz" ? "kun" : "дней"})\n\n`;

        if (appeal.text) {
          message += `*${language === "uz" ? "Matn" : "Текст"}:*\n${appeal.text}\n\n`;
        }

        if (appeal.file_jsons && appeal.file_jsons.length > 0) {
          message += `*${language === "uz" ? "Fayllar" : "Файлы"}:* ${appeal.file_jsons.length} ${language === "uz" ? "ta" : "шт."}\n`;
        }

        // Create action buttons
        const keyboard = new InlineKeyboard()
          .text(
            language === "uz" ? "✅ Yopish" : "✅ Закрыть",
            `close_appeal_${appeal.id}`,
          )
          .row()
          .text(
            language === "uz" ? "➡️ Yo'naltirish" : "➡️ Переслать",
            `forward_appeal_${appeal.id}`,
          )
          .row()
          .text(
            language === "uz" ? "📅 Muddatni uzaytirish" : "📅 Продлить срок",
            `extend_appeal_${appeal.id}`,
          )
          .row()
          .text(
            language === "uz" ? "◀️ Ortga" : "◀️ Назад",
            "menu_review_appeals",
          );

        await ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: "Markdown",
        });

        // Send appeal files if any
        if (appeal.file_jsons && appeal.file_jsons.length > 0) {
          for (const file of appeal.file_jsons) {
            try {
              const caption = file.file_name || undefined;

              switch (file.file_type) {
                case "photo":
                  await ctx.api.sendPhoto(ctx.chat!.id, file.file_id, { caption });
                  break;
                case "video":
                  await ctx.api.sendVideo(ctx.chat!.id, file.file_id, { caption });
                  break;
                case "video_note":
                  await ctx.api.sendVideoNote(ctx.chat!.id, file.file_id);
                  break;
                case "audio":
                  await ctx.api.sendAudio(ctx.chat!.id, file.file_id, { caption });
                  break;
                case "voice":
                  await ctx.api.sendVoice(ctx.chat!.id, file.file_id, { caption });
                  break;
                case "document":
                default:
                  await ctx.api.sendDocument(ctx.chat!.id, file.file_id, { caption });
                  break;
              }
            } catch (error) {
              BotErrorLogger.logError(error, ctx);
            }
          }
        }
      }

      // Notify user about extension
      const appealUser = await this.userService.findById(appeal.user_id);
      if (appealUser) {
        await this.notificationService.notifyUserAboutExtension(
          appeal,
          appealUser,
          newDueDate.toDate(),
        );
      }
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  // ==================== ADMIN-SPECIFIC FEATURES ====================

  /**
   * Show all active appeals with district filter (Admin only)
   */
  async showAllActiveAppeals(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user || user.type !== "admin") {
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    // Get all districts
    const districts = await this.districtService.getAllDistricts();

    const keyboard = new InlineKeyboard();

    // Add "All Districts" button
    keyboard
      .text(
        language === "uz" ? "🌐 Barcha tumanlar" : "🌐 Все районы",
        "admin_filter_all",
      )
      .row();

    // Add button for each district
    for (const district of districts) {
      const districtName = language === "uz" ? district.name_uz : district.name_ru;
      keyboard.text(`📍 ${districtName}`, `admin_filter_${district.id}`).row();
    }

    const message =
      language === "uz"
        ? "🔍 *Tumanni tanlang:*\n\nBarcha murojaatlarni ko'rish uchun \"Barcha tumanlar\" tugmasini bosing yoki ma'lum bir tumanni tanlang."
        : "🔍 *Выберите район:*\n\nНажмите \"Все районы\" для просмотра всех обращений или выберите конкретный район.";

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  }

  /**
   * Show appeals filtered by district (Admin only)
   */
  async showAppealsByDistrictFilter(
    ctx: BotContext,
    districtId: number | null,
  ) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user || user.type !== "admin") {
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    try {
      // Fetch appeals with optional district filter
      const appeals = await this.appealService.getAllAppeals(
        districtId || undefined,
        ["new", 'in_progress', 'forwarded', 'reopened', 'overdue'],
      );

      if (appeals.length === 0) {
        await ctx.editMessageText(
          language === "uz"
            ? "📋 Hozircha faol murojaatlar yo'q"
            : "📋 Пока нет активных обращений",
        );
        return;
      }

      // Get district name if filtering
      let districtName = language === "uz" ? "Barcha tumanlar" : "Все районы";
      if (districtId) {
        const district = await this.districtService.findDistrictById(districtId);
        districtName = language === "uz"
          ? district?.name_uz || "N/A"
          : district?.name_ru || "N/A";
      }

      // Format appeals list with buttons
      let message =
        language === "uz"
          ? `📋 *Faol murojaatlar (${appeals.length})*\n📍 *Tuman:* ${districtName}\n\n`
          : `📋 *Активные обращения (${appeals.length})*\n📍 *Район:* ${districtName}\n\n`;

      const keyboard = new InlineKeyboard();

      // Group appeals by district if showing all
      const appealsByDistrict = new Map<number, typeof appeals>();
      for (const appeal of appeals) {
        if (!appealsByDistrict.has(appeal.district_id)) {
          appealsByDistrict.set(appeal.district_id, []);
        }
        appealsByDistrict.get(appeal.district_id)!.push(appeal);
      }

      // Display appeals
      if (districtId) {
        // Single district view - show detailed list
        for (const appeal of appeals) {
          const daysLeft = getDaysFromNow(appeal.due_date);
          const urgencyEmoji = await this.getUrgencyEmoji(appeal);

          // Get user info
          const appealUser = await this.userService.findById(appeal.user_id);
          const userName = appealUser?.full_name || "Unknown";

          message += `${urgencyEmoji} *${appeal.appeal_number}*\n`;
          message += `   ${language === "uz" ? "Foydalanuvchi" : "Пользователь"}: ${userName}\n`;
          message += `   ${language === "uz" ? "Muddat" : "Срок"}: ${formatDate(appeal.due_date)} (${daysLeft} ${language === "uz" ? "kun" : "дней"})\n\n`;

          // Add button for this appeal
          keyboard
            .text(
              `${urgencyEmoji} ${appeal.appeal_number}`,
              `view_appeal_${appeal.id}`,
            )
            .row();
        }
      } else {
        // All districts view - group by district
        for (const [distId, distAppeals] of appealsByDistrict) {
          const district = await this.districtService.findDistrictById(distId);
          const distName =
            language === "uz"
              ? district?.name_uz || "N/A"
              : district?.name_ru || "N/A";

          message += `📍 *${distName}* (${distAppeals.length})\n`;

          for (const appeal of distAppeals.slice(0, 3)) {
            // Show first 3 per district
            const daysLeft = getDaysFromNow(appeal.due_date);
            const urgencyEmoji = await this.getUrgencyEmoji(appeal);
            message += `   ${urgencyEmoji} ${appeal.appeal_number} - ${formatDate(appeal.due_date)}\n`;

            // Add button
            keyboard
              .text(
                `${urgencyEmoji} ${appeal.appeal_number}`,
                `view_appeal_${appeal.id}`,
              )
              .row();
          }

          if (distAppeals.length > 3) {
            message += `   ${language === "uz" ? "va yana" : "и еще"} ${distAppeals.length - 3}...\n`;
          }
          message += `\n`;
        }
      }

      // Add back button
      keyboard.text(
        language === "uz" ? "⬅️ Filterni o'zgartirish" : "⬅️ Изменить фильтр",
        "admin_change_filter",
      );

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Show statistics (for moderators and admins)
   */
  async showStatistics(ctx: BotContext) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user || !["moderator", "admin"].includes(user.type || "")) {
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    try {
      // Get statistics (district-specific for moderators, all for admins)
      const districtId =
        user.type === "moderator" ? user.district_id : undefined;
      const stats = await this.appealService.getStatistics(districtId);

      let message =
        language === "uz"
          ? "📊 *Statistika*\n\n"
          : "📊 *Статистика*\n\n";

      // Show district name for moderators
      if (districtId) {
        const district = await this.districtService.findDistrictById(districtId);
        const districtName =
          language === "uz"
            ? district?.name_uz || "N/A"
            : district?.name_ru || "N/A";
        message += `📍 *${language === "uz" ? "Tuman" : "Район"}:* ${districtName}\n\n`;
      } else {
        message +=
          language === "uz"
            ? "📍 *Barcha tumanlar*\n\n"
            : "📍 *Все районы*\n\n";
      }

      message +=
        language === "uz"
          ? `📝 *Jami murojaatlar:* ${stats.total}\n\n`
          : `📝 *Всего обращений:* ${stats.total}\n\n`;

      // Show by status
      message += language === "uz" ? "*Holat bo'yicha:*\n" : "*По статусам:*\n";
      const statusLabels = {
        new: language === "uz" ? "Yangi" : "Новые",
        in_progress: language === "uz" ? "Ko'rib chiqilmoqda" : "В обработке",
        closed: language === "uz" ? "Yopilgan" : "Закрытые",
        forwarded: language === "uz" ? "Yo'naltirilgan" : "Перенаправленные",
        reopened: language === "uz" ? "Qayta ochilgan" : "Переоткрытые",
        overdue: language === "uz" ? "Muddati o'tgan" : "Просроченные",
      };

      Object.entries(statusLabels).forEach(([status, label]) => {
        const count = stats.byStatus[status] || 0;
        message += `   • ${label}: ${count}\n`;
      });

      message += `\n`;
      message +=
        language === "uz"
          ? `🔴 *Muddati o'tgan:* ${stats.overdue}\n`
          : `🔴 *Просроченные:* ${stats.overdue}\n`;
      message +=
        language === "uz"
          ? `⏱ *O'rtacha javob vaqti:* ${stats.avgResponseTime} kun\n`
          : `⏱ *Среднее время ответа:* ${stats.avgResponseTime} дней\n`;

      // Add export button
      const keyboard = new InlineKeyboard().text(
        language === "uz" ? "📥 Excel yuklab olish" : "📥 Скачать Excel",
        user.type === "moderator"
          ? `export_excel_${districtId}`
          : "export_excel_all",
      );

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Generate and send Excel report
   */
  async exportToExcel(ctx: BotContext, districtId?: number) {
    const telegramId = ctx.from!.id;
    const { language } = ctx.session;

    await ctx.answerCallbackQuery();

    const user = await this.userService.findByTelegramId(telegramId);
    if (!user || !["moderator", "admin"].includes(user.type || "")) {
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

    try {
      await ctx.reply(
        language === "uz"
          ? "📄 Excel fayli tayyorlanmoqda..."
          : "📄 Подготовка Excel файла...",
      );

      // Get data for export
      const appeals = await this.appealService.getAppealsForExport(districtId);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        language === "uz" ? "Murojaatlar" : "Обращения",
      );

      // Define columns
      worksheet.columns = [
        {
          header: language === "uz" ? "Raqam" : "Номер",
          key: "appeal_number",
          width: 15,
        },
        {
          header: language === "uz" ? "Holat" : "Статус",
          key: "status",
          width: 15,
        },
        {
          header: language === "uz" ? "Foydalanuvchi" : "Пользователь",
          key: "user_name",
          width: 25,
        },
        {
          header: language === "uz" ? "Telefon" : "Телефон",
          key: "user_phone",
          width: 15,
        },
        {
          header: language === "uz" ? "Foydalanuvchi turi" : "Тип пользователя",
          key: "user_type_display",
          width: 25,
        },
        {
          header: language === "uz" ? "Tuman" : "Район",
          key: "district_name",
          width: 20,
        },
        {
          header: language === "uz" ? "Murojaat matni" : "Текст обращения",
          key: "appeal_text",
          width: 40,
        },
        {
          header: language === "uz" ? "Yaratilgan" : "Создано",
          key: "created_at",
          width: 20,
        },
        {
          header: language === "uz" ? "Muddat" : "Срок",
          key: "due_date",
          width: 20,
        },
        {
          header: language === "uz" ? "Yopilgan" : "Закрыто",
          key: "closed_at",
          width: 20,
        },
        {
          header: language === "uz" ? "Javob" : "Ответ",
          key: "answer_text",
          width: 40,
        },
        {
          header: language === "uz" ? "Rad etish soni" : "Количество отклонений",
          key: "rejection_count",
          width: 18,
        },
      ];

      // Add rows
      appeals.forEach((appeal) => {
        // Format user type display
        let userTypeDisplay = "";
        if (appeal.user_type === "government") {
          // For government users, show the organization name
          // Check if custom org name exists (for "Boshqalar/Другие")
          if (appeal.custom_org_name) {
            userTypeDisplay = appeal.custom_org_name;
          } else {
            userTypeDisplay =
              language === "uz"
                ? appeal.gov_org_name_uz || "Davlat muassasasi"
                : appeal.gov_org_name_ru || "Государственное учреждение";
          }
        } else if (appeal.user_type === "individual") {
          userTypeDisplay =
            language === "uz" ? "Jismoniy shaxs" : "Физическое лицо";
        } else if (appeal.user_type === "business") {
          userTypeDisplay =
            language === "uz" ? "Yuridik shaxs" : "Юридическое лицо";
        } else if (appeal.user_type === "moderator") {
          userTypeDisplay = language === "uz" ? "Moderator" : "Модератор";
        } else if (appeal.user_type === "admin") {
          userTypeDisplay = language === "uz" ? "Admin" : "Администратор";
        }

        worksheet.addRow({
          appeal_number: appeal.appeal_number,
          status: this.i18nService.t(
            `appeal.list.status_${appeal.status}`,
            language,
          ),
          user_name: appeal.user_name,
          user_phone: appeal.user_phone,
          user_type_display: userTypeDisplay,
          district_name: appeal.district_name,
          appeal_text: appeal.appeal_text || "",
          created_at: appeal.created_at
            ? formatDateTime(appeal.created_at)
            : "",
          due_date: appeal.due_date ? formatDate(appeal.due_date) : "",
          closed_at: appeal.closed_at ? formatDateTime(appeal.closed_at) : "",
          answer_text: appeal.answer_text || "",
          rejection_count: appeal.rejection_count || 0,
        });
      });

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Generate filename with timestamp
      const timestamp = getDateInTashkent().format("YYYY-MM-DD_HH-mm");
      const filename = `appeals_${timestamp}.xlsx`;

      // Send file
      await ctx.replyWithDocument(new InputFile(new Uint8Array(buffer), filename), {
        caption:
          language === "uz"
            ? `📊 Jami ${appeals.length} ta murojaat`
            : `📊 Всего ${appeals.length} обращений`,
      });
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }

  /**
   * Get urgency emoji based on appeal status and extension history
   * Priority order:
   * 1. overdue → 🔴 Red
   * 2. closed → 🟢 Green
   * 3. forwarded → 🔵 Blue (always)
   * 4. new/in_progress/reopened + extended → 🔵 Blue
   * 5. new/in_progress/reopened + NOT extended → 🟡 Yellow
   */
  private async getUrgencyEmoji(appeal: any): Promise<string> {
    // 1. Overdue status - highest priority
    if (appeal.status === "overdue") {
      return "🔴";
    }

    // 2. Closed status
    if (appeal.status === "closed") {
      return "🟢";
    }

    // 3. Forwarded status - always blue
    if (appeal.status === "forwarded") {
      return "🔵";
    }

    // 4. Check if appeal was extended (for new, in_progress, reopened)
    const wasExtended = await this.appealService.wasAppealExtended(appeal.id);

    if (wasExtended) {
      return "🔵"; // Extended appeals are blue
    }

    // 5. Default for new/in_progress/reopened without extension
    return "🟡"; // Yellow for standard active appeals
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

      case "reopened":
        return language === "uz"
          ? `🔄 ${timestamp} - Murojaat qayta ochildi`
          : `🔄 ${timestamp} - Обращение переоткрыто`;

      default:
        return `${timestamp} - ${log.action_type}`;
    }
  }
}
