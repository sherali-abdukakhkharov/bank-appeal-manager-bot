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
  // Moderator/Admin
  | "moderator_full_name"
  | "moderator_phone"
  | "moderator_district"
  | "moderator_mfo"
  // Post-registration
  | "registration_complete"
  | "main_menu";

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
  };
}

/**
 * Custom context with session
 */
export type BotContext = Context & SessionFlavor<SessionData>;
