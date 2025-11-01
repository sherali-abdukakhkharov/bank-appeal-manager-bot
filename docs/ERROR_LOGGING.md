# Error Logging System

This document describes the comprehensive error logging system implemented in the Bank Appeal Manager Bot.

## Overview

The error logging system provides detailed debugging information for all exceptions that occur in the application. It consists of two main components:

1. **Global Exception Filter** - Catches all HTTP/REST API errors
2. **Bot Error Logger** - Logs detailed information for Telegram bot errors

## Components

### 1. Global Exception Filter

**Location**: `src/common/filters/global-exception.filter.ts`

This filter catches all exceptions in NestJS HTTP context and logs comprehensive debugging information.

#### Features:
- Catches all exceptions globally (both HTTP and non-HTTP)
- Logs detailed error information including:
  - Timestamp
  - Request path, method, and status code
  - Complete stack trace
  - Request headers, body, query parameters
  - User agent and IP address
  - Additional error-specific information
- Provides different responses based on environment (development vs production)
- Handles multiple error types: HttpException, Error objects, and unknown objects

#### Usage:
The filter is automatically registered globally in `src/main.ts`:

```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

### 2. Bot Error Logger Utility

**Location**: `src/common/utils/bot-error-logger.util.ts`

This utility provides detailed logging for Telegram bot errors with context information.

#### Features:
- Logs comprehensive bot context information:
  - Update ID, message ID, chat information
  - User details (ID, username, name, language)
  - Session state (step, data, language)
  - Message content and callback data
  - Update type detection
- Extracts Grammy-specific error properties
- Formats output for easy reading and debugging
- Provides JSON output for monitoring/parsing

#### Usage:
Import and use in any handler or service:

```typescript
import { BotErrorLogger } from "../../../common/utils/bot-error-logger.util";

try {
  // Your code here
} catch (error) {
  BotErrorLogger.logError(error, ctx);
  await ctx.reply(this.i18nService.t("common.error", language));
}
```

## Implementation Details

### Global Bot Error Handler

The bot service (`src/modules/bot/services/bot.service.ts`) uses the BotErrorLogger in its global error handler:

```typescript
this.bot.catch((err) => {
  const errorContext = err.ctx as BotContext;
  BotErrorLogger.logError(err.error, errorContext);
});
```

### Handler-Level Error Logging

All handlers have been updated to use BotErrorLogger in their catch blocks:
- `src/modules/bot/handlers/appeal.handler.ts`
- `src/modules/bot/handlers/moderator.handler.ts`
- `src/modules/bot/handlers/registration.handler.ts`

Example:
```typescript
try {
  await this.appealService.createAppeal(data);
} catch (error) {
  BotErrorLogger.logError(error, ctx); // ← Logs full error details
  await ctx.reply(this.i18nService.t("common.error", language));
}
```

## Log Output Format

### Bot Error Log Example:
```
================================================================================
BOT ERROR: TypeError
================================================================================
Timestamp: 2025-11-01T12:34:56.789Z
Error Message: Cannot read property 'id' of undefined

--- Stack Trace ---
TypeError: Cannot read property 'id' of undefined
    at AppealHandler.submitAppeal (appeal.handler.ts:230:25)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)

--- Bot Context ---
Update ID: 123456789
Update Type: callback_query
Message ID: 987654
Chat ID: 123456789
Chat Type: private
User ID: 123456789
Username: john_doe
User Name: John Doe
Language: en
Session Step: appeal_text_input
Session Language: uz
Message Text: N/A
Callback Data: submit_appeal
Session Data: {
  "appealText": "My appeal text",
  "appealFiles": [],
  "appealCustomNumber": null
}

--- Additional Error Info ---
{
  "code": "ERR_UNDEFINED",
  "cause": "User object is null"
}
================================================================================
```

### HTTP Error Log Example:
```
================================================================================
EXCEPTION CAUGHT: HttpException
================================================================================
Timestamp: 2025-11-01T12:34:56.789Z
Path: /api/users/123
Method: GET
Status Code: 404
Error Message: User not found

--- Stack Trace ---
HttpException: User not found
    at UserService.findById (user.service.ts:45:13)

--- Request Details ---
Headers: {
  "content-type": "application/json",
  "user-agent": "Mozilla/5.0...",
  "authorization": "Bearer ..."
}
Body: {}
Query: { "include": "profile" }
Params: { "id": "123" }
User Agent: Mozilla/5.0...
IP: 192.168.1.1
================================================================================
```

## Benefits

1. **Complete Error Context**: Every error now includes full context about what the user was doing
2. **Easier Debugging**: Stack traces and context make it easy to reproduce and fix issues
3. **No Silent Failures**: All errors that show "common.error" to users are now logged with details
4. **Session State Tracking**: See exactly what step the user was on when the error occurred
5. **User Information**: Know which user encountered the error for follow-up
6. **Structured Logging**: Both human-readable and JSON formats for monitoring tools

## Troubleshooting

If you see "common.error" message in the bot but no logs:

1. Check that the error is being caught in a try-catch block
2. Verify BotErrorLogger.logError() is called in the catch block
3. Check console/log output for the detailed error log
4. Ensure the Logger is not filtered by log level settings

## Environment Configuration

In development mode, stack traces and additional details are included in HTTP responses.
In production mode, only essential error information is sent to clients.

Set environment via:
```bash
NODE_ENV=development  # Shows detailed errors
NODE_ENV=production   # Shows minimal error info
```

## Future Enhancements

Potential improvements:
- Integration with error tracking services (Sentry, Rollbar, etc.)
- Error metrics and analytics
- Automatic error notification to developers
- Error categorization and prioritization
- Automatic retry mechanisms for transient errors
