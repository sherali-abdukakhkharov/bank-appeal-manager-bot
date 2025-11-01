import { Injectable, Logger } from "@nestjs/common";
import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../../../common/types/bot.types";
import { I18nService } from "../../i18n/services/i18n.service";
import { UserService } from "../../user/services/user.service";
import { DistrictService } from "../../district/services/district.service";
import { User } from "../../user/interfaces/user.interface";
import { Appeal } from "../../appeal/interfaces/appeal.interface";
import { formatDate, formatDateTime, getDateInTashkent } from "../../../common/utils/date.util";
import { FileMetadata } from "../../../common/types/file.types";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private bot: Bot<BotContext> | null = null;

  constructor(
    private i18nService: I18nService,
    private userService: UserService,
    private districtService: DistrictService,
  ) {}

  /**
   * Set the bot instance (called from BotService after bot is initialized)
   */
  setBotInstance(bot: Bot<BotContext>) {
    this.bot = bot;
    this.logger.log("Bot instance set in NotificationService");
  }

  /**
   * Notify all moderators of a district about a new appeal
   */
  async notifyModeratorsAboutNewAppeal(
    appeal: Appeal,
    user: User,
  ): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Bot instance not set, cannot send notifications");
      return;
    }

    try {
      // Get all moderators and admins for the target district
      const moderators = await this.userService.getModeratorsByDistrict(
        appeal.district_id,
      );

      const district = await this.districtService.findDistrictById(
        appeal.district_id,
      );

      for (const moderator of moderators) {
        try {
          const message =
            moderator.language === "uz"
              ? `🔔 *Yangi murojaat*\n\n` +
                `📝 Raqam: ${appeal.appeal_number}\n` +
                `👤 Foydalanuvchi: ${user.full_name}\n` +
                `📞 Telefon: ${user.phone}\n` +
                `📍 Tuman: ${district?.name_uz || "N/A"}\n` +
                `📅 Muddat: ${formatDate(appeal.due_date)}\n` +
                `🕒 Yaratilgan: ${formatDateTime(appeal.created_at)}\n\n` +
                `Murojaat matnini ko'rish uchun "Murojaatlarni ko'rib chiqish" bo'limiga o'ting.`
              : `🔔 *Новое обращение*\n\n` +
                `📝 Номер: ${appeal.appeal_number}\n` +
                `👤 Пользователь: ${user.full_name}\n` +
                `📞 Телефон: ${user.phone}\n` +
                `📍 Район: ${district?.name_ru || "N/A"}\n` +
                `📅 Срок: ${formatDate(appeal.due_date)}\n` +
                `🕒 Создано: ${formatDateTime(appeal.created_at)}\n\n` +
                `Для просмотра текста обращения перейдите в раздел "Рассмотреть обращения".`;

          await this.bot.api.sendMessage(moderator.telegram_id, message, {
            parse_mode: "Markdown",
          });

          this.logger.log(
            `Notification sent to moderator ${moderator.id} about appeal ${appeal.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send notification to moderator ${moderator.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error("Error notifying moderators about new appeal:", error);
    }
  }

  /**
   * Notify user that their appeal has been closed
   */
  async notifyUserAboutAppealClosure(
    appeal: Appeal,
    user: User,
    answerText?: string,
    answerFiles?: FileMetadata[],
  ): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Bot instance not set, cannot send notifications");
      return;
    }

    try {
      const message =
        user.language === "uz"
          ? `✅ *Murojaat yopildi*\n\n` +
            `📝 Raqam: ${appeal.appeal_number}\n` +
            `🕒 Yopilgan vaqt: ${formatDateTime(getDateInTashkent().toDate())}\n\n` +
            (answerText ? `💬 *Javob:*\n${answerText}` : "")
          : `✅ *Обращение закрыто*\n\n` +
            `📝 Номер: ${appeal.appeal_number}\n` +
            `🕒 Время закрытия: ${formatDateTime(getDateInTashkent().toDate())}\n\n` +
            (answerText ? `💬 *Ответ:*\n${answerText}` : "");

      await this.bot.api.sendMessage(user.telegram_id, message, {
        parse_mode: "Markdown",
      });

      // Send answer files if any
      if (answerFiles && answerFiles.length > 0) {
        for (const file of answerFiles) {
          try {
            const caption = file.file_name || undefined;

            switch (file.file_type) {
              case "photo":
                await this.bot.api.sendPhoto(user.telegram_id, file.file_id, {
                  caption,
                });
                break;
              case "video":
                await this.bot.api.sendVideo(user.telegram_id, file.file_id, {
                  caption,
                });
                break;
              case "audio":
                await this.bot.api.sendAudio(user.telegram_id, file.file_id, {
                  caption,
                });
                break;
              case "voice":
                await this.bot.api.sendVoice(user.telegram_id, file.file_id, {
                  caption,
                });
                break;
              case "document":
              default:
                await this.bot.api.sendDocument(
                  user.telegram_id,
                  file.file_id,
                  { caption },
                );
                break;
            }
          } catch (error) {
            this.logger.error(`Failed to send answer file to user:`, error);
          }
        }
      }

      this.logger.log(
        `Notification sent to user ${user.id} about closure of appeal ${appeal.id}`,
      );
    } catch (error) {
      this.logger.error("Error notifying user about appeal closure:", error);
    }
  }

  /**
   * Notify moderators about appeal forwarding
   */
  async notifyModeratorsAboutForwarding(
    appeal: Appeal,
    targetDistrictId: number,
    user: User,
  ): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Bot instance not set, cannot send notifications");
      return;
    }

    try {
      const moderators = await this.userService.getModeratorsByDistrict(
        targetDistrictId,
      );
      const district = await this.districtService.findDistrictById(
        targetDistrictId,
      );

      for (const moderator of moderators) {
        try {
          const message =
            moderator.language === "uz"
              ? `🔄 *Yo'naltirilgan murojaat*\n\n` +
                `📝 Raqam: ${appeal.appeal_number}\n` +
                `👤 Foydalanuvchi: ${user.full_name}\n` +
                `📞 Telefon: ${user.phone}\n` +
                `📍 Yangi tuman: ${district?.name_uz || "N/A"}\n` +
                `📅 Muddat: ${formatDate(appeal.due_date)}\n\n` +
                `Murojaat sizning tumangizga yo'naltirildi.`
              : `🔄 *Перенаправленное обращение*\n\n` +
                `📝 Номер: ${appeal.appeal_number}\n` +
                `👤 Пользователь: ${user.full_name}\n` +
                `📞 Телефон: ${user.phone}\n` +
                `📍 Новый район: ${district?.name_ru || "N/A"}\n` +
                `📅 Срок: ${formatDate(appeal.due_date)}\n\n` +
                `Обращение перенаправлено в ваш район.`;

          await this.bot.api.sendMessage(moderator.telegram_id, message, {
            parse_mode: "Markdown",
          });

          this.logger.log(
            `Notification sent to moderator ${moderator.id} about forwarded appeal ${appeal.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send notification to moderator ${moderator.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        "Error notifying moderators about forwarding:",
        error,
      );
    }
  }

  /**
   * Notify user about appeal forwarding
   */
  async notifyUserAboutForwarding(
    appeal: Appeal,
    user: User,
    targetDistrictId: number,
  ): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Bot instance not set, cannot send notifications");
      return;
    }

    try {
      const district = await this.districtService.findDistrictById(
        targetDistrictId,
      );

      const message =
        user.language === "uz"
          ? `🔄 *Murojaat yo'naltirildi*\n\n` +
            `📝 Raqam: ${appeal.appeal_number}\n` +
            `📍 Yangi tuman: ${district?.name_uz || "N/A"}\n` +
            `📅 Muddat: ${formatDate(appeal.due_date)}\n\n` +
            `Sizning murojaatingiz boshqa tumanga yo'naltirildi. Ko'rib chiqish jarayoni davom etmoqda.`
          : `🔄 *Обращение перенаправлено*\n\n` +
            `📝 Номер: ${appeal.appeal_number}\n` +
            `📍 Новый район: ${district?.name_ru || "N/A"}\n` +
            `📅 Срок: ${formatDate(appeal.due_date)}\n\n` +
            `Ваше обращение перенаправлено в другой район. Рассмотрение продолжается.`;

      await this.bot.api.sendMessage(user.telegram_id, message, {
        parse_mode: "Markdown",
      });

      this.logger.log(
        `Notification sent to user ${user.id} about forwarding of appeal ${appeal.id}`,
      );
    } catch (error) {
      this.logger.error("Error notifying user about forwarding:", error);
    }
  }

  /**
   * Notify user about due date extension
   */
  async notifyUserAboutExtension(
    appeal: Appeal,
    user: User,
    newDueDate: Date,
  ): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Bot instance not set, cannot send notifications");
      return;
    }

    try {
      const message =
        user.language === "uz"
          ? `📅 *Muddat uzaytirildi*\n\n` +
            `📝 Raqam: ${appeal.appeal_number}\n` +
            `📅 Yangi muddat: ${formatDate(newDueDate)}\n\n` +
            `Sizning murojaatingiz ko'rib chiqish muddati uzaytirildi.`
          : `📅 *Срок продлен*\n\n` +
            `📝 Номер: ${appeal.appeal_number}\n` +
            `📅 Новый срок: ${formatDate(newDueDate)}\n\n` +
            `Срок рассмотрения вашего обращения продлен.`;

      await this.bot.api.sendMessage(user.telegram_id, message, {
        parse_mode: "Markdown",
      });

      this.logger.log(
        `Notification sent to user ${user.id} about extension of appeal ${appeal.id}`,
      );
    } catch (error) {
      this.logger.error("Error notifying user about extension:", error);
    }
  }

  /**
   * Notify moderators about approval request for multiple appeals
   */
  async notifyModeratorsAboutApprovalRequest(
    user: User,
    districtId: number,
    requestId: number,
  ): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Bot instance not set, cannot send notifications");
      return;
    }

    try {
      const moderators = await this.userService.getModeratorsByDistrict(
        districtId,
      );

      for (const moderator of moderators) {
        try {
          const message =
            moderator.language === "uz"
              ? `🔔 *Yangi ruxsat so'rovi*\n\n` +
                `👤 Foydalanuvchi: ${user.full_name}\n` +
                `📞 Telefon: ${user.phone}\n\n` +
                `Foydalanuvchi yangi murojaat yuborish uchun ruxsat so'ramoqda (faol murojaat mavjud).`
              : `🔔 *Новый запрос на разрешение*\n\n` +
                `👤 Пользователь: ${user.full_name}\n` +
                `📞 Телефон: ${user.phone}\n\n` +
                `Пользователь запрашивает разрешение на отправку нового обращения (есть активное обращение).`;

          // Create inline keyboard with Approve/Reject buttons
          const keyboard = new InlineKeyboard()
            .text(
              moderator.language === "uz" ? "✅ Ruxsat berish" : "✅ Одобрить",
              `approve_request_${requestId}`,
            )
            .text(
              moderator.language === "uz" ? "❌ Rad etish" : "❌ Отклонить",
              `reject_request_${requestId}`,
            );

          await this.bot.api.sendMessage(moderator.telegram_id, message, {
            parse_mode: "Markdown",
            reply_markup: keyboard,
          });

          this.logger.log(
            `Notification sent to moderator ${moderator.id} about approval request ${requestId} from user ${user.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send notification to moderator ${moderator.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        "Error notifying moderators about approval request:",
        error,
      );
    }
  }

  /**
   * Notify user about approval decision
   */
  async notifyUserAboutApprovalDecision(
    user: User,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Bot instance not set, cannot send notifications");
      return;
    }

    try {
      const message = approved
        ? user.language === "uz"
          ? `✅ *Ruxsat berildi*\n\nYangi murojaat yuborish uchun ruxsat berildi. Endi "Murojaat yuborish" tugmasini bosishingiz mumkin.`
          : `✅ *Разрешение одобрено*\n\nВам разрешено отправить новое обращение. Теперь вы можете нажать кнопку "Отправить обращение".`
        : user.language === "uz"
          ? `❌ *Ruxsat rad etildi*\n\n${reason ? `Sabab: ${reason}\n\n` : ""}Yangi murojaat yuborish uchun ruxsat berilmadi. Iltimos, faol murojaatingiz yopilgunga qadar kuting.`
          : `❌ *Запрос отклонен*\n\n${reason ? `Причина: ${reason}\n\n` : ""}Вам не разрешено отправить новое обращение. Пожалуйста, дождитесь закрытия вашего активного обращения.`;

      await this.bot.api.sendMessage(user.telegram_id, message, {
        parse_mode: "Markdown",
      });

      this.logger.log(
        `Notification sent to user ${user.id} about approval decision: ${approved ? "approved" : "rejected"}`,
      );
    } catch (error) {
      this.logger.error("Error notifying user about approval decision:", error);
    }
  }
}
