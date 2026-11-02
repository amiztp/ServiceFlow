import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, UserRound, MapPin, CalendarDays } from "lucide-react";
import {
  ActionButton,
  StatusBadge,
  SurfaceCard,
  TextField,
  DetailRow,
} from "../../components";

type QuotationState = "DRAFT" | "SENT" | "APPROVED" | "DECLINED";

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const statusMap = (s: QuotationState): "awaiting" | "approved" | "declined" => {
  if (s === "APPROVED") return "approved";
  if (s === "DECLINED") return "declined";
  return "awaiting";
};

const mockRequests = {
  r1: {
    clientName: "Nimal Perera",
    serviceName: "Basic Inspection",
    description: "Inspect wiring in 3-bedroom house",
    address: "45 Galle Rd, Colombo 03",
    preferredDate: "2026-11-10",
  },
  r2: {
    clientName: "Kamala Silva",
    serviceName: "AC Service",
    description: "Two split AC units need cleaning",
    address: "12 Kandy Rd, Kadawatha",
    preferredDate: "2026-11-12",
  },
};

export default function QuoteBuilder() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const req = mockRequests[requestId as keyof typeof mockRequests];

  if (!req) {
    return <p>Request not found</p>;
  }

  const [state, setState] = useState<QuotationState>("DRAFT");
  const [items, setItems] = useState<QuotationItem[]>([
    { id: "1", description: req.serviceName, quantity: 1, unitPrice: 0 },
  ]);

  const locked = state !== "DRAFT";

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  const updateItem = (id: string, patch: Partial<QuotationItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((current) => current.filter((item) => item.id !== id));
    }
  };

  const send = () => {
    const invalid = items.some((item) => item.quantity <= 0 || item.unitPrice < 0);
    if (invalid) {
      alert("Quantity must be > 0 and price ≥ 0");
      return;
    }
    if (total <= 0) {
      alert("Add at least one positive line item");
      return;
    }
    setState("SENT");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="sf-display text-2xl font-bold">Quotation — {req.clientName}</h1>

      <SurfaceCard className="p-5 space-y-2">
        <StatusBadge status={statusMap(state)} />
        <DetailRow icon={Building2} label="Service">{req.serviceName}</DetailRow>
        <DetailRow icon={UserRound} label="Client">{req.clientName}</DetailRow>
        <DetailRow icon={MapPin} label="Address">{req.address}</DetailRow>
        <DetailRow icon={CalendarDays} label="Preferred date">{req.preferredDate}</DetailRow>
        <p className="text-sm text-text-secondary pt-2">{req.description}</p>
      </SurfaceCard>

      <SurfaceCard className="p-5 space-y-3">
        <h2 className="font-semibold">Line items</h2>

        <table className="w-full text-sm">
          <thead className="bg-paper">
            <tr>
              <th className="sf-mono text-left px-2 py-2 text-[11px] text-text-secondary">Description</th>
              <th className="sf-mono text-left px-2 py-2 text-[11px] text-text-secondary w-24">Qty</th>
              <th className="sf-mono text-left px-2 py-2 text-[11px] text-text-secondary w-40">Unit price (LKR)</th>
              <th className="sf-mono text-right px-2 py-2 text-[11px] text-text-secondary w-32">Line total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-2 py-2">
                  <input
                    className="sf-input w-full"
                    disabled={locked}
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Describe this line"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={1}
                    className="sf-input w-full"
                    disabled={locked}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="sf-input w-full"
                    disabled={locked}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2 text-right sf-tabular">
                  {(item.quantity * item.unitPrice).toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right">
                  {!locked && items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-[#B93832] hover:underline"
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-paper">
              <td colSpan={3} className="px-2 py-3 text-right font-semibold">Total</td>
              <td className="px-2 py-3 text-right font-semibold sf-tabular">{total.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div className="flex gap-2 pt-2">
          {!locked && (
            <>
              <ActionButton variant="stub" onClick={addItem}>+ Add line</ActionButton>
              <ActionButton variant="stamp" onClick={send}>Send quotation</ActionButton>
            </>
          )}
          {locked && (
            <ActionButton variant="stub" onClick={() => navigate("/manager/requests")}>
              Back to requests
            </ActionButton>
          )}
        </div>

        {locked && (
          <p className="text-xs text-text-secondary">
            Sent quotations cannot be edited. Total locked at LKR {total.toFixed(2)}.
          </p>
        )}
      </SurfaceCard>
    </div>
  );
}
