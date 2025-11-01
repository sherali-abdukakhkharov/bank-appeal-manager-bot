import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { AppealService } from "../../appeal/services/appeal.service";
import { UserService } from "../../user/services/user.service";
import { DistrictService } from "../../district/services/district.service";
import { FileService } from "../../file/services/file.service";
import { InlineKeyboard } from "grammy";
import { formatDate, formatDateTime, getDaysFromNow, getDateInTashkent, parseDate } from "../../../common/utils/date.util";
import { BotErrorLogger } from "../../../common/utils/bot-error-logger.util";

export class ModeratorHandler {
  constructor(
    private i18nService: I18nService,
    private appealService: AppealService,
    private userService: UserService,
    private districtService: DistrictService,
    private fileService: FileService,
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
      "new",
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
      const urgencyEmoji = daysLeft <= 2 ? "🔴" : daysLeft <= 5 ? "🟡" : "🟢";

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

    const appeal = await this.appealService.getAppealById(appealId);
    if (!appeal) {
      BotErrorLogger.logError('appeal not found', ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
      return;
    }

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
    const urgencyEmoji = daysLeft <= 2 ? "🔴" : daysLeft <= 5 ? "🟡" : "🟢";

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

    const keyboard = new InlineKeyboard()
      .text(
        language === "uz" ? "✅ Javobni yuborish" : "✅ Отправить ответ",
        "submit_close_appeal",
      )
      .row()
      .text(language === "uz" ? "❌ Bekor qilish" : "❌ Отменить", "cancel_close_appeal");

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

    await ctx.answerCallbackQuery();

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

      await ctx.editMessageText(
        language === "uz"
          ? "✅ Murojaat muvaffaqiyatli yopildi!\n\nFoydalanuvchiga javob yuborildi."
          : "✅ Обращение успешно закрыто!\n\nОтвет отправлен пользователю.",
      );

      // TODO: Notify user about closed appeal with answer
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
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
      await this.appealService.forwardAppeal(appealId, targetDistrictId, user.id);

      const district = await this.districtService.findDistrictById(targetDistrictId);
      const districtName = language === "uz" ? district?.name_uz : district?.name_ru;

      await ctx.editMessageText(
        language === "uz"
          ? `✅ Murojaat ${districtName} tumaniga yo'naltirildi.`
          : `✅ Обращение переслано в ${districtName}.`,
      );

      // TODO: Notify new district moderators
      // TODO: Notify user about forwarding
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
        const urgencyEmoji = daysLeft <= 2 ? "🔴" : daysLeft <= 5 ? "🟡" : "🟢";

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

      // TODO: Notify user about extension
    } catch (error) {
      BotErrorLogger.logError(error, ctx);
      await ctx.reply(this.i18nService.t("common.error", language));
    }
  }
}
