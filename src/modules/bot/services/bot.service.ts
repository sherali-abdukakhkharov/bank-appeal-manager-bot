import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Bot, session } from "grammy";
import { hydrate } from "@grammyjs/hydrate";
import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { UserService } from "../../user/services/user.service";
import { DistrictService } from "../../district/services/district.service";
import { AppealService } from "../../appeal/services/appeal.service";
import { FileService } from "../../file/services/file.service";
import { RegistrationHandler } from "../handlers/registration.handler";
import { MenuHandler } from "../handlers/menu.handler";
import { AppealHandler } from "../handlers/appeal.handler";
import { ModeratorHandler } from "../handlers/moderator.handler";
import { BotErrorLogger } from "../../../common/utils/bot-error-logger.util";

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Bot<BotContext>;
  private registrationHandler: RegistrationHandler;
  private menuHandler: MenuHandler;
  private appealHandler: AppealHandler;
  private moderatorHandler: ModeratorHandler;

  constructor(
    private configService: ConfigService,
    private i18nService: I18nService,
    private userService: UserService,
    private districtService: DistrictService,
    private appealService: AppealService,
    private fileService: FileService,
  ) { }

  async onModuleInit() {
    const token = this.configService.get<string>("bot.token");

    if (!token) {
      console.error("Bot token is not configured");
      return;
    }

    this.bot = new Bot<BotContext>(token);

    // Setup hydration plugin
    this.bot.use(hydrate());

    // Setup session with in-memory storage
    this.bot.use(
      session({
        initial: () => ({
          step: null,
          data: {},
          language: "uz",
        }),
      }),
    );

    // Initialize handlers
    this.menuHandler = new MenuHandler(this.i18nService);
    this.registrationHandler = new RegistrationHandler(
      this.i18nService,
      this.userService,
      this.districtService,
      this.menuHandler,
    );
    this.appealHandler = new AppealHandler(
      this.i18nService,
      this.appealService,
      this.fileService,
      this.userService,
      this.menuHandler,
    );
    this.moderatorHandler = new ModeratorHandler(
      this.i18nService,
      this.appealService,
      this.userService,
      this.districtService,
      this.fileService,
    );

    // Register handlers
    this.registerHandlers();

    // Start bot with polling (long polling)
    await this.bot.start({
      onStart: (botInfo) => {
        console.log(
          `Bot @${botInfo.username} started successfully with polling`,
        );
      },
    });
  }

  private registerHandlers() {
    // ==================== COMMAND HANDLERS ====================

    this.bot.command("start", async (ctx) => {
      const result = await this.registrationHandler.handleStart(ctx);
      if (result.registered) {
        await this.menuHandler.showMainMenu(ctx, result.user);
      }
    });

    this.bot.command("cancel", async (ctx) => {
      ctx.session.step = null;
      ctx.session.data = {};
      await ctx.reply(
        this.i18nService.t("common.cancel", ctx.session.language),
      );
    });

    this.bot.command("menu", async (ctx) => {
      const telegramId = ctx.from!.id;
      const user = await this.userService.findByTelegramId(telegramId);
      if (user) {
        ctx.session.step = "main_menu";
        await this.menuHandler.showMainMenu(ctx, user);
      } else {
        await ctx.reply(
          "Iltimos, avval ro'yxatdan o'ting / Пожалуйста, сначала зарегистрируйтесь",
        );
      }
    });

    // Secret development command to switch roles (keeps appeals and core data)
    this.bot.command("reset_account", async (ctx) => {
      const telegramId = ctx.from!.id;

      try {
        const user = await this.userService.findByTelegramId(telegramId);

        if (user) {
          // Reset role but keep user data and appeals
          await this.userService.resetUserRole(user.id);

          // Clear session
          ctx.session.step = null;
          ctx.session.data = {};
          ctx.session.language = user.language || "uz";

          await ctx.reply(
            "✅ Role reset successful!\n\n" +
            "Your appeals and core data are preserved.\n" +
            "Use /start to select a new role.\n\n" +
            "✅ Роль успешно сброшена!\n\n" +
            "Ваши обращения и основные данные сохранены.\n" +
            "Используйте /start для выбора новой роли."
          );
        } else {
          await ctx.reply(
            "No account found. Use /start to register.\n\n" +
            "Аккаунт не найден. Используйте /start для регистрации."
          );
        }
      } catch (error) {
        console.error("Error resetting role:", error);
        await ctx.reply(
          "❌ Error resetting role. Please try again.\n\n" +
          "❌ Ошибка при сбросе роли. Попробуйте снова."
        );
      }
    });

    // ==================== CALLBACK QUERY HANDLERS ====================

    // Language selection
    this.bot.callbackQuery(/^lang_(uz|ru)$/, async (ctx) => {
      const lang = ctx.match[1] as "uz" | "ru";
      await this.registrationHandler.handleLanguageSelection(ctx, lang);
    });

    // User type selection
    this.bot.callbackQuery(
      /^type_(individual|business|government|moderator|admin)$/,
      async (ctx) => {
        const userType = ctx.match[1];
        await this.registrationHandler.handleUserTypeSelection(ctx, userType);
      },
    );

    // District selection (handles all user types)
    this.bot.callbackQuery(/^district_(\d+)$/, async (ctx) => {
      const districtId = parseInt(ctx.match[1]);
      const { step } = ctx.session;

      if (step === "individual_district") {
        await this.registrationHandler.handleDistrictSelection(ctx, districtId);
      } else if (step === "business_district") {
        await this.registrationHandler.handleBusinessDistrictSelection(
          ctx,
          districtId,
        );
      } else if (step === "business_bank_district") {
        await this.registrationHandler.handleBusinessBankDistrictSelection(
          ctx,
          districtId,
        );
      } else if (step === "government_district") {
        await this.registrationHandler.handleGovernmentDistrictSelection(
          ctx,
          districtId,
        );
      } else if (step === "moderator_district") {
        await this.registrationHandler.handleModeratorDistrictSelection(
          ctx,
          districtId,
        );
      }
    });

    // Government organization selection
    this.bot.callbackQuery(/^govorg_(\d+)$/, async (ctx) => {
      const orgId = parseInt(ctx.match[1]);
      await this.registrationHandler.handleGovOrgSelection(ctx, orgId);
    });

    // Skip button (for optional fields)
    this.bot.callbackQuery("skip", async (ctx) => {
      const { step } = ctx.session;

      if (step === "individual_additional_phone") {
        await this.registrationHandler.handleIndividualAdditionalPhone(
          ctx,
          "skip",
        );
      } else if (step === "business_additional_phone") {
        await this.registrationHandler.handleBusinessAdditionalPhone(
          ctx,
          "skip",
        );
      }
    });

    // Menu - Send Appeal
    this.bot.callbackQuery("menu_send_appeal", async (ctx) => {
      await this.appealHandler.startAppealCreation(ctx);
    });

    // Menu - My Appeals
    this.bot.callbackQuery("menu_my_appeals", async (ctx) => {
      await this.appealHandler.showMyAppeals(ctx);
    });

    // Appeal - Custom number choice
    this.bot.callbackQuery(/^custom_number_(yes|no)$/, async (ctx) => {
      const response = ctx.match[1] as "yes" | "no";
      await this.appealHandler.handleCustomNumberPrompt(ctx, response);
    });

    // Appeal - Submit
    this.bot.callbackQuery("submit_appeal", async (ctx) => {
      await this.appealHandler.submitAppeal(ctx);
    });

    // Appeal - Request approval
    this.bot.callbackQuery("request_approval", async (ctx) => {
      await this.appealHandler.requestApproval(ctx);
    });

    // Appeal - Cancel
    this.bot.callbackQuery("cancel", async (ctx) => {
      await ctx.answerCallbackQuery();
      ctx.session.step = "main_menu";
      ctx.session.data.appealText = undefined;
      ctx.session.data.appealFiles = [];
      ctx.session.data.appealCustomNumber = undefined;
      await ctx.editMessageText(
        this.i18nService.t("common.cancel", ctx.session.language),
      );
    });

    // Moderator - Review Appeals
    this.bot.callbackQuery("menu_review_appeals", async (ctx) => {
      await this.moderatorHandler.showReviewAppeals(ctx);
    });

    // Moderator - View Appeal Detail
    this.bot.callbackQuery(/^view_appeal_(\d+)$/, async (ctx) => {
      const appealId = parseInt(ctx.match[1]);
      await this.moderatorHandler.showAppealDetail(ctx, appealId);
    });

    // Moderator - Close Appeal
    this.bot.callbackQuery(/^close_appeal_(\d+)$/, async (ctx) => {
      const appealId = parseInt(ctx.match[1]);
      await this.moderatorHandler.startCloseAppeal(ctx, appealId);
    });

    // Moderator - Submit Close Appeal
    this.bot.callbackQuery("submit_close_appeal", async (ctx) => {
      await this.moderatorHandler.submitCloseAppeal(ctx);
    });

    // Moderator - Cancel Close Appeal
    this.bot.callbackQuery("cancel_close_appeal", async (ctx) => {
      await ctx.answerCallbackQuery();
      ctx.session.step = "main_menu";
      ctx.session.data.moderatorAppealId = undefined;
      ctx.session.data.moderatorAnswerText = undefined;
      ctx.session.data.moderatorAnswerFiles = [];
      await ctx.editMessageText(
        this.i18nService.t("common.cancel", ctx.session.language),
      );
    });

    // Moderator - Forward Appeal
    this.bot.callbackQuery(/^forward_appeal_(\d+)$/, async (ctx) => {
      const appealId = parseInt(ctx.match[1]);
      await this.moderatorHandler.startForwardAppeal(ctx, appealId);
    });

    // Moderator - Submit Forward Appeal
    this.bot.callbackQuery(/^forward_to_(\d+)_(\d+)$/, async (ctx) => {
      const appealId = parseInt(ctx.match[1]);
      const districtId = parseInt(ctx.match[2]);
      await this.moderatorHandler.submitForwardAppeal(ctx, appealId, districtId);
    });

    // Moderator - Extend Due Date
    this.bot.callbackQuery(/^extend_appeal_(\d+)$/, async (ctx) => {
      const appealId = parseInt(ctx.match[1]);
      await this.moderatorHandler.startExtendDueDate(ctx, appealId);
    });

    // ==================== CONTACT MESSAGE HANDLERS ====================

    this.bot.on("message:contact", async (ctx) => {
      const { step } = ctx.session;
      const phone = ctx.message.contact.phone_number;

      // Ensure phone starts with +
      const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

      // Route based on current step
      switch (step) {
        case "individual_phone":
          await this.registrationHandler.handleIndividualPhone(
            ctx,
            formattedPhone,
          );
          break;
        case "business_phone":
          await this.registrationHandler.handleBusinessPhone(
            ctx,
            formattedPhone,
          );
          break;
        case "government_phone":
          await this.registrationHandler.handleGovernmentPhone(
            ctx,
            formattedPhone,
          );
          break;
        case "moderator_phone":
          await this.registrationHandler.handleModeratorPhone(
            ctx,
            formattedPhone,
          );
          break;
        default:
          BotErrorLogger.logError('step not found on register', ctx);
          await ctx.reply(
            this.i18nService.t("common.error", ctx.session.language),
          );
      }
    });

    // ==================== TEXT MESSAGE HANDLERS ====================

    this.bot.on("message:text", async (ctx) => {
      const { step } = ctx.session;
      const text = ctx.message.text;

      // Handle menu button clicks first (regardless of step to handle sessions after restart)
      // User menu buttons
      if (text === "📝 Murojaat yuborish" || text === "📝 Отправить обращение") {
        ctx.session.step = "main_menu";
        await this.appealHandler.startAppealCreation(ctx);
        return;
      }
      if (text === "📋 Mening murojaatlarim" || text === "📋 Мои обращения") {
        ctx.session.step = "main_menu";
        await this.appealHandler.showMyAppeals(ctx);
        return;
      }

      // Moderator menu buttons
      if (text === "📝 Murojaatlarni ko'rib chiqish" || text === "📝 Рассмотреть обращения") {
        ctx.session.step = "main_menu";
        await this.moderatorHandler.showReviewAppeals(ctx);
        return;
      }
      if (text === "📊 Statistika" || text === "📊 Статистика") {
        ctx.session.step = "main_menu";
        // TODO: Implement statistics
        await ctx.reply("📊 Statistika tez orada ishga tushadi / Статистика скоро будет доступна");
        return;
      }

      // Admin menu buttons
      if (text === "📋 Barcha faol murojaatlar" || text === "📋 Все активные обращения") {
        ctx.session.step = "main_menu";
        // TODO: Implement admin view all appeals
        await ctx.reply("📋 Admin funksiyasi tez orada / Функция администратора скоро будет доступна");
        return;
      }
      if (text === "📝 Murojaatni ko'rib chiqish" || text === "📝 Рассмотреть обращение") {
        ctx.session.step = "main_menu";
        // TODO: Implement admin review appeal
        await ctx.reply("📝 Admin funksiyasi tez orada / Функция администратора скоро будет доступна");
        return;
      }

      // Route based on current step
      switch (step) {
        // Individual registration
        case "individual_full_name":
          await this.registrationHandler.handleIndividualFullName(ctx, text);
          break;
        case "individual_birth_date":
          await this.registrationHandler.handleIndividualBirthDate(ctx, text);
          break;
        case "individual_phone":
          await this.registrationHandler.handleIndividualPhone(ctx, text);
          break;
        case "individual_additional_phone":
          await this.registrationHandler.handleIndividualAdditionalPhone(
            ctx,
            text,
          );
          break;

        // Business registration
        case "business_full_name":
          await this.registrationHandler.handleBusinessFullName(ctx, text);
          break;
        case "business_phone":
          await this.registrationHandler.handleBusinessPhone(ctx, text);
          break;
        case "business_additional_phone":
          await this.registrationHandler.handleBusinessAdditionalPhone(
            ctx,
            text,
          );
          break;
        case "business_address":
          await this.registrationHandler.handleBusinessAddress(ctx, text);
          break;

        // Government registration
        case "government_full_name":
          await this.registrationHandler.handleGovernmentFullName(ctx, text);
          break;
        case "government_position":
          await this.registrationHandler.handleGovernmentPosition(ctx, text);
          break;
        case "government_phone":
          await this.registrationHandler.handleGovernmentPhone(ctx, text);
          break;

        // Moderator/Admin registration
        case "moderator_full_name":
          await this.registrationHandler.handleModeratorFullName(ctx, text);
          break;
        case "moderator_phone":
          await this.registrationHandler.handleModeratorPhone(ctx, text);
          break;
        case "moderator_mfo":
          await this.registrationHandler.handleModeratorMFO(ctx, text);
          break;

        // Appeal creation
        case "appeal_custom_number_input":
          await this.appealHandler.handleCustomNumberInput(ctx, text);
          break;
        case "appeal_text_input":
          // Check if user clicked submit button
          if (text === "✅ Yuborish" || text === "✅ Отправить") {
            await this.appealHandler.submitAppeal(ctx);
          } else {
            await this.appealHandler.handleAppealContent(ctx);
          }
          break;

        // Moderator actions
        case "moderator_close_appeal_text":
          await this.moderatorHandler.handleCloseAppealText(ctx, text);
          break;
        case "moderator_extend_due_date":
          await this.moderatorHandler.handleExtendDueDate(ctx, text);
          break;

        case "main_menu":
        case null:
        case undefined:
          // User is at main menu or session was reset - do nothing, they should use menu buttons
          break;

        default:
          // Unknown step - log for debugging
          BotErrorLogger.logError(`Unknown step: ${step}`, ctx);
          await ctx.reply(
            this.i18nService.t("common.error", ctx.session.language),
          );
      }
    });

    // ==================== FILE MESSAGE HANDLERS ====================

    // Handle document uploads during appeal creation and moderator answers
    this.bot.on("message:document", async (ctx) => {
      const { step } = ctx.session;
      if (step === "appeal_text_input") {
        await this.appealHandler.handleAppealContent(ctx);
      } else if (step === "moderator_close_appeal_files") {
        await this.moderatorHandler.handleCloseAppealFiles(ctx);
      }
    });

    // Handle photo uploads during appeal creation and moderator answers
    this.bot.on("message:photo", async (ctx) => {
      const { step } = ctx.session;
      if (step === "appeal_text_input") {
        await this.appealHandler.handleAppealContent(ctx);
      } else if (step === "moderator_close_appeal_files") {
        await this.moderatorHandler.handleCloseAppealFiles(ctx);
      }
    });

    // Handle video uploads during appeal creation and moderator answers
    this.bot.on("message:video", async (ctx) => {
      const { step } = ctx.session;
      if (step === "appeal_text_input") {
        await this.appealHandler.handleAppealContent(ctx);
      } else if (step === "moderator_close_appeal_files") {
        await this.moderatorHandler.handleCloseAppealFiles(ctx);
      }
    });

    // Handle audio uploads during appeal creation and moderator answers
    this.bot.on("message:audio", async (ctx) => {
      const { step } = ctx.session;
      if (step === "appeal_text_input") {
        await this.appealHandler.handleAppealContent(ctx);
      } else if (step === "moderator_close_appeal_files") {
        await this.moderatorHandler.handleCloseAppealFiles(ctx);
      }
    });

    // Handle voice uploads during appeal creation and moderator answers
    this.bot.on("message:voice", async (ctx) => {
      const { step } = ctx.session;
      if (step === "appeal_text_input") {
        await this.appealHandler.handleAppealContent(ctx);
      } else if (step === "moderator_close_appeal_files") {
        await this.moderatorHandler.handleCloseAppealFiles(ctx);
      }
    });

    // Error handler with comprehensive logging
    this.bot.catch((err) => {
      const errorContext = err.ctx as BotContext;
      BotErrorLogger.logError(err.error, errorContext);
    });
  }

  getBot(): Bot<BotContext> {
    return this.bot;
  }
}
