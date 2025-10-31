# Bank Appeal Manager Bot

Telegram bot for managing appeals from citizens and organizations to the bank.

## Features

- Multi-language support (Uzbek/Russian)
- 5 user types: Individual, Business, Government, Moderator, Admin
- Appeal creation with attachments
- Appeal tracking and status management
- Moderator review system with forwarding and deadline extensions
- Statistics and Excel reports
- Automated reminders via cron jobs

## Tech Stack

- **Framework**: NestJS
- **Bot Library**: Grammy with hydrate and storage-free plugins
- **Database**: PostgreSQL with Knex.js
- **Date Handling**: DayJS
- **Reports**: ExcelJS
- **Cron Jobs**: node-cron
- **Validation**: class-validator, class-transformer

## Project Structure

```
src/
├── config/              # Configuration files
├── database/            # Database setup
│   ├── migrations/      # Knex migrations (10 files)
│   ├── seeds/          # Knex seeds (3 files)
│   ├── knexfile.ts     # Knex configuration
│   ├── database.module.ts
│   └── database.service.ts
├── modules/
│   ├── bot/            # Grammy bot integration
│   ├── user/           # User management
│   ├── district/       # District operations
│   ├── appeal/         # Appeal CRUD
│   ├── report/         # Statistics & Excel
│   ├── cron/           # Scheduled tasks
│   ├── file/           # File handling
│   └── i18n/           # Localization
├── common/             # Guards, decorators, utils
│   ├── decorators/
│   ├── guards/
│   ├── middleware/
│   ├── filters/
│   ├── pipes/
│   ├── interceptors/
│   ├── utils/
│   ├── constants/
│   └── types/
├── locales/            # Translation files
│   ├── uz.json        # Uzbek translations
│   └── ru.json        # Russian translations
├── app.module.ts
└── main.ts
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run migrations**:
   ```bash
   npm run migrate:latest
   ```

4. **Run seeds**:
   ```bash
   npm run seed:run
   ```

5. **Start development server**:
   ```bash
   npm run start:dev
   ```

## Database Schema

### Tables Created (10 tables):
- `districts` - District information
- `government_organizations` - Government organization list
- `mfo_numbers` - MFO codes for moderator/admin validation
- `users` - User accounts
- `user_business_info` - Business user additional info
- `user_government_info` - Government user additional info
- `appeals` - Appeal records with file_jsons JSONB column
- `appeal_answers` - Moderator answers with file_jsons JSONB column
- `appeal_logs` - Audit trail for appeal actions
- `appeal_approval_requests` - Requests for multiple appeals

### Zero-Storage Architecture:
**Files:** Stored in Telegram, not on disk. Only file metadata in JSONB:
- `appeals.file_jsons` - Array of FileMetadata objects
- `appeal_answers.file_jsons` - Array of FileMetadata objects
- FileMetadata: file_id, file_unique_id, file_name, file_size, mime_type, file_type

**Reports:** Generated using ExcelJS buffers, sent directly to Telegram - no disk I/O

**Reminders:** Stateless - cron job queries active appeals daily, no tracking needed

## Scripts

- `npm run build` - Build the project
- `npm run start` - Start production server
- `npm run start:dev` - Start development server with watch
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run migrate:make <name>` - Create new migration
- `npm run migrate:latest` - Run migrations
- `npm run migrate:rollback` - Rollback last migration
- `npm run seed:make <name>` - Create new seed
- `npm run seed:run` - Run seeds
- `npm run db:setup` - Run migrations and seeds

## Next Steps

See [todo.md](./todo.md) for the complete list of remaining tasks.

Priority tasks to implement next:
1. User registration flows (Section 5)
2. Menu system and navigation (Section 6)
3. Appeal creation and submission (Section 7)
4. Bot handlers integration

## Environment Variables

See `.env.example` for required environment variables.

Key variables:
- `BOT_TOKEN` - Telegram bot token (required)
- `DB_*` - Database connection settings
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level

**Note:** Cron jobs run daily at 9:00 AM (hardcoded). Bot uses polling mode only.

## License

UNLICENSED
