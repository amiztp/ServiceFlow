import { useState } from "react";
import { ActionButton, ResponsiveTable, Modal, TextField, TextAreaField, EmptyState } from "../../components";
import { mockServices, type Service } from "../../mocks/data";

export default function AdminCatalog() {
  const [services, setServices] = useState<Service[]>(mockServices);
  const [adding, setAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const activeCount = services.filter((s) => s.isActive).length;
  const inactiveCount = services.filter((s) => !s.isActive).length;

  const addService = () => {
    if (!newName.trim()) return;

    const svc: Service = {
      id: `s-${Date.now()}`,
      name: newName.trim(),
      description: newDescription.trim(),
      isActive: true,
    };

    setServices([...services, svc]);
    setNewName("");
    setNewDescription("");
    setAdding(false);
  };

  const toggleService = (svc: Service) => {
    if (svc.isActive && svc.id === "s1") {
      setBlockedReason(
        `${svc.name} is used by active company offerings. Cannot deactivate without manager confirmation.`
      );
      return;
    }

    setServices(services.map((s) => (s.id === svc.id ? { ...s, isActive: !s.isActive } : s)));
    setBlockedReason(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="sf-display text-2xl font-bold">Service Catalog</h1>
          <p className="text-sm text-text-secondary mt-1">
            Master list every company picks from when offering services.
          </p>
        </div>
        <ActionButton variant="stamp" onClick={() => setAdding(true)}>
          + Add service
        </ActionButton>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Active</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{activeCount}</p>
        </div>
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Inactive</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{inactiveCount}</p>
        </div>
      </div>

      {blockedReason && (
        <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
          {blockedReason}
        </div>
      )}

      <ResponsiveTable
        caption="Service catalog"
        rows={services}
        columns={[
          {
            key: "name",
            heading: "Service",
            render: (s) => (
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-text-secondary">{s.description || "No description"}</div>
              </div>
            ),
          },
          {
            key: "status",
            heading: "Status",
            render: (s) => (
              <span className={s.isActive ? "text-sm" : "text-sm text-text-secondary"}>
                {s.isActive ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            key: "actions",
            heading: "",
            render: (s) => (
              <ActionButton variant={s.isActive ? "void" : "stub"} size="small" onClick={() => toggleService(s)}>
                {s.isActive ? "Deactivate" : "Reactivate"}
              </ActionButton>
            ),
          },
        ]}
        empty={<EmptyState title="No services yet" description="Add your first service to the catalog." />}
      />

      <Modal
        open={adding}
        title="Add service"
        description="New services appear in every manager's offering picker."
        onClose={() => {
          setAdding(false);
          setNewName("");
          setNewDescription("");
        }}
      >
        <div className="space-y-4">
          <TextField
            label="Service name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <TextAreaField
            label="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <ActionButton
              variant="stub"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setNewDescription("");
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton variant="stamp" disabled={!newName.trim()} onClick={addService}>
              Add service
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
