import { FileMetadata } from "../../../common/types/file.types";

export interface Appeal {
  id: number;
  appeal_number: string;
  user_id: number;
  district_id: number;
  text?: string;
  file_jsons?: FileMetadata[];
  status: "new" | "in_progress" | "closed" | "forwarded" | "overdue";
  due_date: Date;
  closed_by_moderator_id?: number;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAppealDto {
  user_id: number;
  district_id: number;
  text?: string;
  file_jsons?: FileMetadata[];
  custom_number?: string; // For government users
}

export interface AppealAnswer {
  id: number;
  appeal_id: number;
  moderator_id: number;
  text?: string;
  file_jsons?: FileMetadata[];
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  approved_at?: Date;
  rejected_at?: Date;
  created_at: Date;
}

export interface AppealLog {
  id: number;
  appeal_id: number;
  action_type: "created" | "forwarded" | "extended" | "closed";
  from_district_id?: number;
  to_district_id?: number;
  old_due_date?: Date;
  new_due_date?: Date;
  moderator_id?: number;
  comment?: string;
  created_at: Date;
}

export interface AppealApprovalRequest {
  id: number;
  user_id: number;
  status: "pending" | "approved" | "rejected";
  moderator_id?: number;
  created_at: Date;
  resolved_at?: Date;
}
