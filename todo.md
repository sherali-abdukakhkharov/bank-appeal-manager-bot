# Bank Appeal Manager Bot - TODO List

## 1. Project Setup & Infrastructure
- [x] Initialize NestJS project structure with modules
- [x] Configure Grammy bot integration with NestJS
- [x] Setup @grammyjs/hydrate for context hydration
- [x] Setup @grammyjs/storage-free for session management
- [x] Configure Knex.js with PostgreSQL connection
- [x] Create knexfile.ts for database configuration
- [x] Configure environment variables (.env file) with dotenv
- [x] Setup Git repository with .gitignore
- [x] Create NestJS module structure (bot, user, appeal, district, report, cron modules)
- [x] Setup ESLint and Prettier (already configured)
- [x] Configure TypeScript with proper tsconfig.json
- [x] Setup Swagger documentation with @nestjs/swagger
- [x] Configure class-validator and class-transformer for DTOs
- [x] Setup file upload handling with multer

## 2. Database Schema Design (Using Telegram as file storage)
- [x] Create Knex migration for Users table (id, telegram_id, type, full_name, phone, additional_phone, birth_date, district_id, language, created_at, updated_at)
- [x] Create Knex migration for Districts table (id, name_uz, name_ru, is_central, created_at)
- [x] Create Knex migration for GovernmentOrganizations table (id, name_uz, name_ru, created_at)
- [x] Create Knex migration for MFONumbers table (id, mfo_code, district_id, created_at)
- [x] Create Knex migration for Appeals table (id, appeal_number, user_id, district_id, text, file_jsons JSONB, status, due_date, created_at, updated_at, closed_at, closed_by_moderator_id)
- [x] Create Knex migration for AppealAnswers table (id, appeal_id, moderator_id, text, file_jsons JSONB, created_at)
- [x] Create Knex migration for AppealLogs table (id, appeal_id, action_type, from_district_id, to_district_id, old_due_date, new_due_date, moderator_id, comment, created_at)
- [x] Create Knex migration for AppealApprovalRequests table (id, user_id, status, moderator_id, created_at, resolved_at)
- [x] Create Knex migration for UserBusinessInfo table (user_id, organization_address, bank_account_district_id)
- [x] Create Knex migration for UserGovernmentInfo table (user_id, government_org_id, position)
- [x] Add proper indexes in migrations (telegram_id, appeal_number, user_id, district_id, status, due_date)
- [x] Add foreign key constraints in migrations
- [x] Create database service/repository classes for each table
- [x] Create common types for FileMetadata interface

## 3. Seed Data
- [x] Create Knex seed file for Districts (including main central bank district)
- [x] Create Knex seed file for Government Organizations
- [x] Create Knex seed file for MFO Numbers
- [ ] Run seeds to populate initial data
- [ ] Create optional seed for test users in development

## 4. Localization System
- [x] Create locales directory structure (locales/uz.json, locales/ru.json)
- [x] Create Uzbek language file (uz.json) with all bot messages organized by context
- [x] Create Russian language file (ru.json) with all bot messages organized by context
- [x] Implement i18n service/utility class for translations
- [x] Integrate i18n with Grammy middleware for automatic language detection
- [x] Store user language preference in session and database
- [x] Create helper functions: formatDate(date, lang), formatNumber(num, lang) in date.util.ts

## 5. User Registration Flows
- [x] Setup Grammy conversation/session management for multi-step flows
- [x] Implement /start command handler with language selection (Uzbek/Russian)
- [x] Implement user type selection (Individual, Business, Government, Moderator, Admin)
- [x] Create Individual registration conversation flow:
  - [x] Collect full name with validation
  - [x] Collect birth date with dayjs validation
  - [x] Collect main phone with format validation (with contact sharing option)
  - [x] Collect additional phone (optional)
  - [x] Display districts list with inline keyboard, collect selection
- [x] Create Business registration conversation flow:
  - [x] Collect full name with validation
  - [x] Collect main phone with format validation (with contact sharing option)
  - [x] Collect additional phone (optional)
  - [x] Display districts list for main district
  - [x] Collect organization address
  - [x] Display districts list for bank account district
- [x] Create Government registration conversation flow:
  - [x] Display government organizations list with inline keyboard
  - [x] Collect full name with validation
  - [x] Collect position with validation
  - [x] Collect phone number with validation (with contact sharing option)
  - [x] Collect district selection (government users select their district, NOT central bank)
- [x] Create Moderator registration conversation flow:
  - [x] Collect full name with validation
  - [x] Collect phone with validation (with contact sharing option)
  - [x] Display districts list with inline keyboard
  - [x] Collect MFO number
  - [x] Validate MFO number against database
