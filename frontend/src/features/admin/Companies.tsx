import { useState } from "react";
import {
  ActionButton,
  StatusBadge,
  SurfaceCard,
  EmptyState,
  Modal,
  TextAreaField,
} from "../../components";
import { mockCompanies, type Company } from "../../mocks/data";

const companyStatus = (s: "PENDING" | "APPROVED" | "REJECTED"): "awaiting" | "approved" | "declined" => {
  if (s === "APPROVED") return "approved";
  if (s === "REJECTED") return "declined";
  return "awaiting";
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [rejecting, setRejecting] = useState<Company | null>(null);
  const [reason, setReason] = useState("");

  const pendingCount = companies.filter((company) => company.state === "PENDING").length;
  const approvedCount = companies.filter((company) => company.state === "APPROVED").length;
  const rejectedCount = companies.filter((company) => company.state === "REJECTED").length;

  const approve = (id: string) => {
    setCompanies((current) =>
      current.map((company) =>
        company.id === id ? { ...company, state: "APPROVED" } : company,
      ),
    );
  };

  const confirmReject = () => {
    if (!rejecting || !reason.trim()) return;
    setCompanies((current) =>
      current.map((company) =>
        company.id === rejecting.id
          ? { ...company, state: "REJECTED", rejectionReason: reason }
          : company,
      ),
    );
    setRejecting(null);
    setReason("");
  };

  const sorted = [...companies].sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
    return order[a.state] - order[b.state];
  });

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">Company Approval Queue</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Pending</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{pendingCount}</p>
          <p className="text-xs text-text-secondary mt-1">Awaiting review</p>
        </div>
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Approved</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{approvedCount}</p>
          <p className="text-xs text-text-secondary mt-1">Listed publicly</p>
        </div>
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Rejected</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{rejectedCount}</p>
          <p className="text-xs text-text-secondary mt-1">Not eligible</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No companies yet" description="New company registrations appear here." />
      ) : (
        <div className="space-y-3">
          {sorted.map((company) => (
            <SurfaceCard key={company.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="sf-display font-semibold text-lg">{company.name}</h3>
                    <StatusBadge status={companyStatus(company.state)} />
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{company.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-text-secondary">Email</p>
                  <p>{company.email}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Phone</p>
                  <p>{company.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Location</p>
                  <p>{company.location}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
                <p className="text-xs text-text-secondary">
                  Registered {formatDate(company.registeredAt)}
                </p>

                {company.state === "PENDING" && (
                  <div className="flex gap-2">
                    <ActionButton variant="stamp" size="small" onClick={() => approve(company.id)}>
                      Approve
                    </ActionButton>
                    <ActionButton
                      variant="void"
                      size="small"
                      onClick={() => {
                        setRejecting(company);
                        setReason("");
                      }}
                    >
                      Reject
                    </ActionButton>
                  </div>
                )}

                {company.state === "APPROVED" && (
                  <span className="text-xs text-text-secondary">✓ Listed in marketplace</span>
                )}

                {company.state === "REJECTED" && company.rejectionReason && (
                  <span className="text-xs text-text-secondary">
                    Reason: {company.rejectionReason}
                  </span>
                )}
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}

      <Modal
        open={!!rejecting}
        title="Reject company"
        description={rejecting ? `Rejecting: ${rejecting.name}` : ""}
        onClose={() => setRejecting(null)}
      >
        <div className="space-y-4">
          <TextAreaField
            label="Reason for rejection"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            hint="The manager will see this reason and can resubmit."
          />
          <div className="flex justify-end gap-2">
            <ActionButton variant="stub" onClick={() => setRejecting(null)}>
              Cancel
            </ActionButton>
            <ActionButton variant="void" disabled={!reason.trim()} onClick={confirmReject}>
              Reject company
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
