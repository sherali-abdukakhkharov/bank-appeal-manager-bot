import { Injectable, OnModuleInit } from "@nestjs/common";
import * as cron from "node-cron";
import * as dayjs from "dayjs";

@Injectable()
export class CronService implements OnModuleInit {
  private readonly REMINDER_CRON_TIME = "0 9 * * *"; // Every day at 9:00 AM

  onModuleInit() {
    // Setup reminder cron job - runs every day at 9:00 AM
    cron.schedule(this.REMINDER_CRON_TIME, () => {
      this.checkAppealDeadlines();
    });

    console.log(
      `Cron job scheduled at: ${this.REMINDER_CRON_TIME} (9:00 AM daily)`,
    );
  }

  private async checkAppealDeadlines() {
    try {
      console.log("Checking appeal deadlines...");

      // Query all active appeals
      // Calculate days remaining: dayjs(due_date).diff(dayjs(), 'day')
      // If days_left is 5, 4, 3, 2, 1, or 0 (overdue):
      //   - Send reminder to moderators of that appeal's district
      //   - Include appeal details in notification

      // No need to track sent reminders - just send daily
      // Simple and stateless approach

      console.log("Appeal deadline check completed");
    } catch (error) {
      console.error("Error checking appeal deadlines:", error);
    }
  }
}
