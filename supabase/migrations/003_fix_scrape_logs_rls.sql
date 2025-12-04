-- Fix RLS policies for scrape_logs and job_changes to allow inserts
-- Migration: 003_fix_scrape_logs_rls.sql

-- Allow service role to insert into scrape_logs
DROP POLICY IF EXISTS "Service role can insert scrape_logs" ON scrape_logs;
CREATE POLICY "Service role can insert scrape_logs"
ON scrape_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to insert into job_changes
DROP POLICY IF EXISTS "Service role can insert job_changes" ON job_changes;
CREATE POLICY "Service role can insert job_changes"
ON job_changes FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to insert jobs
DROP POLICY IF EXISTS "Service role can insert jobs" ON jobs;
CREATE POLICY "Service role can insert jobs"
ON jobs FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to update jobs
DROP POLICY IF EXISTS "Service role can update jobs" ON jobs;
CREATE POLICY "Service role can update jobs"
ON jobs FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions to service_role (if not already granted)
GRANT ALL ON scrape_logs TO service_role;
GRANT ALL ON job_changes TO service_role;
GRANT ALL ON jobs TO service_role;

COMMENT ON POLICY "Service role can insert scrape_logs" ON scrape_logs IS 'Allow scrapers using service role to log their execution';
COMMENT ON POLICY "Service role can insert jobs" ON jobs IS 'Allow scrapers using service role to insert new jobs';
COMMENT ON POLICY "Service role can update jobs" ON jobs IS 'Allow scrapers using service role to update existing jobs';
