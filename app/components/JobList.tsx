import type { Job } from "@/lib/types";
import JobCard from "./JobCard";

interface JobListProps {
  jobs: Job[];
  loading: boolean;
}

export default function JobList({ jobs, loading }: JobListProps) {
  if (loading) {
    return (
      <div className="ascii-box p-8 text-center">
        <pre className="text-terminal-text animate-pulse">
{`
    ░░░░░░░░░░░░░░░░░░░░
    ░░ SCANNING JOBS ░░
    ░░░░░░░░░░░░░░░░░░░░

    [████████░░░░░░░░] 50%
`}
        </pre>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="ascii-box p-8 text-center">
        <pre className="text-terminal-dim">
{`
    ┌─────────────────────────┐
    │  NO RESULTS FOUND       │
    │                         │
    │  Try different keywords │
    └─────────────────────────┘
`}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-terminal-border pb-2 mb-4">
        <h2 className="text-xl">
          └─[ RESULTS: {jobs.length} OPPORTUNITIES FOUND ]
        </h2>
      </div>

      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
