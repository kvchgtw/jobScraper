-- Job Aggregator Database Schema
--
-- This schema defines the complete database structure for the job aggregation platform
-- including tables for jobs, scrape logs, job change history, and analytics views

-- ============================================================================
-- JOBS TABLE
-- ============================================================================

-- Add job lifecycle tracking columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scrape_count INTEGER DEFAULT 1;

-- Add salary range fields
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'USD';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_company_active ON jobs(company) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_location_active ON jobs(location) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_remote_active ON jobs(remote) WHERE is_active = true AND remote = true;
CREATE INDEX IF NOT EXISTS idx_jobs_source_url ON jobs(source, url);
CREATE INDEX IF NOT EXISTS idx_jobs_source_active ON jobs(source, is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs(scraped_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_jobs_search
ON jobs USING GIN(to_tsvector('english', title || ' ' || description || ' ' || company));

-- ============================================================================
-- SCRAPE LOGS TABLE
-- ============================================================================

-- Table for monitoring scraper execution
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  jobs_found INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_source ON scrape_logs(source, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_timestamp ON scrape_logs(timestamp DESC);

-- ============================================================================
-- JOB CHANGES TABLE
-- ============================================================================

-- Table for tracking job posting changes over time
CREATE TABLE IF NOT EXISTS job_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  changes JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_changes_job_id ON job_changes(job_id, timestamp DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_changes ENABLE ROW LEVEL SECURITY;

-- Public read access policies
DROP POLICY IF EXISTS "Allow read access to scrape_logs" ON scrape_logs;
CREATE POLICY "Allow read access to scrape_logs"
ON scrape_logs FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow read access to job_changes" ON job_changes;
CREATE POLICY "Allow read access to job_changes"
ON job_changes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow read access to jobs" ON jobs;
DROP POLICY IF EXISTS "Allow read access to active jobs" ON jobs;
CREATE POLICY "Allow read access to active jobs"
ON jobs FOR SELECT
USING (is_active = true);

-- Service role permissions (for scrapers)
DROP POLICY IF EXISTS "Service role can read all jobs" ON jobs;
CREATE POLICY "Service role can read all jobs"
ON jobs FOR SELECT
TO service_role
USING (true);

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

-- Grant table permissions to service_role
GRANT ALL ON scrape_logs TO service_role;
GRANT ALL ON job_changes TO service_role;
GRANT ALL ON jobs TO service_role;

-- ============================================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================================================

-- Automatically update last_seen_at and scrape_count on job updates
CREATE OR REPLACE FUNCTION update_last_seen_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = NOW();
  NEW.scrape_count = COALESCE(OLD.scrape_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to jobs table
DROP TRIGGER IF EXISTS trigger_update_last_seen_at ON jobs;
CREATE TRIGGER trigger_update_last_seen_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_last_seen_at();

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- Job statistics aggregated by source
CREATE OR REPLACE VIEW job_stats AS
SELECT
  source,
  COUNT(*) FILTER (WHERE is_active = true) as active_jobs,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_jobs,
  COUNT(DISTINCT company) as companies,
  MAX(scraped_at) as last_scraped
FROM jobs
GROUP BY source;

-- ============================================================================
-- TABLE & VIEW DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE jobs IS 'Main jobs table with lifecycle tracking';
COMMENT ON TABLE scrape_logs IS 'Logs for scraper execution monitoring';
COMMENT ON TABLE job_changes IS 'Tracks changes to job postings over time';
COMMENT ON VIEW job_stats IS 'Analytics view for job statistics by source';
COMMENT ON POLICY "Service role can insert scrape_logs" ON scrape_logs IS 'Allow scrapers using service role to log their execution';
COMMENT ON POLICY "Service role can insert jobs" ON jobs IS 'Allow scrapers using service role to insert new jobs';
COMMENT ON POLICY "Service role can update jobs" ON jobs IS 'Allow scrapers using service role to update existing jobs';
