import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import {
  User,
  CreateUserDto,
  UserBusinessInfo,
  UserGovernmentInfo,
} from "../interfaces/user.interface";

@Injectable()
export class UserRepository {
  constructor(private databaseService: DatabaseService) {}

  get db() {
    return this.databaseService.knex;
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    const user = await this.db("users")
      .where("telegram_id", telegramId)
      .first();

    return user || null;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const [user] = await this.db("users").insert(dto).returning("*");
    return user;
  }

  async createBusinessInfo(data: UserBusinessInfo): Promise<void> {
    await this.db("user_business_info").insert(data);
  }

  async createGovernmentInfo(data: UserGovernmentInfo): Promise<void> {
    await this.db("user_government_info").insert(data);
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.db("users").where("id", id).first();
    return user || null;
  }

  async findByType(type: string): Promise<User[]> {
    return await this.db("users").where("type", type);
  }

  async findByDistrict(districtId: number): Promise<User[]> {
    return await this.db("users").where("district_id", districtId);
  }

  async findModeratorsByDistrict(districtId: number): Promise<User[]> {
    return await this.db("users")
      .whereIn("type", ["moderator", "admin"])
      .where("district_id", districtId);
  }
}
