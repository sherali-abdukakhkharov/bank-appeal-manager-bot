import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP status
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error details
    const errorDetails = this.extractErrorDetails(exception);

    // Build comprehensive error log
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: request?.url || "N/A",
      method: request?.method || "N/A",
      statusCode: status,
      errorName: errorDetails.name,
      errorMessage: errorDetails.message,
      errorStack: errorDetails.stack,
      requestHeaders: request?.headers || {},
      requestBody: request?.body || {},
      requestQuery: request?.query || {},
      requestParams: request?.params || {},
      userAgent: request?.headers?.["user-agent"] || "N/A",
      ip:
        request?.ip ||
        request?.socket?.remoteAddress ||
        request?.headers?.["x-forwarded-for"] ||
        "N/A",
      additionalInfo: errorDetails.additionalInfo,
    };

    // Log error with full details
    this.logger.error(
      `\n${"=".repeat(80)}\n` +
        `EXCEPTION CAUGHT: ${errorDetails.name}\n` +
        `${"=".repeat(80)}\n` +
        `Timestamp: ${errorLog.timestamp}\n` +
        `Path: ${errorLog.path}\n` +
        `Method: ${errorLog.method}\n` +
        `Status Code: ${errorLog.statusCode}\n` +
        `Error Message: ${errorLog.errorMessage}\n` +
        `\n--- Stack Trace ---\n${errorLog.errorStack}\n` +
        `\n--- Request Details ---\n` +
        `Headers: ${JSON.stringify(errorLog.requestHeaders, null, 2)}\n` +
        `Body: ${JSON.stringify(errorLog.requestBody, null, 2)}\n` +
        `Query: ${JSON.stringify(errorLog.requestQuery, null, 2)}\n` +
        `Params: ${JSON.stringify(errorLog.requestParams, null, 2)}\n` +
        `User Agent: ${errorLog.userAgent}\n` +
        `IP: ${errorLog.ip}\n` +
        `${errorLog.additionalInfo ? `\n--- Additional Info ---\n${JSON.stringify(errorLog.additionalInfo, null, 2)}\n` : ""}` +
        `${"=".repeat(80)}\n`,
    );

    // Send response (only if response object exists - for HTTP contexts)
    if (response && typeof response.status === "function") {
      const errorResponse = {
        statusCode: status,
        timestamp: errorLog.timestamp,
        path: errorLog.path,
        message: errorDetails.message,
        error: errorDetails.name,
        ...(process.env.NODE_ENV === "development" && {
          stack: errorLog.errorStack,
          details: errorLog.additionalInfo,
        }),
      };

      response.status(status).json(errorResponse);
    }
  }

  private extractErrorDetails(exception: unknown): {
    name: string;
    message: string;
    stack: string;
    additionalInfo?: any;
  } {
    // Handle HttpException
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return {
        name: exception.name,
        message:
          typeof response === "string"
            ? response
            : (response as any)?.message || exception.message,
        stack: exception.stack || "No stack trace available",
        additionalInfo:
          typeof response === "object" ? response : undefined,
      };
    }

    // Handle standard Error objects
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack || "No stack trace available",
        additionalInfo: this.extractAdditionalErrorInfo(exception),
      };
    }

    // Handle non-Error objects
    if (typeof exception === "object" && exception !== null) {
      return {
        name: "UnknownException",
        message: JSON.stringify(exception),
        stack: "No stack trace available",
        additionalInfo: exception,
      };
    }

    // Handle primitive types
    return {
      name: "UnknownException",
      message: String(exception),
      stack: "No stack trace available",
    };
  }

  private extractAdditionalErrorInfo(error: Error): any {
    const additionalInfo: any = {};

    // Extract any additional properties from the error object
    Object.keys(error).forEach((key) => {
      if (key !== "name" && key !== "message" && key !== "stack") {
        additionalInfo[key] = (error as any)[key];
      }
    });

    // Check for common error properties
    if ("code" in error) additionalInfo.code = (error as any).code;
    if ("errno" in error) additionalInfo.errno = (error as any).errno;
    if ("syscall" in error) additionalInfo.syscall = (error as any).syscall;
    if ("path" in error) additionalInfo.path = (error as any).path;
    if ("cause" in error) additionalInfo.cause = (error as any).cause;

    return Object.keys(additionalInfo).length > 0
      ? additionalInfo
      : undefined;
  }
}
