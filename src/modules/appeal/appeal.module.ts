import { Module } from "@nestjs/common";
import { AppealService } from "./services/appeal.service";
import { AppealRepository } from "./repositories/appeal.repository";
import { FileModule } from "../file/file.module";

@Module({
  imports: [FileModule],
  providers: [AppealService, AppealRepository],
  exports: [AppealService],
})
export class AppealModule {}
