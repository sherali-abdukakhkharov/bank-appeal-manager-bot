import { Module } from "@nestjs/common";
import { BotService } from "./services/bot.service";
import { UserModule } from "../user/user.module";
import { DistrictModule } from "../district/district.module";
import { AppealModule } from "../appeal/appeal.module";
import { I18nModule } from "../i18n/i18n.module";
import { FileModule } from "../file/file.module";

@Module({
  imports: [UserModule, DistrictModule, AppealModule, I18nModule, FileModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
