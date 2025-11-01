import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import { Appeal, CreateAppealDto, AppealApprovalRequest } from "../interfaces/appeal.interface";
import { getDateInTashkent } from "../../../common/utils/date.util";

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
    // For JSONB columns, we need to use raw SQL to properly cast the JSON
    const fileJsonsValue = dto.file_jsons && dto.file_jsons.length > 0
      ? this.db.raw('?::jsonb', [JSON.stringify(dto.file_jsons)])
      : null;

    const [appeal] = await this.db("appeals")
      .insert({
        appeal_number: appealNumber,
        user_id: dto.user_id,
        district_id: dto.district_id,
        text: dto.text,
        file_jsons: fileJsonsValue,
        status: "new",
        due_date: dueDate,
      })
      .returning("*");

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
    const year = getDateInTashkent().year();
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
   * Find approval request by ID
   */
  async findApprovalRequestById(requestId: number): Promise<AppealApprovalRequest | null> {
    const request = await this.db("appeal_approval_requests")
      .where("id", requestId)
      .first();

    return request || null;
  }

  /**
   * Update approval request status
   */
  async updateApprovalRequest(
    requestId: number,
    status: "approved" | "rejected",
    moderatorId: number,
    reason?: string,
  ): Promise<void> {
    await this.db("appeal_approval_requests")
      .where("id", requestId)
      .update({
        status,
        moderator_id: moderatorId,
        reason: reason || null,
        resolved_at: getDateInTashkent().toDate(),
      });
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
          closed_at: getDateInTashkent().toDate(),
          updated_at: getDateInTashkent().toDate(),
        });

      // For JSONB columns, use raw SQL to properly cast the JSON
      const answerFilesValue = answerFiles.length > 0
        ? trx.raw('?::jsonb', [JSON.stringify(answerFiles)])
        : null;

      // Create appeal answer
      await trx("appeal_answers").insert({
        appeal_id: appealId,
        moderator_id: moderatorId,
        text: answerText,
        file_jsons: answerFilesValue,
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
          updated_at: getDateInTashkent().toDate(),
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
          updated_at: getDateInTashkent().toDate(),
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

  /**
   * Find active appeals that need deadline reminders (5 days or less remaining)
   * This includes overdue appeals
   */
  async findAppealsNeedingReminders(): Promise<Appeal[]> {
    // Calculate 5 days from now in Tashkent timezone
    const fiveDaysFromNow = getDateInTashkent()
      .add(5, "day")
      .endOf("day")
      .toDate();

    return await this.db("appeals")
      .whereIn("status", ["new", "in_progress", "forwarded"])
      .where("due_date", "<=", fiveDaysFromNow) // Due within 5 days or overdue
      .orderBy("due_date", "asc");
  }

  /**
   * Get appeal answer by appeal ID
   */
  async findAnswerByAppealId(appealId: number): Promise<any | null> {
    const answer = await this.db("appeal_answers")
      .where("appeal_id", appealId)
      .first();

    return answer || null;
  }

  /**
   * Get appeal logs (history) by appeal ID
   */
  async findLogsByAppealId(appealId: number): Promise<any[]> {
    return await this.db("appeal_logs")
      .where("appeal_id", appealId)
      .orderBy("created_at", "asc");
  }

  /**
   * Get all appeals (for admins) with optional district filter
   */
  async findAllAppeals(districtId?: number, status?: string): Promise<Appeal[]> {
    let query = this.db("appeals");

    if (districtId) {
      query = query.where("district_id", districtId);
    }

    if (status) {
      query = query.where("status", status);
    }

    return await query.orderBy("due_date", "asc");
  }

  /**
   * Get statistics for appeals
   */
  async getStatistics(districtId?: number) {
    let query = this.db("appeals");

    if (districtId) {
      query = query.where("district_id", districtId);
    }

    // Total count
    const totalResult = await query.clone().count("* as count").first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Count by status
    const byStatus = await query
      .clone()
      .select("status")
      .count("* as count")
      .groupBy("status");

    // Average response time for closed appeals
    const avgResponseTimeResult = await this.db("appeals")
      .where("status", "closed")
      .whereNotNull("closed_at")
      .select(
        this.db.raw(
          "AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) as avg_days",
        ),
      )
      .first() as any;

    const avgResponseTime = avgResponseTimeResult?.avg_days
      ? parseFloat(avgResponseTimeResult.avg_days)
      : 0;

    // Overdue appeals
    const now = getDateInTashkent().toDate();
    const overdueResult = await query
      .clone()
      .where("due_date", "<", now)
      .whereIn("status", ["new", "in_progress", "forwarded"])
      .count("* as count")
      .first();

    const overdue = parseInt(overdueResult?.count as string) || 0;

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = parseInt(item.count as string);
          return acc;
        },
        {} as Record<string, number>,
      ),
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      overdue,
    };
  }

  /**
   * Get detailed appeals for Excel export
   */
  async getAppealsForExport(districtId?: number): Promise<any[]> {
    let query = this.db("appeals as a")
      .leftJoin("users as u", "a.user_id", "u.id")
      .leftJoin("districts as d", "a.district_id", "d.id")
      .leftJoin("appeal_answers as ans", "a.id", "ans.appeal_id")
      .select(
        "a.appeal_number",
        "a.status",
        "u.full_name as user_name",
        "u.phone as user_phone",
        "d.name_uz as district_name",
        "a.text as appeal_text",
        "a.created_at",
        "a.due_date",
        "a.closed_at",
        "ans.text as answer_text",
      );

    if (districtId) {
      query = query.where("a.district_id", districtId);
    }

    return await query.orderBy("a.created_at", "desc");
  }
}
