import { useNavigate } from "react-router-dom";
import { ActionButton, SurfaceCard } from "../../components";
import { mockRequests, mockJobs, mockInvoices, mockCompanies } from "../../mocks/data";

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const newRequests = mockRequests.filter((request) => request.state === "NEW").length;
  const scheduledJobs = mockJobs.filter((job) => job.state === "SCHEDULE_CONFIRMED").length;
  const inProgress = mockJobs.filter((job) => job.state === "IN_PROGRESS").length;
  const unpaidInvoices = mockInvoices.filter((invoice) => invoice.state === "UNPAID");
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const pendingCompanies = mockCompanies.filter((company) => company.state === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sf-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          BrightFix — overview of today's work
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SurfaceCard className="p-5 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            New requests
          </p>
          <p className="sf-tabular font-semibold text-2xl leading-tight mt-2">{newRequests}</p>
          <p className="text-xs text-text-secondary mt-1">
            {newRequests === 0 ? "All caught up" : "Awaiting response"}
          </p>
          <div className="mt-3">
            <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/requests")}>
              View requests →
            </ActionButton>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Scheduled jobs
          </p>
          <p className="sf-tabular font-semibold text-2xl leading-tight mt-2">{scheduledJobs}</p>
          <p className="text-xs text-text-secondary mt-1">
            {inProgress} in progress
          </p>
          <div className="mt-3">
            <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/jobs")}>
              View jobs →
            </ActionButton>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Unpaid invoices
          </p>
          <p className="sf-tabular font-semibold text-2xl leading-tight mt-2">
            LKR {unpaidTotal.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {unpaidInvoices.length} invoice{unpaidInvoices.length === 1 ? "" : "s"}
          </p>
          <div className="mt-3">
            <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/invoices")}>
              View invoices →
            </ActionButton>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Pending companies
          </p>
          <p className="sf-tabular font-semibold text-2xl leading-tight mt-2">{pendingCompanies}</p>
          <p className="text-xs text-text-secondary mt-1">
            Awaiting approval
          </p>
          <div className="mt-3">
            <ActionButton variant="stub" size="small" onClick={() => navigate("/admin/companies")}>
              Review →
            </ActionButton>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5 space-y-3">
        <h2 className="font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="stamp" onClick={() => navigate("/manager/requests")}>
            Review requests
          </ActionButton>
          <ActionButton variant="stub" onClick={() => navigate("/manager/jobs")}>
            Schedule a job
          </ActionButton>
          <ActionButton variant="stub" onClick={() => navigate("/manager/team")}>
            Manage team
          </ActionButton>
        </div>
      </SurfaceCard>
    </div>
  );
}
