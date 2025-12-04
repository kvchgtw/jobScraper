"use client";

import { useState } from "react";
import JobList from "./JobList";
import type { Job } from "@/lib/types";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      // Search the database directly (jobs are kept up-to-date by cron jobs)
      const params = new URLSearchParams({
        query,
        ...(location && { location }),
        ...(remoteOnly && { remote: "true" }),
      });

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Search failed:", error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="ascii-box p-6 mb-8">
        <div className="border-b border-terminal-border pb-2 mb-4">
          <h2 className="text-xl">┌─[ SEARCH PARAMETERS ]</h2>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block mb-2">
              └─▶ Keywords:
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Product Manager, Software Engineer..."
              className="w-full bg-black border border-terminal-border p-3 text-terminal-text focus:outline-none focus:border-terminal-text placeholder-terminal-dim"
              required
            />
          </div>

          <div>
            <label className="block mb-2">
              └─▶ Location:
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Taiwan, Remote, Taipei..."
              className="w-full bg-black border border-terminal-border p-3 text-terminal-text focus:outline-none focus:border-terminal-text placeholder-terminal-dim"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="remote"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="remote" className="cursor-pointer">
              └─▶ Remote Only
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-terminal-bg border-2 border-terminal-border p-3 hover:bg-terminal-text hover:text-terminal-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "[ SEARCHING... ]" : "[ EXECUTE SEARCH ]"}
          </button>
        </form>
      </div>

      {searched && <JobList jobs={jobs} loading={loading} />}
    </div>
  );
}
