import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { UserService } from "../../user/services/user.service";
import { DistrictService } from "../../district/services/district.service";
import { User } from "../../user/interfaces/user.interface";
import {
  createLanguageKeyboard,
  createUserTypeKeyboard,
  createSkipKeyboard,
  createDistrictKeyboard,
  createGovOrgKeyboard,
  createPhoneRequestKeyboard,
  removeKeyboard,
} from "../../../common/utils/keyboard.utils";
import {
  validatePhone,
  validateBirthDate,
  validateFullName,
  validatePosition,
  validateAddress,
  validateMFOFormat,
  convertDateForDatabase,
} from "../../../common/utils/validation.utils";
import { MenuHandler } from "./menu.handler";

export class RegistrationHandler {
  constructor(
    private i18nService: I18nService,
    private userService: UserService,
    private districtService: DistrictService,
    private menuHandler: MenuHandler,
  ) {}

  /**
   * Handle /start command
   */
  async handleStart(ctx: BotContext) {
    const telegramId = ctx.from!.id;

    // Check if user is already registered
    const existingUser = await this.userService.findByTelegramId(telegramId);

    if (existingUser) {
      // User already registered - set language and return menu flag
      ctx.session.language = existingUser.language;
      ctx.session.step = "main_menu";
      return { registered: true, user: existingUser };
    }

    // New user - start registration with language selection
    ctx.session.step = "language_selection";
    ctx.session.language = "uz"; // Default

    const keyboard = createLanguageKeyboard();

    await ctx.reply(
      "Xush kelibsiz! / Добро пожаловать!\n\n" +
        "Iltimos, tilni tanlang / Пожалуйста, выберите язык:",
      { reply_markup: keyboard },
    );

    return { registered: false };
  }

