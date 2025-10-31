export interface User {
  id: number;
  telegram_id: number;
  type: "individual" | "business" | "government" | "moderator" | "admin";
  full_name: string;
  phone: string;
  additional_phone?: string;
  birth_date?: Date;
  district_id?: number;
  language: "uz" | "ru";
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDto {
  telegram_id: number;
  type: "individual" | "business" | "government" | "moderator" | "admin";
  full_name: string;
  phone: string;
  additional_phone?: string;
  birth_date?: string;
  district_id?: number;
  language: "uz" | "ru";
}

export interface UserBusinessInfo {
  user_id: number;
  organization_address: string;
  bank_account_district_id: number;
}

export interface UserGovernmentInfo {
  user_id: number;
  government_org_id: number;
  position: string;
}
