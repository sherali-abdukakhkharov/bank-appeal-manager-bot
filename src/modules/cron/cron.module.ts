import { Module } from "@nestjs/common";
import { CronService } from "./services/cron.service";
import { AppealModule } from "../appeal/appeal.module";
import { UserModule } from "../user/user.module";
import { BotModule } from "../bot/bot.module";

@Module({
  imports: [AppealModule, UserModule, BotModule],
  providers: [CronService],
})
export class CronModule {}
