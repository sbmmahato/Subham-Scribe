/**
 * Better Auth configuration
 * Handles authentication using Supabase PostgreSQL database
 */

import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Get database connection string
// For Supabase, you need the direct PostgreSQL connection string
// Find it in: Supabase Dashboard > Settings > Database > Connection string > URI
// Format: postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not configured. Better Auth will not work.');
  console.error('   Please set DATABASE_URL in your .env.local file.');
  console.error('   Get it from: Supabase Dashboard > Settings > Database > Connection string > URI');
  console.error('   Format: postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres');
} else {
  // Validate connection string format
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error('❌ DATABASE_URL format is incorrect.');
    console.error('   Expected format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres');
    console.error('   Current value starts with:', databaseUrl.substring(0, 20) + '...');
  } else {
    // Log connection info (without password) for debugging
    try {
      const url = new URL(databaseUrl);
      console.log('✅ DATABASE_URL configured');
      console.log('   Host:', url.hostname);
      console.log('   Database:', url.pathname);
    } catch (e) {
      console.error('❌ DATABASE_URL is not a valid URL:', e);
    }
  }
}

// Create database connection pool
let pool: Pool | undefined;
if (databaseUrl) {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
      // Add connection timeout and retry logic
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      // Retry connection on failure
      max: 5, // Maximum number of clients in the pool
    });

    // Test connection on startup
    pool.on('error', (err) => {
      console.error('❌ Database connection error:', err.message);
      if (err.message.includes('ENOTFOUND')) {
        console.error('   DNS resolution failed - hostname cannot be found');
        console.error('   This usually means:');
        console.error('   1. The connection string hostname is incorrect');
        console.error('   2. Your Supabase project reference is wrong');
        console.error('   3. The project might be paused or deleted');
        console.error('   Solution: Get a fresh connection string from Supabase Dashboard');
      }
      console.error('   Check your DATABASE_URL in .env.local');
    });

    // Test connection asynchronously (don't block startup)
    pool.query('SELECT 1').catch((err) => {
      console.error('❌ Database connection test failed:', err.message);
      if (err.message.includes('ENOTFOUND')) {
        console.error('   ⚠️  Cannot resolve database hostname');
        console.error('   Please verify your DATABASE_URL connection string');
        console.error('   Get it from: Supabase Dashboard > Settings > Database > Connection string > URI');
      }
    });
  } catch (error) {
    console.error('❌ Failed to create database pool:', error);
    console.error('   Check your DATABASE_URL format in .env.local');
  }
}

if (!pool) {
  throw new Error(
    'Better Auth database connection not configured. ' +
    'Please set DATABASE_URL in your .env.local file. ' +
    'Get it from: Supabase Dashboard > Settings > Database > Connection string > URI'
  );
}

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want email verification
  },
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  basePath: "/api/auth",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    process.env.CORS_ORIGIN || "http://localhost:3000",
  ],
});

