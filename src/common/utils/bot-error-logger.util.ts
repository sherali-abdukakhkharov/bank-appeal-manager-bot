import { Logger } from "@nestjs/common";
import { BotContext } from "../types/bot.types";

export class BotErrorLogger {
  private static readonly logger = new Logger("BotError");

  /**
   * Logs detailed bot error information
   */
  static logError(error: any, ctx?: BotContext): void {
    const timestamp = new Date().toISOString();

    // Extract context information
    const contextInfo = ctx
      ? {
          updateId: ctx.update?.update_id,
          messageId: ctx.message?.message_id,
          chatId: ctx.chat?.id,
          chatType: ctx.chat?.type,
          userId: ctx.from?.id,
          username: ctx.from?.username,
          firstName: ctx.from?.first_name,
          lastName: ctx.from?.last_name,
          language: ctx.from?.language_code,
          sessionStep: ctx.session?.step,
          sessionData: ctx.session?.data,
          sessionLanguage: ctx.session?.language,
          messageText: ctx.message?.text,
          callbackData: (ctx as any).callbackQuery?.data,
          updateType: this.getUpdateType(ctx),
        }
      : null;

    // Extract error details
    const errorDetails = this.extractErrorDetails(error);

    // Build comprehensive log
    const errorLog = {
      timestamp,
      ...errorDetails,
      context: contextInfo,
    };

    // Format and log the error
    this.logger.error(
      `\n${"=".repeat(80)}\n` +
        `BOT ERROR: ${errorDetails.name}\n` +
        `${"=".repeat(80)}\n` +
        `Timestamp: ${timestamp}\n` +
        `Error Message: ${errorDetails.message}\n` +
        `\n--- Stack Trace ---\n${errorDetails.stack}\n` +
        `${contextInfo ? this.formatContextInfo(contextInfo) : "No context available"}\n` +
        `${errorDetails.additionalInfo ? `\n--- Additional Error Info ---\n${JSON.stringify(errorDetails.additionalInfo, null, 2)}\n` : ""}` +
        `${"=".repeat(80)}\n`,
    );

    // Also log as JSON for easy parsing/monitoring
    this.logger.debug(`Error JSON: ${JSON.stringify(errorLog, null, 2)}`);
  }

  private static extractErrorDetails(error: any): {
    name: string;
    message: string;
    stack: string;
    additionalInfo?: any;
  } {
    // Handle Error objects
    if (error instanceof Error) {
      const additionalInfo: any = {};

      // Extract custom error properties
      Object.keys(error).forEach((key) => {
        if (!["name", "message", "stack"].includes(key)) {
          additionalInfo[key] = (error as any)[key];
        }
      });

      // Check for common error properties
      if ("code" in error) additionalInfo.code = (error as any).code;
      if ("errno" in error) additionalInfo.errno = (error as any).errno;
      if ("syscall" in error) additionalInfo.syscall = (error as any).syscall;
      if ("cause" in error) additionalInfo.cause = (error as any).cause;

      // Check for Grammy-specific error properties
      if ("error_code" in error)
        additionalInfo.error_code = (error as any).error_code;
      if ("description" in error)
        additionalInfo.description = (error as any).description;
      if ("parameters" in error)
        additionalInfo.parameters = (error as any).parameters;

      return {
        name: error.name,
        message: error.message,
        stack: error.stack || "No stack trace available",
        additionalInfo:
          Object.keys(additionalInfo).length > 0
            ? additionalInfo
            : undefined,
      };
    }

    // Handle BotError (Grammy specific)
    if (typeof error === "object" && error !== null) {
      return {
        name: error.constructor?.name || "BotError",
        message: error.message || JSON.stringify(error),
        stack: error.stack || "No stack trace available",
        additionalInfo: error,
      };
    }

    // Handle primitive types
    return {
      name: "UnknownError",
      message: String(error),
      stack: "No stack trace available",
    };
  }

  private static formatContextInfo(contextInfo: any): string {
    return (
      `\n--- Bot Context ---\n` +
      `Update ID: ${contextInfo.updateId || "N/A"}\n` +
      `Update Type: ${contextInfo.updateType || "N/A"}\n` +
      `Message ID: ${contextInfo.messageId || "N/A"}\n` +
      `Chat ID: ${contextInfo.chatId || "N/A"}\n` +
      `Chat Type: ${contextInfo.chatType || "N/A"}\n` +
      `User ID: ${contextInfo.userId || "N/A"}\n` +
      `Username: ${contextInfo.username || "N/A"}\n` +
      `User Name: ${[contextInfo.firstName, contextInfo.lastName].filter(Boolean).join(" ") || "N/A"}\n` +
      `Language: ${contextInfo.language || "N/A"}\n` +
      `Session Step: ${contextInfo.sessionStep || "N/A"}\n` +
      `Session Language: ${contextInfo.sessionLanguage || "N/A"}\n` +
      `Message Text: ${contextInfo.messageText || "N/A"}\n` +
      `Callback Data: ${contextInfo.callbackData || "N/A"}\n` +
      `Session Data: ${JSON.stringify(contextInfo.sessionData, null, 2)}\n`
    );
  }

  private static getUpdateType(ctx: BotContext): string {
    if (ctx.message) {
      if (ctx.message.text) return "text_message";
      if (ctx.message.contact) return "contact_message";
      if (ctx.message.document) return "document_message";
      if (ctx.message.photo) return "photo_message";
      if (ctx.message.video) return "video_message";
      if (ctx.message.audio) return "audio_message";
      if (ctx.message.voice) return "voice_message";
      if (ctx.message.video_note) return "video_note_message";
      return "message";
    }
    if ((ctx as any).callbackQuery) return "callback_query";
    if ((ctx as any).inlineQuery) return "inline_query";
    if ((ctx as any).channelPost) return "channel_post";
    if ((ctx as any).editedMessage) return "edited_message";
    return "unknown";
  }
}
