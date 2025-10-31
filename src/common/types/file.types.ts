/**
 * File metadata stored in JSONB columns
 * Files are stored in Telegram, we only store metadata
 */
export interface FileMetadata {
  file_id: string; // Telegram file_id for retrieval
  file_unique_id: string; // Unique identifier
  file_name?: string; // Original file name (if available)
  file_size?: number; // File size in bytes
  mime_type?: string; // MIME type
  file_type: "document" | "photo" | "video" | "audio" | "voice";
}

/**
 * Appeal with file metadata
 */
export interface AppealWithFiles {
  id: number;
  appeal_number: string;
  user_id: number;
  district_id: number;
  text?: string;
  file_jsons?: FileMetadata[]; // Array of file metadata
  status: string;
  due_date: Date;
  closed_by_moderator_id?: number;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Appeal answer with file metadata
 */
export interface AppealAnswer {
  id: number;
  appeal_id: number;
  moderator_id: number;
  text?: string;
  file_jsons?: FileMetadata[]; // Array of file metadata
  created_at: Date;
}
