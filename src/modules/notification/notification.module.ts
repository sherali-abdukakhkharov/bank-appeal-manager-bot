import { Module } from "@nestjs/common";
import { NotificationService } from "./services/notification.service";
import { UserModule } from "../user/user.module";
import { I18nModule } from "../i18n/i18n.module";
import { DistrictModule } from "../district/district.module";

@Module({
  imports: [UserModule, I18nModule, DistrictModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
