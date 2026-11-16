import { useState } from "react";
import {
  ActionButton,
  SurfaceCard,
  TextField,
  TextAreaField,
  SelectField,
  ResponsiveTable,
  EmptyState,
} from "../../components";
import {
  mockCompanyProfile,
  mockOfferedServices,
  mockServices,
  type CompanyProfile,
  type OfferedService,
} from "../../mocks/data";

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>(mockCompanyProfile);
  const [offered, setOffered] = useState<OfferedService[]>(mockOfferedServices);
  const [saved, setSaved] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [newPrice, setNewPrice] = useState("0");

  const saveProfile = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addService = () => {
    const svc = mockServices.find((s) => s.id === selectedServiceId);
    if (!svc) return;
    if (offered.some((o) => o.serviceId === selectedServiceId)) return;

    const price = Number(newPrice) || 0;
    const newOffered: OfferedService = {
      id: `os-${Date.now()}`,
      serviceId: svc.id,
      serviceName: svc.name,
      startingPrice: price,
      isActive: true,
    };

    setOffered([...offered, newOffered]);
    setSelectedServiceId("");
    setNewPrice("0");
    setAddingService(false);
  };

  const updatePrice = (id: string, price: number) => {
    setOffered(offered.map((o) => (o.id === id ? { ...o, startingPrice: price } : o)));
  };

  const removeService = (id: string) => {
    setOffered(offered.filter((o) => o.id !== id));
  };

  const availableServices = mockServices.filter(
    (s) => s.isActive && !offered.some((o) => o.serviceId === s.id)
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="sf-display text-2xl font-bold">Company Profile</h1>

      <SurfaceCard className="p-5 space-y-4">
        <h2 className="font-semibold">Company details</h2>
        <TextField
          label="Company name"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          required
        />
        <TextAreaField
          label="Description"
          value={profile.description}
          onChange={(e) => setProfile({ ...profile, description: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label="Email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            required
          />
          <TextField
            label="Phone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            required
          />
        </div>
        <TextField
          label="Address"
          value={profile.address}
          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
        />
        <div className="flex items-center gap-3">
          <ActionButton variant="stamp" onClick={saveProfile}>
            Save details
          </ActionButton>
          {saved && <span className="text-sm text-[var(--sf-success)]">Saved ✓</span>}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold">Offered services</h2>
            <p className="text-sm text-text-secondary">
              Services your company offers, with starting prices in LKR.
            </p>
          </div>
          <ActionButton
            variant="stub"
            size="small"
            onClick={() => setAddingService(true)}
            disabled={availableServices.length === 0}
          >
            + Offer service
          </ActionButton>
        </div>

        {addingService && (
          <div className="rounded-docket border border-line bg-paper p-3 space-y-3">
            <SelectField
              label="Service"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              required
            >
              <option value="">— Select service —</option>
              {availableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Starting price (LKR)"
              type="number"
              min={0}
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <ActionButton
                variant="stub"
                onClick={() => {
                  setAddingService(false);
                  setSelectedServiceId("");
                  setNewPrice("0");
                }}
              >
                Cancel
              </ActionButton>
              <ActionButton variant="stamp" disabled={!selectedServiceId} onClick={addService}>
                Add service
              </ActionButton>
            </div>
          </div>
        )}

        <ResponsiveTable
          caption="Offered services"
          rows={offered}
          columns={[
            {
              key: "name",
              heading: "Service",
              render: (o) => <span className="font-semibold">{o.serviceName}</span>,
            },
            {
              key: "price",
              heading: "Starting price (LKR)",
              render: (o) => (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={o.startingPrice}
                  onChange={(e) => updatePrice(o.id, Number(e.target.value))}
                  className="sf-input w-32 text-right"
                />
              ),
            },
            {
              key: "actions",
              heading: "",
              render: (o) => (
                <ActionButton variant="void" size="small" onClick={() => removeService(o.id)}>
                  Remove
                </ActionButton>
              ),
            },
          ]}
          empty={
            <EmptyState
              title="No services offered yet"
              description="Add services from the catalog to appear in the marketplace."
            />
          }
        />
      </SurfaceCard>
    </div>
  );
}
