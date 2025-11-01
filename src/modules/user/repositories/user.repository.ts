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

  async update(userId: number, dto: Partial<CreateUserDto>): Promise<User> {
    const [user] = await this.db("users")
      .where("id", userId)
      .update(dto)
      .returning("*");
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

  async getBusinessInfo(userId: number): Promise<UserBusinessInfo | null> {
    const info = await this.db("user_business_info")
      .where("user_id", userId)
      .first();
    return info || null;
  }

  async resetUserRole(userId: number): Promise<void> {
    // Use transaction to ensure all updates succeed or rollback
    await this.db.transaction(async (trx) => {
      // Clear type-specific fields in users table
      await trx("users")
        .where("id", userId)
        .update({
          type: null,
          birth_date: null, // Individual-specific field
          additional_phone: null, // Reset optional field
        });

      // Delete business info if exists (CASCADE will handle this automatically)
      await trx("user_business_info").where("user_id", userId).delete();

      // Delete government info if exists (CASCADE will handle this automatically)
      await trx("user_government_info").where("user_id", userId).delete();

      // Note: We keep the user record, appeals, and core fields like:
      // - telegram_id, full_name, phone, district_id, language
    });
  }
}
