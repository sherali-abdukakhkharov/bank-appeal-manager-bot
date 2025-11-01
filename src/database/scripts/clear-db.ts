import knex from 'knex';
import knexConfig from '../knexfile';

async function clearDatabase() {
  const db = knex(knexConfig);

  try {
    console.log('Clearing all data from database...');

    // Truncate all tables in reverse dependency order
    await db.raw(`
      TRUNCATE TABLE
        appeal_logs,
        appeal_answers,
        appeal_approval_requests,
        appeals,
        user_business_info,
        user_government_info,
        users,
        government_organizations,
        districts
      RESTART IDENTITY CASCADE;
    `);

    console.log('✅ All data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

clearDatabase();
