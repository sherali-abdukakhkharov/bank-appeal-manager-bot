import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Bot, session } from "grammy";
import { hydrate } from "@grammyjs/hydrate";
import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { UserService } from "../../user/services/user.service";
import { DistrictService } from "../../district/services/district.service";
import { RegistrationHandler } from "../handlers/registration.handler";
import { MenuHandler } from "../handlers/menu.handler";

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Bot<BotContext>;
  private registrationHandler: RegistrationHandler;
  private menuHandler: MenuHandler;

  constructor(
    private configService: ConfigService,
    private i18nService: I18nService,
    private userService: UserService,
    private districtService: DistrictService,
  ) {}

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
          await ctx.reply(
            this.i18nService.t("common.error", ctx.session.language),
          );
      }
    });

    // ==================== TEXT MESSAGE HANDLERS ====================

    this.bot.on("message:text", async (ctx) => {
      const { step } = ctx.session;
      const text = ctx.message.text;

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

        default:
          // No active registration step
          await ctx.reply(
            this.i18nService.t("common.error", ctx.session.language),
          );
      }
    });

    // Error handler
    this.bot.catch((err) => {
      console.error("Bot error:", err);
    });
  }

  getBot(): Bot<BotContext> {
    return this.bot;
  }
}
