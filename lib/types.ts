export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  description: string;
  url: string;
  source: string;
  posted_date?: string;
  scraped_at: string;
  first_seen_at?: string;
  last_seen_at?: string;
  is_active?: boolean;
  closed_at?: string;
  scrape_count?: number;
}

export interface SearchParams {
  query?: string;
  location?: string;
  remote?: boolean;
  sources?: string[];
  company?: string;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface SearchResponse {
  jobs: Job[];
  total: number;
  page?: number;
  limit?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
  cached?: boolean;
  lastUpdated?: string;
}

export interface ScrapeLog {
  id: string;
  source: string;
  status: 'success' | 'failed';
  jobs_found: number;
  duration_ms?: number;
  error?: string;
  timestamp: string;
}

export interface JobChange {
  id: string;
  job_id: string;
  changes: Record<string, any>;
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  sources: SourceHealth[];
  timestamp: string;
}

export interface SourceHealth {
  source: string;
  status: 'healthy' | 'unhealthy';
  lastSuccess?: string;
  failureRate: number;
  avgDuration?: number;
}
