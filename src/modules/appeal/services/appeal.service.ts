import { Injectable } from "@nestjs/common";
import { AppealRepository } from "../repositories/appeal.repository";
import { UserService } from "../../user/services/user.service";
import { CreateAppealDto, Appeal } from "../interfaces/appeal.interface";
import dayjs from "dayjs";

@Injectable()
export class AppealService {
  constructor(
    private appealRepository: AppealRepository,
    private userService: UserService,
  ) {}

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

    // Calculate due date (+15 days)
    const dueDate = dayjs().add(15, "day").toDate();

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
   * Request approval for multiple appeals
   */
  async requestMultipleAppealApproval(userId: number): Promise<void> {
    // Check if already has pending request
    const existingRequest = await this.appealRepository.findPendingApprovalRequest(userId);
    if (existingRequest) {
      throw new Error("You already have a pending approval request");
    }

    await this.appealRepository.createApprovalRequest(userId);
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
}