- [x] Create Admin registration flow (same as Moderator)
- [x] Implement validation utility functions (phone, date, MFO)
- [x] Implement date format conversion utility (DD.MM.YYYY to YYYY-MM-DD)
- [x] Save user data to database after successful registration
- [x] Handle registration cancellation with /cancel command
- [x] Add check for registered users in /start command

## 6. Menu System & Navigation
- [x] Create main menu keyboard for Individual users (Send Appeal, My Appeals)
- [x] Create main menu keyboard for Business users (Send Appeal, My Appeals)
- [x] Create main menu keyboard for Government users (Send Appeal, My Appeals)
- [x] Create main menu keyboard for Moderators (Review Appeals, Statistics)
- [x] Create main menu keyboard for Admins (All Active Appeals, Review Appeal, Statistics)
- [x] Implement session-based navigation state management
- [x] Implement back button functionality with callback queries (in moderator review)
- [x] Create middleware to show appropriate menu based on user type
- [x] Handle menu button clicks regardless of session state (fixes restart issue)
- [x] Handle invalid commands and provide helpful messages in user's language
- [x] Implement /menu command to return to main menu

## 7. Appeal Creation & Submission (Telegram-based file storage)
- [x] Implement "Send Appeal" conversation flow for all user types
- [x] For government users: ask if they want to provide custom appeal number
- [x] Accept text message as appeal content
- [x] Accept document attachments (PDF, Word, DOCX, etc.) using Grammy's message.document
- [x] Accept image attachments using Grammy's message.photo
- [x] Accept audio/video files but require text format attachments also
- [x] Extract file metadata (file_id, file_unique_id, mime_type, size, name) using FileService
- [x] Store file metadata in file_jsons JSONB column (not downloading files)
- [x] Validate that appeal has text content OR text-format attachments
- [x] Display validation error if only non-text attachments provided
- [x] Generate unique auto-incrementing appeal number (format: YYYY-NNNNNN)
- [x] Calculate and set due_date using dayjs (+15 days from creation)
- [x] Determine target district based on user type:
  - [x] Individual: user's district
  - [x] Business: bank_account_district
  - [x] Government: user's selected district (NOT central bank)
- [x] Check if user has active appeal before allowing submission
- [x] If user has active appeal, create approval request and notify moderator
- [x] Save appeal record with text and file_jsons to database
- [x] Send confirmation message with appeal number to user
- [ ] Notify all moderators of target district about new appeal (TODO comment exists in code)

## 8. My Appeals Feature
- [x] Implement "My Appeals" menu for users
- [x] List all appeals with status (active and closed)
- [x] Show appeal number, submission date, status
- [x] Show due date in list (via formatDate utility)
- [ ] Implement pagination for appeal list (not urgent - simple lists work fine)
- [ ] Allow users to view detailed appeal information (text, files) with inline buttons
- [ ] Show appeal history (forwarding, extensions, closures)
- [ ] Add button to view appeal answers when closed
- [ ] Send files to user when viewing appeal details

## 9. Moderator Review Appeals
- [x] Implement "Review Appeals" menu for moderators
- [x] Fetch all active appeals for moderator's district
- [x] Sort appeals by nearest deadline first
- [x] Implement inline keyboard with appeal selection
- [x] Display appeal details (number, user info, text, attachments via file_id, due date)
- [x] Send appeal files to moderator using Telegram file_id from file_jsons
- [x] Implement "Close" button with answer flow
- [x] Accept text answer from moderator
- [x] Accept attachment answers from moderator (extract metadata using FileService)
- [x] Save answer to appeal_answers table with text and file_jsons
- [x] Update appeal status to "closed" and set closed_by_moderator_id
- [ ] Send closure notification to appeal creator with answer text and files (TODO in code)
- [x] Implement "Forward" button
- [x] Allow moderator to select target district for forwarding
- [x] Create log entry for forwarding action
- [ ] Notify new district's moderators (TODO in code)
- [ ] Notify original user about forwarding (TODO in code)
- [x] Implement "Extend" button with improved UX (deletes old message, sends new one)
- [x] Allow moderator to set new due date with validation
- [x] Create log entry for extension
- [x] Resend appeal details after extending due date
- [ ] Send notification to user about new due date (TODO in code)
- [ ] Handle approval requests from users wanting to send multiple appeals
- [ ] Allow moderator to approve/reject multiple appeal requests

