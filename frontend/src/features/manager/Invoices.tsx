// src/features/manager/Invoices.tsx
import { useState } from "react";
import {
  ActionButton,
  StatusBadge,
  ResponsiveTable,
  Modal,
  SelectField,
  EmptyState,
} from "../../components";
import { mockInvoices, type Invoice } from "../../mocks/data";

const invoiceStatus = (s: "UNPAID" | "PAID"): "unpaid" | "paid" =>
  s === "PAID" ? "paid" : "unpaid";

const formatDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [method, setMethod] = useState("Cash");

  // ---- Computed totals ----
  const unpaidInvoices = invoices.filter((i) => i.state === "UNPAID");
  const paidInvoices = invoices.filter((i) => i.state === "PAID");

  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + i.total, 0);
  const paidTotal = paidInvoices.reduce((s, i) => s + i.total, 0);
  const totalBilled = unpaidTotal + paidTotal;

  const unpaidCount = unpaidInvoices.length;
  const paidCount = paidInvoices.length;

  const todayISO = new Date().toISOString().slice(0, 10);
  const paidTodayInvoices = paidInvoices.filter(
    (i) => i.paidAt?.slice(0, 10) === todayISO
  );
  const paidToday = paidTodayInvoices.reduce((s, i) => s + i.total, 0);
  const paidTodayCount = paidTodayInvoices.length;

  // ---- Action ----
  const recordPayment = () => {
    if (!paying) return;
    setInvoices(
      invoices.map((i) =>
        i.id === paying.id
          ? {
              ...i,
              state: "PAID",
              paymentMethod: method,
              paidAt: new Date().toISOString(),
            }
          : i
      )
    );
    setPaying(null);
    setMethod("Cash");
  };

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">Invoices</h1>

      {/* Summary strip — 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Unpaid total
          </p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            LKR {unpaidTotal.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {unpaidCount} invoice{unpaidCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Paid total
          </p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            LKR {paidTotal.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {paidCount} invoice{paidCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Total billed
          </p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            LKR {totalBilled.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Collected today
          </p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            LKR {paidToday.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {paidTodayCount} invoice{paidTodayCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Invoice table */}
      <ResponsiveTable
        caption="Invoices"
        rows={invoices}
        columns={[
          {
            key: "number",
            heading: "Invoice #",
            render: (i) => (
              <span className="sf-mono text-xs">{i.invoiceNumber}</span>
            ),
          },
          {
            key: "client",
            heading: "Client",
            render: (i) => (
              <div>
                <div className="font-semibold">{i.clientName}</div>
                <div className="text-xs text-text-secondary">{i.serviceName}</div>
              </div>
            ),
          },
          {
            key: "total",
            heading: "Total (LKR)",
            render: (i) => (
              <span className="sf-tabular font-semibold">
                {i.total.toFixed(2)}
              </span>
            ),
          },
          {
            key: "status",
            heading: "Status",
            render: (i) => <StatusBadge status={invoiceStatus(i.state)} />,
          },
          {
            key: "paid",
            heading: "Payment",
            render: (i) =>
              i.state === "PAID" ? (
                <div className="text-xs">
                  <div className="font-semibold">{i.paymentMethod}</div>
                  <div className="text-text-secondary">
                    {formatDateTime(i.paidAt)}
                  </div>
                </div>
              ) : null,
          },
          {
            key: "actions",
            heading: "",
            render: (i) =>
              i.state === "UNPAID" ? (
                <ActionButton
                  variant="stamp"
                  size="small"
                  onClick={() => {
                    setPaying(i);
                    setMethod("Cash");
                  }}
                >
                  Record payment
                </ActionButton>
              ) : null,
          },
        ]}
        empty={
          <EmptyState
            title="No invoices yet"
            description="Completed jobs create invoices here."
          />
        }
      />

      {/* Record payment modal */}
      <Modal
        open={!!paying}
        title="Record payment"
        description={
          paying
            ? `${paying.invoiceNumber} — ${paying.clientName} — LKR ${paying.total.toFixed(2)}`
            : ""
        }
        onClose={() => setPaying(null)}
      >
        <div className="space-y-4">
          <div className="rounded-docket border border-line bg-paper p-3 text-sm space-y-1">
            <p className="text-text-secondary text-xs">Amount to record</p>
            <p className="sf-tabular font-semibold text-lg">
              LKR {paying?.total.toFixed(2)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Full payment only — no partial payments in this release.
            </p>
          </div>

          <SelectField
            label="Payment method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            required
          >
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </SelectField>

          <div className="flex justify-end gap-2">
            <ActionButton variant="stub" onClick={() => setPaying(null)}>
              Cancel
            </ActionButton>
            <ActionButton variant="stamp" onClick={recordPayment}>
              Confirm payment
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}