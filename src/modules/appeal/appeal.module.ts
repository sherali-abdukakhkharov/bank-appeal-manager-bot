import { Module } from "@nestjs/common";
import { AppealService } from "./services/appeal.service";
import { AppealRepository } from "./repositories/appeal.repository";
import { FileModule } from "../file/file.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [FileModule, UserModule],
  providers: [AppealService, AppealRepository],
  exports: [AppealService],
})
export class AppealModule {}
