import { Context, SessionFlavor } from "grammy";

/**
 * Registration steps for multi-step conversations
 */
export type RegistrationStep =
  | "language_selection"
  | "user_type_selection"
  // Individual
  | "individual_full_name"
  | "individual_birth_date"
  | "individual_phone"
  | "individual_additional_phone"
  | "individual_district"
  // Business
  | "business_full_name"
  | "business_phone"
  | "business_additional_phone"
  | "business_district"
  | "business_address"
  | "business_bank_district"
  // Government
  | "government_organization"
  | "government_full_name"
  | "government_position"
  | "government_phone"
  | "government_district"
  // Moderator/Admin
  | "moderator_full_name"
  | "moderator_phone"
  | "moderator_district"
  | "moderator_mfo"
  // Post-registration
  | "registration_complete"
  | "main_menu"
  // Appeal creation
  | "appeal_custom_number_prompt"
  | "appeal_custom_number_input"
  | "appeal_text_input"
  | "appeal_collecting_files"
  | "appeal_confirm"
  // Moderator actions
  | "moderator_close_appeal_text"
  | "moderator_close_appeal_files"
  | "moderator_extend_due_date"
  // Approval requests
  | "reject_request_reason"
  // Answer approval
  | "reject_answer_reason"
  // Account reset
  | "reset_account_confirmation";

/**
 * User types
 */
export type UserType =
  | "individual"
  | "business"
  | "government"
  | "moderator"
  | "admin";

/**
 * Session data stored for each user
 */
export interface SessionData {
  step: RegistrationStep | null;
  language: "uz" | "ru";
  data: {
    // Common fields
    userType?: UserType;
    fullName?: string;
    phone?: string;
    additionalPhone?: string;
    districtId?: number;

    // Individual specific
    birthDate?: string;

    // Business specific
    organizationAddress?: string;
    bankAccountDistrictId?: number;

    // Government specific
    governmentOrgId?: number;
    position?: string;

    // Moderator/Admin specific
    mfoCode?: string;

    // Appeal creation
    appealText?: string;
    appealFiles?: Array<{
      file_id: string;
      file_unique_id: string;
      file_name?: string;
      file_size?: number;
      mime_type?: string;
      file_type: "document" | "photo" | "video" | "audio" | "voice" | "video_note";
    }>;
    appealCustomNumber?: string;

    // Moderator actions
    moderatorAppealId?: number;
    moderatorAnswerText?: string;
    moderatorAnswerFiles?: Array<{
      file_id: string;
      file_unique_id: string;
      file_name?: string;
      file_size?: number;
      mime_type?: string;
      file_type: "document" | "photo" | "video" | "audio" | "voice" | "video_note";
    }>;

    // Approval requests
    rejectionRequestId?: number;

    // Answer approval
    rejectionAnswerId?: number;
  };
}

/**
 * Custom context with session
 */
export type BotContext = Context & SessionFlavor<SessionData>;
