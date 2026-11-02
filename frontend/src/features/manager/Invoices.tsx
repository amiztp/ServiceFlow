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

  const unpaidTotal = invoices
    .filter((invoice) => invoice.state === "UNPAID")
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const paidCount = invoices.filter((invoice) => invoice.state === "PAID").length;

  const recordPayment = () => {
    if (!paying) return;
    setInvoices((current) =>
      current.map((invoice) =>
        invoice.id === paying.id
          ? {
              ...invoice,
              state: "PAID",
              paymentMethod: method,
              paidAt: new Date().toISOString(),
            }
          : invoice,
      ),
    );
    setPaying(null);
    setMethod("Cash");
  };

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">Invoices</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sf-card p-4">
          <p className="sf-mono text-[11px] text-text-secondary">UNPAID TOTAL</p>
          <strong className="sf-display sf-tabular block text-xl mt-1">LKR {unpaidTotal.toFixed(2)}</strong>
        </div>
        <div className="sf-card p-4">
          <p className="sf-mono text-[11px] text-text-secondary">PAID</p>
          <strong className="sf-display sf-tabular block text-xl mt-1">{paidCount}</strong>
        </div>
        <div className="sf-card p-4">
          <p className="sf-mono text-[11px] text-text-secondary">TOTAL</p>
          <strong className="sf-display sf-tabular block text-xl mt-1">{invoices.length}</strong>
        </div>
      </div>

      <ResponsiveTable
        caption="Invoices"
        rows={invoices}
        columns={[
          {
            key: "number",
            heading: "Invoice #",
            render: (invoice) => <span className="sf-mono text-xs">{invoice.invoiceNumber}</span>,
          },
          {
            key: "client",
            heading: "Client",
            render: (invoice) => (
              <div>
                <div className="font-semibold">{invoice.clientName}</div>
                <div className="text-xs text-text-secondary">{invoice.serviceName}</div>
              </div>
            ),
          },
          {
            key: "total",
            heading: "Total (LKR)",
            render: (invoice) => (
              <span className="sf-tabular font-semibold">{invoice.total.toFixed(2)}</span>
            ),
          },
          {
            key: "status",
            heading: "Status",
            render: (invoice) => <StatusBadge status={invoiceStatus(invoice.state)} />,
          },
          {
            key: "paid",
            heading: "Payment",
            render: (invoice) =>
              invoice.state === "PAID" ? (
                <div className="text-xs">
                  <div className="font-semibold">{invoice.paymentMethod}</div>
                  <div className="text-text-secondary">{formatDateTime(invoice.paidAt)}</div>
                </div>
              ) : null,
          },
          {
            key: "actions",
            heading: "",
            render: (invoice) =>
              invoice.state === "UNPAID" ? (
                <ActionButton
                  variant="stamp"
                  size="small"
                  onClick={() => {
                    setPaying(invoice);
                    setMethod("Cash");
                  }}
                >
                  Record payment
                </ActionButton>
              ) : null,
          },
        ]}
        empty={<EmptyState title="No invoices yet" description="Completed jobs create invoices here." />}
      />

      <Modal
        open={!!paying}
        title="Record payment"
        description={paying ? `${paying.invoiceNumber} — ${paying.clientName} — LKR ${paying.total.toFixed(2)}` : ""}
        onClose={() => setPaying(null)}
      >
        <div className="space-y-4">
          <div className="rounded-docket border border-line bg-paper p-3 text-sm space-y-1">
            <p className="text-text-secondary text-xs">Amount to record</p>
            <p className="sf-tabular font-semibold text-lg">LKR {paying?.total.toFixed(2)}</p>
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
