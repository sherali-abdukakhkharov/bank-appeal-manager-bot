import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import { Appeal, CreateAppealDto, AppealApprovalRequest } from "../interfaces/appeal.interface";

@Injectable()
export class AppealRepository {
  constructor(private databaseService: DatabaseService) {}

  get db() {
    return this.databaseService.knex;
  }

  /**
   * Create a new appeal
   */
  async create(dto: CreateAppealDto, appealNumber: string, dueDate: Date): Promise<Appeal> {
    const [appeal] = await this.db("appeals")
      .insert({
        appeal_number: appealNumber,
        user_id: dto.user_id,
        district_id: dto.district_id,
        text: dto.text,
        file_jsons: dto.file_jsons ? JSON.stringify(dto.file_jsons) : null,
        status: "new",
        due_date: dueDate,
      })
      .returning("*");

    if (appeal.file_jsons) {
      appeal.file_jsons = JSON.parse(appeal.file_jsons);
    }

    return appeal;
  }

  /**
   * Find appeal by ID
   */
  async findById(id: number): Promise<Appeal | null> {
    const appeal = await this.db("appeals").where("id", id).first();

    if (!appeal) return null;

    if (appeal.file_jsons) {
      appeal.file_jsons = JSON.parse(appeal.file_jsons);
    }

    return appeal;
  }

  /**
   * Find appeal by appeal number
   */
  async findByNumber(appealNumber: string): Promise<Appeal | null> {
    const appeal = await this.db("appeals").where("appeal_number", appealNumber).first();

    if (!appeal) return null;

    if (appeal.file_jsons) {
      appeal.file_jsons = JSON.parse(appeal.file_jsons);
    }

    return appeal;
  }

  /**
   * Find all appeals by user ID
   */
  async findByUserId(userId: number): Promise<Appeal[]> {
    const appeals = await this.db("appeals")
      .where("user_id", userId)
      .orderBy("created_at", "desc");

    return appeals.map(appeal => {
      if (appeal.file_jsons) {
        appeal.file_jsons = JSON.parse(appeal.file_jsons);
      }
      return appeal;
    });
  }

  /**
   * Find active appeal by user ID (user can only have one active appeal)
   */
  async findActiveByUserId(userId: number): Promise<Appeal | null> {
    const appeal = await this.db("appeals")
      .where("user_id", userId)
      .whereIn("status", ["new", "in_progress", "forwarded"])
      .first();

    if (!appeal) return null;

    if (appeal.file_jsons) {
      appeal.file_jsons = JSON.parse(appeal.file_jsons);
    }

    return appeal;
  }

  /**
   * Get next appeal number for the year
   */
  async getNextAppealNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${year}-`;

    const lastAppeal = await this.db("appeals")
      .where("appeal_number", "like", `${prefix}%`)
      .orderBy("appeal_number", "desc")
      .first();

    if (!lastAppeal) {
      return `${prefix}000001`;
    }

    const lastNumber = parseInt(lastAppeal.appeal_number.split("-")[1]);
    const nextNumber = (lastNumber + 1).toString().padStart(6, "0");
    return `${prefix}${nextNumber}`;
  }

  /**
   * Create approval request for multiple appeals
   */
  async createApprovalRequest(userId: number): Promise<AppealApprovalRequest> {
    const [request] = await this.db("appeal_approval_requests")
      .insert({
        user_id: userId,
        status: "pending",
      })
      .returning("*");

    return request;
  }

  /**
   * Find pending approval request by user ID
   */
  async findPendingApprovalRequest(userId: number): Promise<AppealApprovalRequest | null> {
    return await this.db("appeal_approval_requests")
      .where("user_id", userId)
      .where("status", "pending")
      .first();
  }

  /**
   * Find appeals by district
   */
  async findByDistrict(districtId: number, status?: string): Promise<Appeal[]> {
    const query = this.db("appeals").where("district_id", districtId);

    if (status) {
      query.where("status", status);
    }

    const appeals = await query.orderBy("due_date", "asc");

    return appeals.map(appeal => {
      if (appeal.file_jsons) {
        appeal.file_jsons = JSON.parse(appeal.file_jsons);
      }
      return appeal;
    });
  }
}