  /**
   * Handle language selection callback
   */
  async handleLanguageSelection(ctx: BotContext, language: "uz" | "ru") {
    ctx.session.language = language;
    ctx.session.step = "user_type_selection";

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      this.i18nService.t("registration.select_type", language),
      { reply_markup: createUserTypeKeyboard(language) },
    );
  }

  /**
   * Handle user type selection callback
   */
  async handleUserTypeSelection(ctx: BotContext, userType: string) {
    const { language } = ctx.session;
    ctx.session.data.userType = userType as any;

    await ctx.answerCallbackQuery();

    // Route to appropriate registration flow
    switch (userType) {
      case "individual":
        await this.startIndividualRegistration(ctx);
        break;
      case "business":
        await this.startBusinessRegistration(ctx);
        break;
      case "government":
        await this.startGovernmentRegistration(ctx);
        break;
      case "moderator":
      case "admin":
        await this.startModeratorRegistration(ctx);
        break;
    }
  }

  /**
   * Start Individual registration
   */
  private async startIndividualRegistration(ctx: BotContext) {
    const { language } = ctx.session;
    ctx.session.step = "individual_full_name";

    await ctx.editMessageText(
      this.i18nService.t("registration.enter_full_name", language),
    );
  }

  /**
   * Handle Individual full name
   */
  async handleIndividualFullName(ctx: BotContext, text: string) {
    const { language } = ctx.session;
    const validation = validateFullName(text);

    if (!validation.valid) {
      await ctx.reply(validation.error!);
      return;
    }

    ctx.session.data.fullName = text;
    ctx.session.step = "individual_birth_date";

    await ctx.reply(
      this.i18nService.t("registration.enter_birth_date", language),
    );
  }

  /**
   * Handle Individual birth date
   */
  async handleIndividualBirthDate(ctx: BotContext, text: string) {
    const { language } = ctx.session;
    const validation = validateBirthDate(text);

    if (!validation.valid) {
      await ctx.reply(
        this.i18nService.t("registration.invalid_date", language),
      );
      return;
    }

    ctx.session.data.birthDate = text;
    ctx.session.step = "individual_phone";

    await ctx.reply(this.i18nService.t("registration.enter_phone", language), {
      reply_markup: createPhoneRequestKeyboard(language),
    });
  }

  /**
   * Handle Individual phone
   */
  async handleIndividualPhone(ctx: BotContext, phone: string) {
    const { language } = ctx.session;
    const validation = validatePhone(phone);

    if (!validation.valid) {
      await ctx.reply(
        this.i18nService.t("registration.invalid_phone", language),
      );
      return;
    }

    ctx.session.data.phone = phone;
    ctx.session.step = "individual_additional_phone";

    await ctx.reply(
      this.i18nService.t("registration.enter_additional_phone", language),
      {
        reply_markup: {
          ...removeKeyboard(),
          inline_keyboard: createSkipKeyboard(language).inline_keyboard,
        },
      },
    );
  }

  /**
   * Handle Individual additional phone
   */
  async handleIndividualAdditionalPhone(ctx: BotContext, text: string) {
    const { language } = ctx.session;

    if (text !== "skip") {
      const validation = validatePhone(text);
      if (!validation.valid) {
        await ctx.reply(
          this.i18nService.t("registration.invalid_phone", language),
        );
        return;
      }
      ctx.session.data.additionalPhone = text;
    }

    ctx.session.step = "individual_district";

    // Fetch districts and show keyboard
    const districts = await this.districtService.getAllDistricts();
    const keyboard = createDistrictKeyboard(districts, language);

    await ctx.reply(
      this.i18nService.t("registration.select_district", language),
      { reply_markup: keyboard },
    );
  }

  /**
   * Handle district selection
   */
  async handleDistrictSelection(ctx: BotContext, districtId: number) {
    const { language } = ctx.session;
    ctx.session.data.districtId = districtId;

    await ctx.answerCallbackQuery();

    // Save user to database
    const user = await this.saveUser(ctx);

    await ctx.editMessageText(
      this.i18nService.t("registration.completed", language),
    );

    // Show main menu
    if (user) {
      await this.menuHandler.showMainMenu(ctx, user);
    }
  }

  // ==================== BUSINESS REGISTRATION ====================

  /**
   * Start Business registration
   */
  private async startBusinessRegistration(ctx: BotContext) {
    const { language } = ctx.session;
    ctx.session.step = "business_full_name";

    await ctx.editMessageText(
      this.i18nService.t("registration.enter_full_name", language),
    );
  }

  async handleBusinessFullName(ctx: BotContext, text: string) {
    const { language } = ctx.session;
    const validation = validateFullName(text);

    if (!validation.valid) {
      await ctx.reply(validation.error!);
      return;
    }

    ctx.session.data.fullName = text;
    ctx.session.step = "business_phone";

    await ctx.reply(this.i18nService.t("registration.enter_phone", language), {
      reply_markup: createPhoneRequestKeyboard(language),
    });
  }

  async handleBusinessPhone(ctx: BotContext, phone: string) {
    const { language } = ctx.session;
    const validation = validatePhone(phone);

    if (!validation.valid) {
      await ctx.reply(
        this.i18nService.t("registration.invalid_phone", language),
      );
      return;
    }

    ctx.session.data.phone = phone;
    ctx.session.step = "business_additional_phone";

    await ctx.reply(
      this.i18nService.t("registration.enter_additional_phone", language),
      {
        reply_markup: {
          ...removeKeyboard(),
          inline_keyboard: createSkipKeyboard(language).inline_keyboard,
        },
      },
    );
  }

  async handleBusinessAdditionalPhone(ctx: BotContext, text: string) {
    const { language } = ctx.session;

    if (text !== "skip") {
      const validation = validatePhone(text);
      if (!validation.valid) {
        await ctx.reply(
          this.i18nService.t("registration.invalid_phone", language),
        );
        return;
      }
      ctx.session.data.additionalPhone = text;
    }

    ctx.session.step = "business_district";

    const districts = await this.districtService.getAllDistricts();
    const keyboard = createDistrictKeyboard(districts, language);

    await ctx.reply(
      this.i18nService.t("registration.select_district", language),
      { reply_markup: keyboard },
    );
  }

  async handleBusinessDistrictSelection(ctx: BotContext, districtId: number) {
    const { language } = ctx.session;
    ctx.session.data.districtId = districtId;
    ctx.session.step = "business_address";

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      this.i18nService.t("registration.enter_address", language),
    );
  }

  async handleBusinessAddress(ctx: BotContext, text: string) {
    const { language } = ctx.session;
    const validation = validateAddress(text);

    if (!validation.valid) {
      await ctx.reply(validation.error!);
      return;
    }

    ctx.session.data.organizationAddress = text;
    ctx.session.step = "business_bank_district";

    const districts = await this.districtService.getAllDistricts();
    const keyboard = createDistrictKeyboard(districts, language);

    await ctx.reply(
      this.i18nService.t("registration.select_bank_district", language),
      { reply_markup: keyboard },
    );
  }

  async handleBusinessBankDistrictSelection(
    ctx: BotContext,
    districtId: number,
  ) {
    const { language } = ctx.session;
    ctx.session.data.bankAccountDistrictId = districtId;

    await ctx.answerCallbackQuery();

    // Save business user to database
    const user = await this.saveUser(ctx);

    await ctx.editMessageText(
      this.i18nService.t("registration.completed", language),
    );

    // Show main menu
    if (user) {
      await this.menuHandler.showMainMenu(ctx, user);
    }
  }

  // ==================== GOVERNMENT REGISTRATION ====================

  /**
   * Start Government registration
   */
  private async startGovernmentRegistration(ctx: BotContext) {
    const { language } = ctx.session;
    ctx.session.step = "government_organization";

    // Fetch government organizations and show keyboard
    const organizations =
      await this.districtService.getAllGovernmentOrganizations();
    const keyboard = createGovOrgKeyboard(organizations, language);

    await ctx.editMessageText(
      this.i18nService.t("registration.select_organization", language),
      { reply_markup: keyboard },
    );
  }

  async handleGovOrgSelection(ctx: BotContext, orgId: number) {
    const { language } = ctx.session;
    ctx.session.data.governmentOrgId = orgId;
    ctx.session.step = "government_full_name";

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      this.i18nService.t("registration.enter_full_name", language),
    );
  }

  async handleGovernmentFullName(ctx: BotContext, text: string) {
    const { language } = ctx.session;
    const validation = validateFullName(text);

    if (!validation.valid) {
      await ctx.reply(validation.error!);
      return;
    }

    ctx.session.data.fullName = text;
    ctx.session.step = "government_position";

    await ctx.reply(
      this.i18nService.t("registration.enter_position", language),
    );
  }

  async handleGovernmentPosition(ctx: BotContext, text: string) {
    const { language } = ctx.session;
    const validation = validatePosition(text);

    if (!validation.valid) {
      await ctx.reply(validation.error!);
      return;
    }

    ctx.session.data.position = text;
    ctx.session.step = "government_phone";

    await ctx.reply(this.i18nService.t("registration.enter_phone", language), {
      reply_markup: createPhoneRequestKeyboard(language),
    });
  }

  async handleGovernmentPhone(ctx: BotContext, phone: string) {
    const { language } = ctx.session;
    const validation = validatePhone(phone);

    if (!validation.valid) {
      await ctx.reply(
        this.i18nService.t("registration.invalid_phone", language),
      );
      return;
    }

    ctx.session.data.phone = phone;

    // Save government user to database
    const user = await this.saveUser(ctx);

    await ctx.reply(this.i18nService.t("registration.completed", language), {
      reply_markup: removeKeyboard(),
    });

    // Show main menu
    if (user) {
      await this.menuHandler.showMainMenu(ctx, user);
    }
  }

  // ==================== MODERATOR/ADMIN REGISTRATION ====================

  /**
   * Start Moderator/Admin registration
   */
  private async startModeratorRegistration(ctx: BotContext) {
    const { language } = ctx.session;
    ctx.session.step = "moderator_full_name";

    await ctx.editMessageText(
      this.i18nService.t("registration.enter_full_name", language),
    );
  }

  async handleModeratorFullName(ctx: BotContext, text: string) {
    const { language } = ctx.session;
    const validation = validateFullName(text);

    if (!validation.valid) {
      await ctx.reply(validation.error!);
      return;
    }

    ctx.session.data.fullName = text;
    ctx.session.step = "moderator_phone";

    await ctx.reply(this.i18nService.t("registration.enter_phone", language), {
      reply_markup: createPhoneRequestKeyboard(language),
    });
  }

  async handleModeratorPhone(ctx: BotContext, phone: string) {
    const { language } = ctx.session;
    const validation = validatePhone(phone);

    if (!validation.valid) {
      await ctx.reply(
        this.i18nService.t("registration.invalid_phone", language),
      );
      return;
    }

    ctx.session.data.phone = phone;
    ctx.session.step = "moderator_district";

    const districts = await this.districtService.getAllDistricts();
    const keyboard = createDistrictKeyboard(districts, language);

    await ctx.reply(
      this.i18nService.t("registration.select_district", language),
      {
        reply_markup: {
          ...removeKeyboard(),
          inline_keyboard: keyboard.inline_keyboard,
        },
      },
    );
  }

  async handleModeratorDistrictSelection(ctx: BotContext, districtId: number) {
    const { language } = ctx.session;
    ctx.session.data.districtId = districtId;
    ctx.session.step = "moderator_mfo";

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      this.i18nService.t("registration.enter_mfo", language),
    );
  }

  async handleModeratorMFO(ctx: BotContext, text: string) {
    const { language } = ctx.session;
    const validation = validateMFOFormat(text);

    if (!validation.valid) {
      await ctx.reply(validation.error!);
      return;
    }

    // Validate MFO against database
    const isValid = await this.districtService.validateMFO(
      text,
      ctx.session.data.districtId!,
    );

    if (!isValid) {
      await ctx.reply(this.i18nService.t("registration.invalid_mfo", language));
      return;
    }

    ctx.session.data.mfoCode = text;

    // Save moderator/admin user to database
    const user = await this.saveUser(ctx);

    await ctx.reply(this.i18nService.t("registration.completed", language));

    // Show main menu
    if (user) {
      await this.menuHandler.showMainMenu(ctx, user);
    }
  }

  /**
   * Save user to database
   */
  private async saveUser(ctx: BotContext): Promise<User | null> {
    const { data, language } = ctx.session;
    const telegramId = ctx.from!.id;

    const userDto = {
      telegram_id: telegramId,
      type: data.userType!,
      full_name: data.fullName!,
      phone: data.phone!,
      additional_phone: data.additionalPhone,
      birth_date: data.birthDate
        ? convertDateForDatabase(data.birthDate)
        : undefined,
      district_id: data.districtId,
      language,
    };

    try {
      let user: User;

      if (data.userType === "business") {
        // Create business user with business info
        user = await this.userService.createBusinessUser(userDto, {
          organization_address: data.organizationAddress!,
          bank_account_district_id: data.bankAccountDistrictId!,
        });
      } else if (data.userType === "government") {
        // Create government user with government info
        user = await this.userService.createGovernmentUser(userDto, {
          government_org_id: data.governmentOrgId!,
          position: data.position!,
        });
      } else {
        // Create individual, moderator, or admin user
        user = await this.userService.createUser(userDto);
      }

      console.log("User registered successfully:", user.id);

      // Clear session data after successful registration
      ctx.session.data = {};
      ctx.session.step = "registration_complete";

      return user;
    } catch (error) {
      console.error("Error saving user:", error);
      await ctx.reply(this.i18nService.t("common.error", language));
      return null;
    }
  }
}
