import { Module } from "@nestjs/common";
import { DistrictService } from "./services/district.service";
import { DistrictRepository } from "./repositories/district.repository";

@Module({
  providers: [DistrictService, DistrictRepository],
  exports: [DistrictService],
})
export class DistrictModule {}
