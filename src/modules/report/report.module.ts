import { Module } from "@nestjs/common";
import { ReportService } from "./services/report.service";
import { AppealModule } from "../appeal/appeal.module";
import { UserModule } from "../user/user.module";
import { DistrictModule } from "../district/district.module";

@Module({
  imports: [AppealModule, UserModule, DistrictModule],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
