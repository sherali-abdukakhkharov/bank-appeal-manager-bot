import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";

@Injectable()
export class AppealRepository {
  constructor(private databaseService: DatabaseService) {}

  get db() {
    return this.databaseService.knex;
  }

  // Appeal repository methods will be implemented here
}
