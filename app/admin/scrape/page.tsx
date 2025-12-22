"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ScrapeResult {
  success: boolean;
  message: string;
  data?: {
    jobsFound: number;
    jobsUpserted: number;
    jobsMarkedInactive: number;
    durationMs: number;
  };
  error?: string;
}

interface ScraperStatus {
  activeJobs: number;
  inactiveJobs: number;
  lastScrape: {
    timestamp: string;
    status: string;
    jobsFound: number;
    duration: number;
    error?: string;
  } | null;
  recentScrapes: Array<{
    timestamp: string;
    status: string;
    jobsFound: number;
    duration: number;
  }>;
}

export default function ScrapePage() {
  const [greenhouseLoading, setGreenhouseLoading] = useState(false);
  const [ashbyLoading, setAshbyLoading] = useState(false);
  const [leverLoading, setLeverLoading] = useState(false);
  const [greenhouseResult, setGreenhouseResult] = useState<ScrapeResult | null>(null);
  const [ashbyResult, setAshbyResult] = useState<ScrapeResult | null>(null);
  const [leverResult, setLeverResult] = useState<ScrapeResult | null>(null);
  const [greenhouseStatus, setGreenhouseStatus] = useState<ScraperStatus | null>(null);
  const [ashbyStatus, setAshbyStatus] = useState<ScraperStatus | null>(null);
  const [leverStatus, setLeverStatus] = useState<ScraperStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Fetch scraper status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const [greenhouseRes, ashbyRes, leverRes] = await Promise.all([
        fetch('/api/scrape/greenhouse'),
        fetch('/api/scrape/ashby'),
        fetch('/api/scrape/lever')
      ]);

      const greenhouseData = await greenhouseRes.json();
      const ashbyData = await ashbyRes.json();
      const leverData = await leverRes.json();

      if (greenhouseData.success) {
        setGreenhouseStatus(greenhouseData.data);
      }

      if (ashbyData.success) {
        setAshbyStatus(ashbyData.data);
      }

      if (leverData.success) {
        setLeverStatus(leverData.data);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const runGreenhouse = async () => {
    setGreenhouseLoading(true);
    setGreenhouseResult(null);

    try {
      const response = await fetch('/api/scrape/greenhouse', {
        method: 'POST',
      });
      const data = await response.json();
      setGreenhouseResult(data);
      // Refresh status after scrape
      fetchStatus();
    } catch (error: any) {
      setGreenhouseResult({
        success: false,
        message: 'Failed to run scraper',
        error: error.message,
      });
    } finally {
      setGreenhouseLoading(false);
    }
  };

  const runAshby = async () => {
    setAshbyLoading(true);
    setAshbyResult(null);

    try {
      const response = await fetch('/api/scrape/ashby', {
        method: 'POST',
      });
      const data = await response.json();
      setAshbyResult(data);
      // Refresh status after scrape
      fetchStatus();
    } catch (error: any) {
      setAshbyResult({
        success: false,
        message: 'Failed to run scraper',
        error: error.message,
      });
    } finally {
      setAshbyLoading(false);
    }
  };

  const runLever = async () => {
    setLeverLoading(true);
    setLeverResult(null);

    try {
      const response = await fetch('/api/scrape/lever', {
        method: 'POST',
      });
      const data = await response.json();
      setLeverResult(data);
      // Refresh status after scrape
      fetchStatus();
    } catch (error: any) {
      setLeverResult({
        success: false,
        message: 'Failed to run scraper',
        error: error.message,
      });
    } finally {
      setLeverLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF9F0' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#FFF9F0', borderColor: '#F5E6D3' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-2xl font-bold" style={{ color: '#F4A460' }}>
              JOB SCRAPER
            </Link>
          </div>

          <nav className="flex items-center gap-8">
            <Link href="/" className="text-gray-700 hover:text-gray-900 font-medium">
              Find Jobs
            </Link>
            <Link href="/companies" className="text-gray-700 hover:text-gray-900 font-medium">
              Companies
            </Link>
            <Link href="/admin/scrape" className="text-gray-900 font-semibold" style={{ color: '#F4A460' }}>
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Job Scraper Admin</h1>
        <p className="text-gray-600 mb-8">Manually trigger job scrapers and view results</p>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Important Notes</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Scrapers can take several minutes to complete</li>
                <li>• Don't close this page while scraping is in progress</li>
                <li>• In production, use scheduled cron jobs instead</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status Dashboard */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">📊 Scraper Status</h2>
            <button
              onClick={fetchStatus}
              className="px-4 py-2 text-sm rounded-lg border transition-colors"
              style={{ borderColor: '#E5D5C0', color: '#F4A460' }}
            >
              🔄 Refresh
            </button>
          </div>

          {statusLoading ? (
            <div className="text-center py-8 text-gray-600">Loading status...</div>
          ) : (
            <>
              {/* Total Jobs Card */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-sm border-2 mb-6" style={{ borderColor: '#FFD700' }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Total Jobs Overview</h3>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Active Jobs */}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
                        <p className="text-4xl font-bold" style={{ color: '#F4A460' }}>
                          {((greenhouseStatus?.activeJobs || 0) +
                            (ashbyStatus?.activeJobs || 0) +
                            (leverStatus?.activeJobs || 0)).toLocaleString()}
                        </p>
                        <div className="mt-2 flex gap-3 text-sm text-gray-600">
                          <span>🌱 {(greenhouseStatus?.activeJobs || 0).toLocaleString()}</span>
                          <span>🚀 {(ashbyStatus?.activeJobs || 0).toLocaleString()}</span>
                          <span>🎯 {(leverStatus?.activeJobs || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Inactive Jobs */}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Inactive Jobs</p>
                        <p className="text-4xl font-bold text-gray-500">
                          {((greenhouseStatus?.inactiveJobs || 0) +
                            (ashbyStatus?.inactiveJobs || 0) +
                            (leverStatus?.inactiveJobs || 0)).toLocaleString()}
                        </p>
                        <div className="mt-2 flex gap-3 text-sm text-gray-500">
                          <span>🌱 {(greenhouseStatus?.inactiveJobs || 0).toLocaleString()}</span>
                          <span>🚀 {(ashbyStatus?.inactiveJobs || 0).toLocaleString()}</span>
                          <span>🎯 {(leverStatus?.inactiveJobs || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-6xl ml-6">💼</div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Greenhouse Status */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#F5E6D3' }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🌱</span>
                  <h3 className="text-lg font-bold text-gray-900">Greenhouse</h3>
                </div>

                {greenhouseStatus ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: '#F5E6D3' }}>
                      <span className="text-gray-600">Active Jobs</span>
                      <span className="font-bold text-lg" style={{ color: '#F4A460' }}>
                        {greenhouseStatus.activeJobs.toLocaleString()}
                      </span>
                    </div>

                    {greenhouseStatus.lastScrape ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Last Scrape</span>
                          <span className="text-sm text-gray-900">
                            {formatTimestamp(greenhouseStatus.lastScrape.timestamp)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Status</span>
                          <span className={`text-sm font-medium ${
                            greenhouseStatus.lastScrape.status === 'success'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {greenhouseStatus.lastScrape.status === 'success' ? '✅ Success' : '❌ Failed'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Jobs Found</span>
                          <span className="text-sm text-gray-900">
                            {greenhouseStatus.lastScrape.jobsFound}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Duration</span>
                          <span className="text-sm text-gray-900">
                            {formatDuration(greenhouseStatus.lastScrape.duration)}
                          </span>
                        </div>

                        {greenhouseStatus.lastScrape.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                            {greenhouseStatus.lastScrape.error}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No scrapes yet</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Failed to load status</p>
                )}
              </div>

              {/* Ashby Status */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#F5E6D3' }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🚀</span>
                  <h3 className="text-lg font-bold text-gray-900">Ashby</h3>
                </div>

                {ashbyStatus ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: '#F5E6D3' }}>
                      <span className="text-gray-600">Active Jobs</span>
                      <span className="font-bold text-lg" style={{ color: '#F4A460' }}>
                        {ashbyStatus.activeJobs.toLocaleString()}
                      </span>
                    </div>

                    {ashbyStatus.lastScrape ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Last Scrape</span>
                          <span className="text-sm text-gray-900">
                            {formatTimestamp(ashbyStatus.lastScrape.timestamp)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Status</span>
                          <span className={`text-sm font-medium ${
                            ashbyStatus.lastScrape.status === 'success'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {ashbyStatus.lastScrape.status === 'success' ? '✅ Success' : '❌ Failed'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Jobs Found</span>
                          <span className="text-sm text-gray-900">
                            {ashbyStatus.lastScrape.jobsFound}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Duration</span>
                          <span className="text-sm text-gray-900">
                            {formatDuration(ashbyStatus.lastScrape.duration)}
                          </span>
                        </div>

                        {ashbyStatus.lastScrape.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                            {ashbyStatus.lastScrape.error}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No scrapes yet</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Failed to load status</p>
                )}
              </div>

              {/* Lever Status */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#F5E6D3' }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🎯</span>
                  <h3 className="text-lg font-bold text-gray-900">Lever</h3>
                </div>

                {leverStatus ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: '#F5E6D3' }}>
                      <span className="text-gray-600">Active Jobs</span>
                      <span className="font-bold text-lg" style={{ color: '#F4A460' }}>
                        {leverStatus.activeJobs.toLocaleString()}
                      </span>
                    </div>

                    {leverStatus.lastScrape ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Last Scrape</span>
                          <span className="text-sm text-gray-900">
                            {formatTimestamp(leverStatus.lastScrape.timestamp)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Status</span>
                          <span className={`text-sm font-medium ${
                            leverStatus.lastScrape.status === 'success'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {leverStatus.lastScrape.status === 'success' ? '✅ Success' : '❌ Failed'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Jobs Found</span>
                          <span className="text-sm text-gray-900">
                            {leverStatus.lastScrape.jobsFound}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Duration</span>
                          <span className="text-sm text-gray-900">
                            {formatDuration(leverStatus.lastScrape.duration)}
                          </span>
                        </div>

                        {leverStatus.lastScrape.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                            {leverStatus.lastScrape.error}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No scrapes yet</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Failed to load status</p>
                )}
              </div>
            </div>
            </>
          )}
        </div>

        {/* Scraper Cards */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 Manual Scraping</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Greenhouse Scraper */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#F5E6D3' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Greenhouse</h2>
              <span className="text-3xl">🌱</span>
            </div>

            <p className="text-gray-600 mb-4">
              Scrapes 50+ companies using Greenhouse ATS including Stripe, Figma, Dropbox, and more.
            </p>

            <button
              onClick={runGreenhouse}
              disabled={greenhouseLoading}
              className="w-full px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: greenhouseLoading ? '#E5D5C0' : '#FFD700',
                color: '#1F2937',
              }}
            >
              {greenhouseLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Running Scraper...
                </span>
              ) : (
                'Run Greenhouse Scraper'
              )}
            </button>

            {/* Greenhouse Results */}
            {greenhouseResult && (
              <div className={`mt-4 p-4 rounded-lg ${greenhouseResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`font-semibold mb-2 ${greenhouseResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {greenhouseResult.success ? '✅ Success' : '❌ Failed'}
                </h3>

                {greenhouseResult.success && greenhouseResult.data && (
                  <div className="text-sm space-y-1 text-green-800">
                    <p>📊 Jobs Found: <strong>{greenhouseResult.data.jobsFound}</strong></p>
                    <p>💾 Jobs Upserted: <strong>{greenhouseResult.data.jobsUpserted}</strong></p>
                    <p>🔴 Jobs Marked Inactive: <strong>{greenhouseResult.data.jobsMarkedInactive}</strong></p>
                    <p>⏱️ Duration: <strong>{formatDuration(greenhouseResult.data.durationMs)}</strong></p>
                  </div>
                )}

                {!greenhouseResult.success && (
                  <p className="text-sm text-red-800">
                    {greenhouseResult.error || greenhouseResult.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Ashby Scraper */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#F5E6D3' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Ashby</h2>
              <span className="text-3xl">🚀</span>
            </div>

            <p className="text-gray-600 mb-4">
              Scrapes 49+ companies using Ashby ATS including Anthropic, OpenAI, Replit, and more.
            </p>

            <button
              onClick={runAshby}
              disabled={ashbyLoading}
              className="w-full px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: ashbyLoading ? '#E5D5C0' : '#FFD700',
                color: '#1F2937',
              }}
            >
              {ashbyLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Running Scraper...
                </span>
              ) : (
                'Run Ashby Scraper'
              )}
            </button>

            {/* Ashby Results */}
            {ashbyResult && (
              <div className={`mt-4 p-4 rounded-lg ${ashbyResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`font-semibold mb-2 ${ashbyResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {ashbyResult.success ? '✅ Success' : '❌ Failed'}
                </h3>

                {ashbyResult.success && ashbyResult.data && (
                  <div className="text-sm space-y-1 text-green-800">
                    <p>📊 Jobs Found: <strong>{ashbyResult.data.jobsFound}</strong></p>
                    <p>💾 Jobs Upserted: <strong>{ashbyResult.data.jobsUpserted}</strong></p>
                    <p>🔴 Jobs Marked Inactive: <strong>{ashbyResult.data.jobsMarkedInactive}</strong></p>
                    <p>⏱️ Duration: <strong>{formatDuration(ashbyResult.data.durationMs)}</strong></p>
                  </div>
                )}

                {!ashbyResult.success && (
                  <p className="text-sm text-red-800">
                    {ashbyResult.error || ashbyResult.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lever Scraper */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#F5E6D3' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Lever</h2>
              <span className="text-3xl">🎯</span>
            </div>

            <p className="text-gray-600 mb-4">
              Scrapes 29+ companies using Lever ATS including Spotify, Plaid, Palantir, and more.
            </p>

            <button
              onClick={runLever}
              disabled={leverLoading}
              className="w-full px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: leverLoading ? '#E5D5C0' : '#FFD700',
                color: '#1F2937',
              }}
            >
              {leverLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Running Scraper...
                </span>
              ) : (
                'Run Lever Scraper'
              )}
            </button>

            {/* Lever Results */}
            {leverResult && (
              <div className={`mt-4 p-4 rounded-lg ${leverResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`font-semibold mb-2 ${leverResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {leverResult.success ? '✅ Success' : '❌ Failed'}
                </h3>

                {leverResult.success && leverResult.data && (
                  <div className="text-sm space-y-1 text-green-800">
                    <p>📊 Jobs Found: <strong>{leverResult.data.jobsFound}</strong></p>
                    <p>💾 Jobs Upserted: <strong>{leverResult.data.jobsUpserted}</strong></p>
                    <p>🔴 Jobs Marked Inactive: <strong>{leverResult.data.jobsMarkedInactive}</strong></p>
                    <p>⏱️ Duration: <strong>{formatDuration(leverResult.data.durationMs)}</strong></p>
                  </div>
                )}

                {!leverResult.success && (
                  <p className="text-sm text-red-800">
                    {leverResult.error || leverResult.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#F5E6D3' }}>
          <h3 className="text-xl font-bold text-gray-900 mb-4">📚 How to Use</h3>

          <div className="space-y-4 text-gray-700">
            <div>
              <h4 className="font-semibold mb-2">1. Manual Scraping (This Page)</h4>
              <p className="text-sm">Click the buttons above to manually trigger scrapers during development.</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Using curl (Terminal)</h4>
              <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">
                curl -X POST http://localhost:3000/api/scrape/greenhouse
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Production (Automated)</h4>
              <p className="text-sm mb-2">Set up Vercel Cron Jobs to run scrapers automatically:</p>
              <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">
{`// vercel.json
{
  "crons": [
    {
      "path": "/api/scrape/greenhouse",
      "schedule": "0 2 * * *"  // 2 AM daily
    },
    {
      "path": "/api/scrape/ashby",
      "schedule": "0 3 * * *"  // 3 AM daily
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
