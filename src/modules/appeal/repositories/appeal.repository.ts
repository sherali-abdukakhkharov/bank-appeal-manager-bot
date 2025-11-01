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
        file_jsons: dto.file_jsons && dto.file_jsons.length > 0 ? dto.file_jsons : null,
        status: "new",
        due_date: dueDate,
      })
      .returning("*");

    // Knex automatically handles JSONB serialization, no need to parse
    return appeal;
  }

  /**
   * Find appeal by ID
   */
  async findById(id: number): Promise<Appeal | null> {
    const appeal = await this.db("appeals").where("id", id).first();
    return appeal || null;
  }

  /**
   * Find appeal by appeal number
   */
  async findByNumber(appealNumber: string): Promise<Appeal | null> {
    const appeal = await this.db("appeals").where("appeal_number", appealNumber).first();
    return appeal || null;
  }

  /**
   * Find all appeals by user ID
   */
  async findByUserId(userId: number): Promise<Appeal[]> {
    return await this.db("appeals")
      .where("user_id", userId)
      .orderBy("created_at", "desc");
  }

  /**
   * Find active appeal by user ID (user can only have one active appeal)
   */
  async findActiveByUserId(userId: number): Promise<Appeal | null> {
    const appeal = await this.db("appeals")
      .where("user_id", userId)
      .whereIn("status", ["new", "in_progress", "forwarded"])
      .first();

    return appeal || null;
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

    return await query.orderBy("due_date", "asc");
  }

  /**
   * Find appeals by district and status, sorted by due date
   */
  async findByDistrictAndStatus(
    districtId: number,
    status: string,
  ): Promise<Appeal[]> {
    return await this.db("appeals")
      .where("district_id", districtId)
      .where("status", status)
      .orderBy("due_date", "asc");
  }

  /**
   * Close appeal with moderator answer
   */
  async closeAppeal(
    appealId: number,
    moderatorId: number,
    answerText: string,
    answerFiles: any[],
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Update appeal status
      await trx("appeals")
        .where("id", appealId)
        .update({
          status: "closed",
          closed_by_moderator_id: moderatorId,
          closed_at: new Date(),
          updated_at: new Date(),
        });

      // Create appeal answer
      await trx("appeal_answers").insert({
        appeal_id: appealId,
        moderator_id: moderatorId,
        text: answerText,
        file_jsons: answerFiles.length > 0 ? answerFiles : null,
      });

      // Create log entry
      await trx("appeal_logs").insert({
        appeal_id: appealId,
        action_type: "closed",
        moderator_id: moderatorId,
      });
    });
  }

  /**
   * Forward appeal to another district
   */
  async forwardAppeal(
    appealId: number,
    targetDistrictId: number,
    moderatorId: number,
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Get current district
      const appeal = await trx("appeals").where("id", appealId).first();

      // Update appeal district
      await trx("appeals")
        .where("id", appealId)
        .update({
          district_id: targetDistrictId,
          status: "forwarded",
          updated_at: new Date(),
        });

      // Create log entry
      await trx("appeal_logs").insert({
        appeal_id: appealId,
        action_type: "forwarded",
        from_district_id: appeal.district_id,
        to_district_id: targetDistrictId,
        moderator_id: moderatorId,
      });
    });
  }

  /**
   * Extend appeal due date
   */
  async extendDueDate(
    appealId: number,
    newDueDate: Date,
    moderatorId: number,
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Get current due date
      const appeal = await trx("appeals").where("id", appealId).first();

      // Update due date
      await trx("appeals")
        .where("id", appealId)
        .update({
          due_date: newDueDate,
          updated_at: new Date(),
        });

      // Create log entry
      await trx("appeal_logs").insert({
        appeal_id: appealId,
        action_type: "extended",
        old_due_date: appeal.due_date,
        new_due_date: newDueDate,
        moderator_id: moderatorId,
      });
    });
  }
}
