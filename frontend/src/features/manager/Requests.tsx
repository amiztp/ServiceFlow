import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ActionButton,
  StatusBadge,
  ResponsiveTable,
  Modal,
  TextField,
  EmptyState,
} from "../../components";

import { mockRequests, RequestState, type ServiceRequest } from "../../mocks/data";

const statusMap = (s: RequestState): "awaiting" | "approved" | "declined" | "cancelled" => {
  if (s === "NEW") return "awaiting";
  if (s === "QUOTED") return "awaiting";
  if (s === "REJECTED") return "declined";
  return "cancelled";
};

export default function RequestInbox() {
  const [requests, setRequests] = useState<ServiceRequest[]>(mockRequests);
  const [rejecting, setRejecting] = useState<ServiceRequest | null>(null);
  const [reason, setReason] = useState("");
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">Request Inbox</h1>

      <ResponsiveTable
        caption="Incoming requests"
        rows={requests}
        columns={[
          {
            key: "client",
            heading: "Client",
            render: (r) => (
              <div>
                <div className="font-semibold">{r.clientName}</div>
                <div className="text-xs text-text-secondary">{r.address}</div>
              </div>
            ),
          },
          {
            key: "service",
            heading: "Service",
            render: (r) => (
              <div>
                <div>{r.serviceName}</div>
                <div className="text-xs text-text-secondary">{r.description}</div>
              </div>
            ),
          },
          {
            key: "date",
            heading: "Preferred",
            render: (r) => r.preferredDate,
          },
          {
            key: "status",
            heading: "Status",
            render: (r) => <StatusBadge status={statusMap(r.state)} />,
          },
          {
            key: "actions",
            heading: "Actions",
            render: (r) => {
              if (r.state === "NEW") {
                return (
                  <div className="flex gap-2">
                    <ActionButton
                      variant="stamp"
                      size="small"
                      onClick={() => navigate(`/manager/quotations/${r.id}`)}
                    >
                      Create quote
                    </ActionButton>
                    <ActionButton
                      variant="void"
                      size="small"
                      onClick={() => {
                        setRejecting(r);
                        setReason("");
                      }}
                    >
                      Reject
                    </ActionButton>
                  </div>
                );
              }
              if (r.state === "REJECTED") {
                return <span className="text-xs text-text-secondary">Reason: {r.rejectionReason}</span>;
              }
              return null;
            },
          },
        ]}
        empty={<EmptyState title="No requests yet" description="Requests from clients will appear here." />}
      />

      <Modal
        open={!!rejecting}
        title="Reject request"
        description={rejecting ? `${rejecting.clientName} — ${rejecting.serviceName}` : ""}
        onClose={() => setRejecting(null)}
      >
        <div className="space-y-4">
          <TextField
            label="Reason for rejection"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            hint="The client will see this reason."
          />
          <div className="flex justify-end gap-2">
            <ActionButton variant="stub" onClick={() => setRejecting(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              variant="void"
              disabled={!reason.trim()}
              onClick={() => {
                if (!rejecting) return;
                setRequests((current) =>
                  current.map((x) =>
                    x.id === rejecting.id ? { ...x, state: "REJECTED", rejectionReason: reason } : x,
                  ),
                );
                setRejecting(null);
                setReason("");
              }}
            >
              Reject request
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
