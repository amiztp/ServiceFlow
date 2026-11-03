import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionButton, StatusBadge, SurfaceCard, EmptyState } from "../../components";
import { mockJobs, type Job, type JobState } from "../../mocks/data";

const jobStatus = (s: JobState): "awaiting" | "scheduled" | "in_progress" | "completed" => {
  if (s === "JOB_CREATED") return "awaiting";
  if (s === "SCHEDULE_PROPOSED") return "awaiting";
  if (s === "SCHEDULE_CONFIRMED") return "scheduled";
  if (s === "IN_PROGRESS") return "in_progress";
  return "completed";
};

const formatTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const formatDayHeading = (dateKey: string) => {
  const d = new Date(dateKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateKey);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const dayLabel = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (diff === 0) return `Today · ${dayLabel}`;
  if (diff === 1) return `Tomorrow · ${dayLabel}`;
  if (diff === -1) return `Yesterday · ${dayLabel}`;
  if (diff < 0) return `${dayLabel} (past)`;
  return dayLabel;
};

export default function ManagerSchedule() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  const now = new Date();
  const withSchedule = mockJobs.filter((job) => job.startTime);
  const filtered = withSchedule.filter((job) => {
    if (filter === "all") return true;
    const time = new Date(job.startTime!).getTime();
    if (filter === "upcoming") return time >= now.getTime();
    return time < now.getTime();
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime(),
  );

  const groups: Record<string, Job[]> = {};
  sorted.forEach((job) => {
    const key = new Date(job.startTime!).toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(job);
  });

  const groupKeys = Object.keys(groups);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="sf-display text-2xl font-bold">Schedule</h1>

        <div className="flex gap-1 border border-line rounded-docket p-1">
          {(["upcoming", "past", "all"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`px-3 py-1.5 text-sm rounded-docket capitalize ${
                filter === option ? "bg-graphite text-white" : "hover:bg-paper"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {groupKeys.length === 0 ? (
        <EmptyState
          title={`No ${filter} appointments`}
          description="Scheduled jobs appear here grouped by day."
        />
      ) : (
        <div className="space-y-6">
          {groupKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="sf-display font-semibold text-lg">{formatDayHeading(dateKey)}</h2>
                <span className="sf-mono text-xs text-text-secondary">
                  {groups[dateKey].length} job{groups[dateKey].length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="space-y-2">
                {groups[dateKey].map((job) => (
                  <SurfaceCard key={job.id} className="p-4 flex flex-wrap items-center gap-3">
                    <div className="sf-mono text-sm font-semibold min-w-16">
                      {formatTime(job.startTime)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{job.serviceName}</p>
                      <p className="text-sm text-text-secondary">
                        {job.clientName}
                        {job.employeeName && ` · ${job.employeeName}`}
                      </p>
                    </div>
                    <StatusBadge status={jobStatus(job.state)} />
                    <ActionButton
                      variant="stub"
                      size="small"
                      onClick={() => navigate("/manager/jobs")}
                    >
                      Open
                    </ActionButton>
                  </SurfaceCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
