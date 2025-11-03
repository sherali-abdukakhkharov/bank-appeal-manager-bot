import { Injectable } from "@nestjs/common";
import { AppealRepository } from "../repositories/appeal.repository";
import { UserService } from "../../user/services/user.service";
import { CreateAppealDto, Appeal } from "../interfaces/appeal.interface";
import { getDateInTashkent } from "../../../common/utils/date.util";

@Injectable()
export class AppealService {
  constructor(
    private appealRepository: AppealRepository,
    private userService: UserService,
  ) { }

  /**
   * Create a new appeal
   */
  async createAppeal(dto: CreateAppealDto): Promise<Appeal> {
    // Get user to determine district routing
    const user = await this.userService.findById(dto.user_id);
    if (!user) {
      throw new Error("User not found");
    }

    // Determine target district based on user type
    let targetDistrictId: number;

    if (user.type === "business") {
      // Business appeals go to bank_account_district
      const businessInfo = await this.userService.getBusinessInfo(dto.user_id);
      if (!businessInfo) {
        throw new Error("Business info not found");
      }
      targetDistrictId = businessInfo.bank_account_district_id;
    } else {
      // Individual and Government appeals go to their district
      if (!user.district_id) {
        throw new Error("User district not set");
      }
      targetDistrictId = user.district_id;
    }

    // Override district in DTO
    dto.district_id = targetDistrictId;

    // Generate appeal number or use custom number
    let appealNumber: string;
    if (dto.custom_number) {
      // For government users who provide custom number
      appealNumber = dto.custom_number;
    } else {
      appealNumber = await this.appealRepository.getNextAppealNumber();
    }

    // Calculate due date (+15 days) in Tashkent timezone
    const dueDate = getDateInTashkent().add(15, "day").endOf("day").toDate();

    // Create appeal
    return await this.appealRepository.create(dto, appealNumber, dueDate);
  }

  /**
   * Get user's active appeal (if any)
   */
  async getActiveAppealByUserId(userId: number): Promise<Appeal | null> {
    return await this.appealRepository.findActiveByUserId(userId);
  }

  /**
   * Get all appeals for a user
   */
  async getUserAppeals(userId: number): Promise<Appeal[]> {
    return await this.appealRepository.findByUserId(userId);
  }

  /**
   * Get pending approval request for user
   */
  async getPendingApprovalRequest(userId: number) {
    return await this.appealRepository.findPendingApprovalRequest(userId);
  }

  /**
   * Request approval for multiple appeals
   */
  async requestMultipleAppealApproval(userId: number) {
    return await this.appealRepository.createApprovalRequest(userId);
  }

  /**
   * Approve appeal request
   */
  async approveAppealRequest(
    requestId: number,
    moderatorId: number,
  ): Promise<void> {
    await this.appealRepository.updateApprovalRequest(
      requestId,
      "approved",
      moderatorId,
    );
  }

  /**
   * Reject appeal request
   */
  async rejectAppealRequest(
    requestId: number,
    moderatorId: number,
    reason?: string,
  ): Promise<void> {
    await this.appealRepository.updateApprovalRequest(
      requestId,
      "rejected",
      moderatorId,
      reason,
    );
  }

  /**
   * Get approval request by ID
   */
  async getApprovalRequestById(requestId: number) {
    return await this.appealRepository.findApprovalRequestById(requestId);
  }

  /**
   * Get approved approval request for user
   */
  async getApprovedApprovalRequest(userId: number) {
    return await this.appealRepository.findApprovedApprovalRequest(userId);
  }

  /**
   * Delete approval request (after it's been used)
   */
  async deleteApprovalRequest(requestId: number): Promise<void> {
    await this.appealRepository.deleteApprovalRequest(requestId);
  }

  /**
   * Get appeal by ID
   */
  async getAppealById(id: number): Promise<Appeal | null> {
    return await this.appealRepository.findById(id);
  }

  /**
   * Get appeals by district (for moderators)
   */
  async getAppealsByDistrict(districtId: number, status?: string): Promise<Appeal[]> {
    return await this.appealRepository.findByDistrict(districtId, status);
  }

  /**
   * Get appeals by district and status, sorted by due date
   */
  async getAppealsByDistrictAndStatus(
    districtId: number,
    statuses: string[],
  ): Promise<Appeal[]> {
    return await this.appealRepository.findByDistrictAndStatus(
      districtId,
      statuses,
    );
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
    await this.appealRepository.closeAppeal(
      appealId,
      moderatorId,
      answerText,
      answerFiles,
    );
  }

  /**
   * Forward appeal to another district
   */
  async forwardAppeal(
    appealId: number,
    targetDistrictId: number,
    moderatorId: number,
  ): Promise<void> {
    await this.appealRepository.forwardAppeal(
      appealId,
      targetDistrictId,
      moderatorId,
    );
  }

  /**
   * Extend appeal due date
   */
  async extendDueDate(
    appealId: number,
    newDueDate: Date,
    moderatorId: number,
  ): Promise<void> {
    await this.appealRepository.extendDueDate(appealId, newDueDate, moderatorId);
  }

  /**
   * Get appeals that need deadline reminders (5 days or less remaining)
   */
  async getAppealsNeedingReminders(): Promise<Appeal[]> {
    return await this.appealRepository.findAppealsNeedingReminders();
  }

  /**
   * Get appeal details with answer and history
   */
  async getAppealDetails(appealId: number) {
    const appeal = await this.appealRepository.findById(appealId);
    if (!appeal) {
      return null;
    }

    const answer = await this.appealRepository.findAnswerByAppealId(appealId);
    const logs = await this.appealRepository.findLogsByAppealId(appealId);

    return {
      appeal,
      answer,
      logs,
    };
  }

  /**
   * Get all appeals (for admins) with optional district filter
   */
  async getAllAppeals(districtId?: number, statuses?: string[]): Promise<Appeal[]> {
    return await this.appealRepository.findAllAppeals(districtId, statuses);
  }

  /**
   * Get appeal statistics
   */
  async getStatistics(districtId?: number) {
    return await this.appealRepository.getStatistics(districtId);
  }

  /**
   * Get appeals for Excel export
   */
  async getAppealsForExport(districtId?: number): Promise<any[]> {
    return await this.appealRepository.getAppealsForExport(districtId);
  }

  /**
   * Approve answer
   */
  async approveAnswer(answerId: number, userId: number): Promise<void> {
    await this.appealRepository.approveAnswer(answerId);
  }

  /**
   * Reject answer and reopen appeal
   */
  async rejectAnswer(
    answerId: number,
    userId: number,
    reason: string,
  ): Promise<number> {
    return await this.appealRepository.rejectAnswer(answerId, reason);
  }

  /**
   * Get appeal details from answer ID
   */
  async getAppealDetailsFromAnswerId(answerId: number) {
    const answer = await this.appealRepository.findAnswerById(answerId);
    if (!answer) {
      return null;
    }

    const appeal = await this.appealRepository.findById(answer.appeal_id);
    if (!appeal) {
      return null;
    }

    const logs = await this.appealRepository.findLogsByAppealId(appeal.id);

    return {
      appeal,
      answer,
      logs,
    };
  }
}
