-- Company Logos Table
-- This table stores company logo information and metadata

CREATE TABLE IF NOT EXISTS company_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  company_domain TEXT,
  fallback_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast company name lookups
CREATE INDEX IF NOT EXISTS idx_company_logos_name ON company_logos(company_name);
CREATE INDEX IF NOT EXISTS idx_company_logos_domain ON company_logos(company_domain);

-- Enable RLS
ALTER TABLE company_logos ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Allow read access to company_logos" ON company_logos;
CREATE POLICY "Allow read access to company_logos"
ON company_logos FOR SELECT
USING (true);

-- Service role can insert/update
DROP POLICY IF EXISTS "Service role can insert company_logos" ON company_logos;
CREATE POLICY "Service role can insert company_logos"
ON company_logos FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update company_logos" ON company_logos;
CREATE POLICY "Service role can update company_logos"
ON company_logos FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON company_logos TO service_role;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_logos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_company_logos_updated_at ON company_logos;
CREATE TRIGGER trigger_update_company_logos_updated_at
BEFORE UPDATE ON company_logos
FOR EACH ROW
EXECUTE FUNCTION update_company_logos_updated_at();

-- Function to get or create company logo entry
CREATE OR REPLACE FUNCTION get_or_create_company_logo(
  p_company_name TEXT,
  p_company_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  logo_url TEXT,
  company_domain TEXT,
  fallback_color TEXT
) AS $$
BEGIN
  -- Try to get existing company logo
  RETURN QUERY
  SELECT cl.id, cl.company_name, cl.logo_url, cl.company_domain, cl.fallback_color
  FROM company_logos cl
  WHERE cl.company_name = p_company_name;

  -- If not found, insert new entry
  IF NOT FOUND THEN
    RETURN QUERY
    INSERT INTO company_logos (company_name, company_domain)
    VALUES (p_company_name, p_company_domain)
    RETURNING id, company_name, logo_url, company_domain, fallback_color;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE company_logos IS 'Stores company logo URLs and metadata for display';
COMMENT ON FUNCTION get_or_create_company_logo IS 'Gets existing company logo or creates new entry if not found';
