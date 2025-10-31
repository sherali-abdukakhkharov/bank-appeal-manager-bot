import { Injectable } from "@nestjs/common";
import { AppealRepository } from "../repositories/appeal.repository";

@Injectable()
export class AppealService {
  constructor(private appealRepository: AppealRepository) {}

  // Appeal service methods will be implemented here
}
