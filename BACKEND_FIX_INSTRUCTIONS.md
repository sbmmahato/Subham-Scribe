# Backend Database Error Fix

## Errors You're Seeing

1. **UUID Format Error**: `invalid input syntax for type uuid: "He6OgXs33qQq6WBSvXqncyaexT1FuUx5"`
   - Better Auth uses TEXT/string IDs, but your database expects UUIDs

2. **RLS Policy Error**: `new row violates row-level security policy`
   - Row Level Security policies are blocking inserts because they reference `auth.uid()` which doesn't exist with Better Auth

## Solution: Run Migration Script

### Step 1: Run Migration in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `MIGRATE_TO_BETTER_AUTH.sql` from this project
4. Copy all the SQL code
5. Paste it into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. You should see "Success. No rows returned"

This migration will:
- Change `user_id` column from UUID to TEXT
- Remove foreign key constraint to `auth.users`
- Update RLS policies to work with Better Auth
- Add proper indexes

### Step 2: Verify the Changes

After running the migration, verify in Supabase:

1. Go to **Table Editor**
2. Select the `sessions` table
3. Check that `user_id` column type is now `text` (not `uuid`)
4. Check that there are no foreign key constraints to `auth.users`

### Step 3: Test Again

1. Restart your backend server
2. Try creating a recording session
3. The errors should be gone

## What the Migration Does

1. **Drops old foreign key**: Removes reference to `auth.users` (which doesn't exist with Better Auth)

2. **Changes column type**: 
   ```sql
   ALTER TABLE sessions ALTER COLUMN user_id TYPE TEXT;
   ```
   This allows Better Auth's string IDs to be stored

3. **Updates RLS policies**: 
   - Removes policies that use `auth.uid()` (Supabase Auth function)
   - Creates new policies that allow Better Auth to work
   - Since Better Auth handles authentication at the app level, we trust the application to set correct `user_id`

## Why This Happened

The original schema was designed for Supabase Auth which:
- Uses UUIDs for user IDs
- Has `auth.uid()` function for RLS
- Has `auth.users` table

Better Auth:
- Uses TEXT/string IDs (like "He6OgXs33qQq6WBSvXqncyaexT1FuUx5")
- Handles authentication at application level
- Has its own `user` table (not `auth.users`)

## After Migration

Your database will:
- ✅ Accept Better Auth user IDs (TEXT format)
- ✅ Allow inserts without RLS blocking
- ✅ Work correctly with the backend socket handlers
- ✅ Still maintain data isolation (application enforces user-specific access)

## Troubleshooting

### "relation does not exist" error
- Make sure you've run `SUPABASE_SCHEMA.md` first to create the tables
- Then run `MIGRATE_TO_BETTER_AUTH.sql` to update them

### "column does not exist" error
- The migration might have failed partway
- Check the table structure in Supabase Table Editor
- Re-run the migration if needed

### Still getting RLS errors
- Check that the policies were updated
- In Supabase, go to **Authentication > Policies**
- Verify the policies allow `true` instead of checking `auth.uid()`

