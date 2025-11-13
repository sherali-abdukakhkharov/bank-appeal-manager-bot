import { Injectable } from "@nestjs/common";
import { FileMetadata } from "../../../common/types/file.types";

@Injectable()
export class FileService {
  /**
   * File service for handling Telegram file metadata
   * Files are stored in Telegram, we only store file_id and metadata in JSONB
   */

  /**
   * Extract file metadata from Telegram message
   */
  extractFileMetadata(message: any): FileMetadata | null {
    if (message.document) {
      return {
        file_id: message.document.file_id,
        file_unique_id: message.document.file_unique_id,
        file_name: message.document.file_name,
        file_size: message.document.file_size,
        mime_type: message.document.mime_type,
        file_type: "document",
      };
    }

    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1]; // Get largest photo
      return {
        file_id: photo.file_id,
        file_unique_id: photo.file_unique_id,
        file_size: photo.file_size,
        file_type: "photo",
      };
    }

    if (message.video) {
      return {
        file_id: message.video.file_id,
        file_unique_id: message.video.file_unique_id,
        file_name: message.video.file_name,
        file_size: message.video.file_size,
        mime_type: message.video.mime_type,
        file_type: "video",
      };
    }

    if (message.audio) {
      return {
        file_id: message.audio.file_id,
        file_unique_id: message.audio.file_unique_id,
        file_name: message.audio.file_name,
        file_size: message.audio.file_size,
        mime_type: message.audio.mime_type,
        file_type: "audio",
      };
    }

    if (message.voice) {
      return {
        file_id: message.voice.file_id,
        file_unique_id: message.voice.file_unique_id,
        file_size: message.voice.file_size,
        mime_type: message.voice.mime_type,
        file_type: "voice",
      };
    }

    if (message.video_note) {
      return {
        file_id: message.video_note.file_id,
        file_unique_id: message.video_note.file_unique_id,
        file_size: message.video_note.file_size,
        file_type: "video_note",
      };
    }

    return null;
  }

  /**
   * Check if file is text format (document/PDF/Word)
   */
  isTextFormat(fileMetadata: FileMetadata): boolean {
    if (fileMetadata.file_type !== "document") {
      return false;
    }

    const textMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
    ];

    return textMimeTypes.includes(fileMetadata.mime_type || "");
  }

  /**
   * Validate file for appeal submission
   */
  validateAppealFiles(
    files: FileMetadata[],
    hasText: boolean,
  ): { valid: boolean; error?: string } {
    if (!hasText && files.length === 0) {
      return { valid: false, error: "Appeal must have text or attachments" };
    }

    const hasTextFile = files.some((f) => this.isTextFormat(f));
    const hasNonTextFile = files.some((f) => !this.isTextFormat(f));

    if (hasNonTextFile && !hasText && !hasTextFile) {
      return {
        valid: false,
        error:
          "Non-text files (audio/video) require text or text-format document",
      };
    }

    return { valid: true };
  }
}
