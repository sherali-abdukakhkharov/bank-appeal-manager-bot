import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { BotModule } from "./modules/bot/bot.module";
import { UserModule } from "./modules/user/user.module";
import { DistrictModule } from "./modules/district/district.module";
import { AppealModule } from "./modules/appeal/appeal.module";
import { ReportModule } from "./modules/report/report.module";
import { CronModule } from "./modules/cron/cron.module";
import { FileModule } from "./modules/file/file.module";
import { I18nModule } from "./modules/i18n/i18n.module";
import { NotificationModule } from "./modules/notification/notification.module";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    BotModule,
    UserModule,
    DistrictModule,
    AppealModule,
    ReportModule,
    CronModule,
    FileModule,
    I18nModule,
    NotificationModule,
  ],
})
export class AppModule {}
