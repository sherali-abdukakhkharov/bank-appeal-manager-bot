import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import * as cron from "node-cron";
import { AppealService } from "../../appeal/services/appeal.service";
import { UserService } from "../../user/services/user.service";
import { BotService } from "../../bot/services/bot.service";
import { formatDate, getDateInTashkent } from "../../../common/utils/date.util";

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);
  private readonly REMINDER_CRON_TIME = "0 9 * * *"; // Every day at 9:00 AM

  constructor(
    private appealService: AppealService,
    private userService: UserService,
    private botService: BotService,
  ) {}

  onModuleInit() {
    // Setup reminder cron job - runs every day at 9:00 AM
    cron.schedule(this.REMINDER_CRON_TIME, () => {
      this.checkAppealDeadlines();
    });

    this.logger.log(
      `Cron job scheduled at: ${this.REMINDER_CRON_TIME} (9:00 AM daily)`,
    );
  }

  private async checkAppealDeadlines() {
    try {
      this.logger.log("Checking appeal deadlines...");

      // First, mark appeals as overdue if their due date has passed
      const overdueCount = await this.appealService.markAppealsAsOverdue();
      this.logger.log(`Marked ${overdueCount} appeals as overdue`);

      // Query only appeals that need reminders (5 days or less, including overdue)
      const appealsNeedingReminders = await this.appealService.getAppealsNeedingReminders();

      this.logger.log(`Found ${appealsNeedingReminders.length} appeals needing reminders`);

      const bot = this.botService.getBot();
      if (!bot) {
        this.logger.warn("Bot instance not available, skipping reminders");
        return;
      }

      let remindersCount = 0;

      for (const appeal of appealsNeedingReminders) {
        // Calculate days remaining using Tashkent timezone
        const daysLeft = getDateInTashkent(appeal.due_date).diff(
          getDateInTashkent(),
          "day",
        );

        if (daysLeft < 0) {
          // Overdue - send critical notification
          await this.sendOverdueNotification(appeal, Math.abs(daysLeft));
          remindersCount++;
        } else {
          // 5 days or less remaining - send reminder
          await this.sendReminderToModerators(appeal, daysLeft);
          remindersCount++;
        }
      }

      this.logger.log(
        `Appeal deadline check completed. Sent ${remindersCount} reminders.`,
      );
    } catch (error) {
      this.logger.error("Error checking appeal deadlines:", error);
    }
  }

  private async sendReminderToModerators(appeal: any, daysLeft: number) {
    try {
      // Get moderators for this appeal's district
      const moderators = await this.userService.getModeratorsByDistrict(
        appeal.district_id,
      );

      // Get appeal creator info
      const user = await this.userService.findById(appeal.user_id);
      if (!user) return;

      const bot = this.botService.getBot();

      for (const moderator of moderators) {
        try {
          const urgencyEmoji = await this.getUrgencyEmojiForReminder(appeal);

          const message =
            moderator.language === "uz"
              ? `${urgencyEmoji} *Muddat eslatmasi*\n\n` +
                `📝 Murojaat: ${appeal.appeal_number}\n` +
                `👤 Foydalanuvchi: ${user.full_name}\n` +
                `📞 Telefon: ${user.phone}\n` +
                `📅 Muddat: ${formatDate(appeal.due_date)}\n` +
                `⏰ Qolgan kunlar: ${daysLeft} ${daysLeft === 1 ? "kun" : "kun"}\n\n` +
                `Iltimos, murojaatni ko'rib chiqing va javob bering.`
              : `${urgencyEmoji} *Напоминание о сроке*\n\n` +
                `📝 Обращение: ${appeal.appeal_number}\n` +
                `👤 Пользователь: ${user.full_name}\n` +
                `📞 Телефон: ${user.phone}\n` +
                `📅 Срок: ${formatDate(appeal.due_date)}\n` +
                `⏰ Осталось дней: ${daysLeft} ${daysLeft === 1 ? "день" : daysLeft <= 4 ? "дня" : "дней"}\n\n` +
                `Пожалуйста, рассмотрите обращение и дайте ответ.`;

          await bot.api.sendMessage(moderator.telegram_id, message, {
            parse_mode: "Markdown",
          });
        } catch (error) {
          this.logger.error(
            `Failed to send reminder to moderator ${moderator.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error("Error sending reminder to moderators:", error);
    }
  }

  private async sendOverdueNotification(appeal: any, daysOverdue: number) {
    try {
      // Get moderators for this appeal's district
      const moderators = await this.userService.getModeratorsByDistrict(
        appeal.district_id,
      );

      // Get appeal creator info
      const user = await this.userService.findById(appeal.user_id);
      if (!user) return;

      const bot = this.botService.getBot();

      for (const moderator of moderators) {
        try {
          const message =
            moderator.language === "uz"
              ? `🔴 *DIQQAT: Muddat o'tgan!*\n\n` +
                `📝 Murojaat: ${appeal.appeal_number}\n` +
                `👤 Foydalanuvchi: ${user.full_name}\n` +
                `📞 Telefon: ${user.phone}\n` +
                `📅 Muddat: ${formatDate(appeal.due_date)}\n` +
                `⏰ Muddatdan o'tgan: ${daysOverdue} kun\n\n` +
                `Iltimos, zudlik bilan murojaatni ko'rib chiqing!`
              : `🔴 *ВНИМАНИЕ: Срок истек!*\n\n` +
                `📝 Обращение: ${appeal.appeal_number}\n` +
                `👤 Пользователь: ${user.full_name}\n` +
                `📞 Телефон: ${user.phone}\n` +
                `📅 Срок: ${formatDate(appeal.due_date)}\n` +
                `⏰ Просрочено на: ${daysOverdue} ${daysOverdue === 1 ? "день" : daysOverdue <= 4 ? "дня" : "дней"}\n\n` +
                `Пожалуйста, срочно рассмотрите обращение!`;

          await bot.api.sendMessage(moderator.telegram_id, message, {
            parse_mode: "Markdown",
          });
        } catch (error) {
          this.logger.error(
            `Failed to send overdue notification to moderator ${moderator.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error("Error sending overdue notification:", error);
    }
  }

  /**
   * Get urgency emoji based on appeal status and extension history
   * Priority order for reminders:
   * 1. overdue → 🔴 Red
   * 2. forwarded → 🔵 Blue (always)
   * 3. new/in_progress/reopened + extended → 🔵 Blue
   * 4. new/in_progress/reopened + NOT extended → 🟡 Yellow
   */
  private async getUrgencyEmojiForReminder(appeal: any): Promise<string> {
    // 1. Overdue status - highest priority
    if (appeal.status === "overdue") {
      return "🔴";
    }

    // 2. Forwarded status - always blue
    if (appeal.status === "forwarded") {
      return "🔵";
    }

    // 3. Check if appeal was extended (for new, in_progress, reopened)
    const wasExtended = await this.appealService.wasAppealExtended(appeal.id);

    if (wasExtended) {
      return "🔵"; // Extended appeals are blue
    }

    // 4. Default for new/in_progress/reopened without extension
    return "🟡"; // Yellow for standard active appeals
  }
}
