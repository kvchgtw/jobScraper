"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: string;
  url: string;
  scraped_at: string;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState("");
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Read URL parameters on mount to support company navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('q');
    const locationParam = params.get('location');

    if (queryParam) {
      setSearchQuery(queryParam);
      setDebouncedSearchQuery(queryParam);
    }
    if (locationParam) {
      setLocationQuery(locationParam);
      setDebouncedLocationQuery(locationParam);
    }
  }, []);

  // Debounce search queries to prevent rate limiting
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLocationQuery(locationQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [locationQuery]);

  // Fetch jobs with debounced queries
  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      const params = new URLSearchParams();

      if (debouncedSearchQuery) params.append('q', debouncedSearchQuery);
      if (debouncedLocationQuery) params.append('location', debouncedLocationQuery);
      params.append('limit', '50');

      try {
        const response = await fetch(`/api/search?${params.toString()}`);
        const data = await response.json();

        if (response.status === 429) {
          console.error('Rate limit exceeded:', data.error);
          // Optionally show error to user
          return;
        }

        setJobs(data.jobs || []);
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore || false);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [debouncedSearchQuery, debouncedLocationQuery]);

  // Load more jobs
  const loadMoreJobs = async () => {
    if (!hasMore || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    const params = new URLSearchParams();

    if (debouncedSearchQuery) params.append('q', debouncedSearchQuery);
    if (debouncedLocationQuery) params.append('location', debouncedLocationQuery);
    params.append('limit', '50');
    params.append('cursor', nextCursor);

    try {
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      if (response.status === 429) {
        console.error('Rate limit exceeded:', data.error);
        return;
      }

      setJobs((prevJobs) => [...prevJobs, ...(data.jobs || [])]);
      setNextCursor(data.nextCursor || null);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error loading more jobs:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 172800) return 'Yesterday';
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const toggleBookmark = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const getCompanyIcon = (company: string) => {
    const firstLetter = company.charAt(0).toUpperCase();
    return firstLetter;
  };

  const getRandomColor = (company: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const index = company.length % colors.length;
    return colors[index];
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
            <Link href="/" className="text-gray-900 font-semibold" style={{ color: '#F4A460' }}>
              Find Jobs
            </Link>
            <Link href="/companies" className="text-gray-700 hover:text-gray-900 font-medium">
              Companies
            </Link>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Resources</a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              <span className="text-sm">👤</span>
            </div>
            <div className="relative">
              <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-lg">🔔</span>
              </button>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                1
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6" style={{ border: '1px solid #F5E6D3' }}>
          <div className="flex gap-4">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: '#E5D5C0' }}>
              <span className="text-gray-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keywords, Job Title, or Company"
                className="flex-1 outline-none text-gray-700 placeholder-gray-400"
              />
            </div>

            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: '#E5D5C0' }}>
              <span className="text-gray-400">📍</span>
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Location or Remote"
                className="flex-1 outline-none text-gray-700 placeholder-gray-400"
              />
            </div>

            <button
              className="px-8 py-3 rounded-xl font-semibold text-gray-800 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FFD700' }}
            >
              Search
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-gray-600">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 text-gray-600">No jobs found. Try a different search!</div>
          ) : (
            <>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="job-card"
                  onClick={() => window.open(job.url, '_blank')}
                >
                  <div className="flex items-start gap-4">
                    {/* Company Icon */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                      style={{ backgroundColor: getRandomColor(job.company) }}
                    >
                      {getCompanyIcon(job.company)}
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
                          <p className="text-gray-700 mb-2">{job.company}</p>

                          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-600">
                            {job.remote && (
                              <span className="remote-badge">Remote</span>
                            )}
                            <span>{job.location || 'Full-time'}</span>
                            <span>{timeAgo(job.scraped_at)}</span>
                          </div>
                        </div>

                        {/* Salary & Bookmark */}
                        <div className="flex items-start gap-3">
                          {job.salary && (
                            <div className="text-right">
                              <p className="text-gray-900 font-semibold">{job.salary}</p>
                              <p className="text-xs text-gray-500">/ year</p>
                            </div>
                          )}

                          <button
                            className="bookmark-btn"
                            onClick={(e) => toggleBookmark(job.id, e)}
                          >
                            <span className="text-lg">
                              {bookmarked.has(job.id) ? '🔖' : '🏷️'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-6 pb-4">
                  <button
                    onClick={loadMoreJobs}
                    disabled={loadingMore}
                    className="px-8 py-3 rounded-xl font-semibold text-gray-800 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#FFD700' }}
                  >
                    {loadingMore ? 'Loading...' : 'Load More Jobs'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Showing {jobs.length} jobs
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t" style={{ borderColor: '#F5E6D3' }}>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2024 JOB SCRAPER. All rights reserved.</p>

            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-gray-900">Find Jobs</Link>
              <Link href="/companies" className="hover:text-gray-900">Companies</Link>
              <a href="#" className="hover:text-gray-900">Resources</a>

              <div className="flex items-center gap-3 ml-4">
                <a href="#" className="hover:opacity-70">𝕏</a>
                <a href="#" className="hover:opacity-70">📘</a>
                <a href="#" className="hover:opacity-70">📷</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
