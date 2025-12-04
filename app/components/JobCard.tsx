import type { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <div className="ascii-box p-6 hover:shadow-lg hover:shadow-terminal-border/50 transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl mb-2">
            ▶ {job.title}
          </h3>
          <p className="text-terminal-dim mb-1">
            ├─ Company: {job.company}
          </p>
          <p className="text-terminal-dim mb-1">
            ├─ Location: {job.location} {job.remote && "| 🏠 Remote"}
          </p>
          {job.salary && (
            <p className="text-terminal-dim mb-1">
              ├─ Salary: {job.salary}
            </p>
          )}
          <p className="text-terminal-dim mb-1">
            └─ Source: {job.source.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="border-t border-terminal-border pt-4 mb-4">
        <p className="text-sm text-terminal-dim line-clamp-3">
          {job.description}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-terminal-dim">
          {job.posted_date ? `Posted: ${new Date(job.posted_date).toLocaleDateString()}` : ""}
        </span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-terminal-border px-4 py-2 hover:bg-terminal-text hover:text-terminal-bg transition-colors"
        >
          [ VIEW JOB → ]
        </a>
      </div>
    </div>
  );
}