## 10. Admin Features
- [ ] Implement "All Active Appeals" menu for admins
- [ ] Allow admin to select district filter
- [ ] Show all active appeals for selected district
- [ ] Enable same actions as moderator (Close, Forward, Extend)
- [ ] Implement "Review Appeal" for admin's own district (central bank)
- [ ] Ensure admin can see and act on any district's appeals

## 11. Statistics & Reports
- [ ] Create ReportService with exceljs for Excel generation
- [ ] Design Excel report structure for moderator statistics:
  - [ ] Sheet 1: Summary (total appeals, by status, avg resolution time)
  - [ ] Sheet 2: Active Appeals (list with details)
  - [ ] Sheet 3: Closed Appeals (list with resolution details)
  - [ ] Sheet 4: Appeal Logs (all actions: forwards, extensions, closures)
- [ ] Implement moderator statistics generation (filtered by moderator's district)
- [ ] Design Excel report structure for admin district-specific statistics (same as moderator)
- [ ] Implement admin district statistics generation (any district selection)
- [ ] Design Excel report structure for admin all-appeals statistics:
  - [ ] Summary by district
  - [ ] All active appeals across all districts
  - [ ] Performance metrics by district
  - [ ] Appeal logs across all districts
- [ ] Implement admin all-appeals statistics generation
- [ ] Format dates using dayjs in reports
- [ ] Apply Excel styling (headers, borders, colors) for readability
- [ ] Generate Excel buffer using workbook.xlsx.writeBuffer()
- [ ] Send Excel buffer to moderator/admin using Grammy's replyWithDocument (InputFile.fromBuffer)
- [ ] No file cleanup needed - buffer is sent directly to Telegram

## 12. Appeal Logs & Audit Trail
- [ ] Log all due date changes with old/new dates and moderator info
- [ ] Log all appeal forwards with source/target districts and moderator info
- [ ] Log all appeal closures with moderator info and timestamp
- [ ] Display logs in appeal details view
- [ ] Include logs in statistical reports

## 13. Notifications System
- [ ] Implement notification to moderators when new appeal is assigned
- [ ] Implement notification to user when appeal is forwarded
- [ ] Implement notification to user when appeal due date is extended
- [ ] Implement notification to user when appeal is closed with answer
- [ ] Implement notification to moderators for approval requests
- [ ] Implement notification to user about approval/rejection of multiple appeal request

## 14. Cron Jobs & Scheduled Tasks (Always enabled, 9:00 AM daily, stateless)
- [x] Create CronModule in NestJS for scheduled tasks
- [x] Setup node-cron scheduler service with hardcoded time (9:00 AM)
- [ ] Implement daily job logic to check appeal deadlines
- [ ] Query all active appeals from database
- [ ] For each appeal, calculate days remaining: dayjs(due_date).diff(dayjs(), 'day')
- [ ] Send reminder when days_left = 5, 4, 3, 2, 1, or 0 (overdue)
- [ ] Send reminder message to all moderators assigned to appeal's district
- [ ] Send reminder to admin if appeal is in central bank district
- [ ] Include appeal details in reminder (number, days left, user info)
- [ ] Log cron job execution and errors
- [ ] No tracking needed - just send daily reminders (simple and stateless)

## 15. Appeal Status Management
- [ ] Implement "new" status for newly created appeals
- [ ] Implement "closed" status when moderator closes with answer
- [ ] Implement "approved" status (for multiple appeal requests)
- [ ] Implement "rejected" status (for multiple appeal requests)
- [ ] Add additional statuses as needed (forwarded, extended, overdue)
- [ ] Create utility functions to transition between statuses
- [ ] Validate status transitions

## 16. File Handling (Telegram as storage, buffer-based reports)
- [x] Create FileMetadata interface in common/types
- [x] Implement extractFileMetadata() in FileService to get file_id and metadata
- [x] Implement isTextFormat() to check if file is PDF/Word/text
- [x] Implement validateAppealFiles() for appeal submission validation
- [ ] Implement file sending using bot.api.sendDocument(file_id) from file_jsons
- [ ] Handle file display in appeal details by sending files via file_id
- [x] Use ExcelJS writeBuffer() for report generation
- [ ] Send Excel reports using InputFile.fromBuffer() - no disk I/O

## 17. Error Handling & Validation
- [x] Implement global exception filter for HTTP errors
- [x] Implement BotErrorLogger utility for bot-specific errors
- [x] Add comprehensive error logging with context (user, session, message, etc.)
- [x] Handle session reset after bot restart (menu buttons work regardless of step)
- [x] Add validation for phone numbers (format check)
- [x] Add validation for dates (birth date should be in past)
- [x] Add validation for MFO numbers
- [x] Add validation for full names (minimum length, multiple words)
- [x] Add validation for positions (minimum length)
- [x] Add validation for addresses (minimum length)
- [ ] Add validation for district selections
- [x] Add validation for appeal text (minimum length) via FileService
- [x] Provide user-friendly error messages in both languages
- [x] Log errors for debugging with full stack traces and context

## 18. Security & Permissions
- [ ] Implement role-based access control (RBAC)
- [ ] Ensure users can only see their own appeals
- [ ] Ensure moderators can only see appeals for their district
- [ ] Ensure admins have full access
- [ ] Prevent unauthorized actions (e.g., users closing appeals)
- [ ] Sanitize user inputs to prevent injection attacks
- [ ] Implement rate limiting for appeal submissions

## 20. Documentation
- [ ] Write README.md with project overview
- [ ] Document setup instructions
- [ ] Document environment variables
- [ ] Document database schema
- [ ] Document API/bot commands
- [ ] Create user manual for moderators/admins
- [ ] Document seed data structure
- [ ] Add inline code comments for complex logic

## 21. Testing & Development Tools
- [x] Create migration to make user type nullable (for role switching)
- [x] Implement /reset_account secret command for developers
- [x] Implement resetUserRole() to preserve appeals while switching roles
- [x] Update registration handler to detect users with type=null
- [x] Allow testing different roles without losing created appeals

## 22. Answer Approval & User Feedback System
- [x] Create database migration to add approval tracking fields to appeal_answers table
- [x] Add approval_status (pending, approved, rejected), rejection_reason, approved_at, rejected_at fields
- [x] Update AppealAnswer interface with approval tracking fields
- [x] Add approve/reject buttons when showing closed appeals to users
- [x] Display approval status if answer is already processed
- [x] Implement handleApproveAnswer handler in AppealHandler
- [x] Implement handleRejectAnswer handler with rejection reason input
- [x] Implement handleRejectAnswerReason for processing rejection text
- [x] Add approveAnswer, rejectAnswer, and getAppealDetailsFromAnswerId methods to AppealService
- [x] Implement repository methods: findAnswerById, approveAnswer, rejectAnswer
- [x] Reopen appeal when answer is rejected (change status from "closed" to "new")
- [x] Clear closed_at and closed_by_moderator_id when reopening appeal
- [x] Add notifyModeratorsAboutAnswerRejection method to NotificationService
- [x] Send notification to moderators with rejection reason when answer is rejected
- [x] Update bot types to include "reject_answer_reason" step and "rejectionAnswerId" session field
- [x] Register approve_answer and reject_answer callback handlers in BotService
- [x] Add text handler for rejection reason input
- [x] Build and test the implementation

## 23. Additional Features & Polish
- [ ] Add appeal search functionality by appeal number
- [ ] Implement appeal priority levels (optional)
- [ ] Add appeal categories/types (optional)
- [ ] Implement internal messaging between moderators and users
- [ ] Add data export functionality for compliance
- [ ] Optimize database queries for performance
- [ ] Add caching where appropriate
- [ ] Implement graceful shutdown handling

## 24. NestJS Architecture & Module Organization
- [x] Create AppModule as root module
- [x] Create DatabaseModule for Knex connection and configuration
- [x] Create BotModule for Grammy bot instance and updates
- [x] Create UserModule (service, repository) for user management
- [x] Create DistrictModule (service, repository) for district operations
- [x] Create AppealModule (service, repository) for appeal CRUD operations
- [x] Create ReportModule (service) for statistics and Excel generation
- [x] Create CronModule (service) for scheduled tasks
- [x] Create I18nModule (service) for localization
- [x] Create FileModule (service) for file upload/download handling
- [ ] Create guards for role-based access control (IsModeratorGuard, IsAdminGuard)
- [ ] Create decorators for current user (@CurrentUser())
- [ ] Create DTOs with class-validator for all operations
- [x] Create interfaces/types for entities
- [x] Implement proper dependency injection across modules
- [x] Setup module imports/exports properly

## Notes
- **Tech Stack**: NestJS + Grammy + Knex + PostgreSQL + ExcelJS + Node-Cron + DayJS
- Start with sections 1-5 to get basic infrastructure and registration working
- Then implement sections 6-10 for core appeal functionality
- Sections 11-14 add reporting and automation
- Sections 15-22 are for completion, security, and production readiness
- Section 23 focuses on proper NestJS architecture
- Mark each task as complete with [x] when done
- Add subtasks as needed when implementing complex features
- Use class-validator and class-transformer for all DTOs
- Use dayjs for all date operations
- Use exceljs for all Excel generation
- Use Grammy's session and hydration plugins for state management
