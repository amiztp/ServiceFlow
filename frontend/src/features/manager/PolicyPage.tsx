import { useState } from "react";
import {
  ActionButton,
  StatusBadge,
  SurfaceCard,
  TextField,
  FlowAIPanel,
  Skeleton,
} from "../../components";
import { mockPolicyStatus, type PolicyStatus, type PolicyState } from "../../mocks/data";
import { Upload } from "lucide-react";

const policyStatus = (s: PolicyState): "awaiting" | "scheduled" | "approved" | "declined" => {
  if (s === "READY") return "approved";
  if (s === "PROCESSING") return "scheduled";
  if (s === "FAILED") return "declined";
  return "awaiting";
};

export default function PolicyPage() {
  const [policy, setPolicy] = useState<PolicyStatus>(mockPolicyStatus);
  const [question, setQuestion] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<{
    status: "OK" | "INSUFFICIENT_EVIDENCE" | "UNAVAILABLE" | "NO_POLICY";
    answer?: string;
    source?: string;
    page?: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("PDF must be 5 MB or smaller.");
      return;
    }

    setPolicy({
      state: "PROCESSING",
      filename: file.name,
      message: "Uploading and extracting text...",
    });

    setTimeout(() => {
      setPolicy({
        state: "READY",
        activeVersion: (policy.activeVersion ?? 0) + 1,
        filename: file.name,
        uploadedAt: new Date().toISOString().slice(0, 10),
      });
    }, 2000);
  };

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);

    await new Promise((r) => setTimeout(r, 900));

    if (question.toLowerCase().includes("cancel")) {
      setResponse({
        status: "OK",
        answer:
          "Cancellations must be made at least 24 hours before the appointment. Late cancellations incur a 50% service fee.",
        source: "BrightFix Public Policy",
        page: 2,
      });
    } else if (question.toLowerCase().includes("warranty")) {
      setResponse({
        status: "OK",
        answer: "All parts and labour are covered under a 30-day warranty from the date of completion.",
        source: "BrightFix Public Policy",
        page: 3,
      });
    } else if (question.toLowerCase().includes("payment")) {
      setResponse({
        status: "OK",
        answer: "Full payment is recorded after job completion. We accept cash, bank transfer, and cheque.",
        source: "BrightFix Public Policy",
        page: 1,
      });
    } else {
      setResponse({
        status: "INSUFFICIENT_EVIDENCE",
        answer: "The uploaded policy document does not provide enough evidence to answer this question.",
      });
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="sf-display text-2xl font-bold">Flow AI</h1>
        <p className="text-sm text-text-secondary mt-1">
          Answers questions from this company's public policy document only.
        </p>
      </div>

      <SurfaceCard className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Public policy PDF</h2>
            <p className="text-sm text-text-secondary mt-1">
              One active policy at a time. Uploading a new version keeps the current one active until indexing completes.
            </p>
          </div>
          <StatusBadge status={policyStatus(policy.state)} />
        </div>

        {policy.state === "READY" && (
          <div className="rounded-docket border border-line bg-paper p-3 text-sm space-y-1">
            <p>
              <span className="text-text-secondary">File:</span> <strong>{policy.filename}</strong>
            </p>
            <p>
              <span className="text-text-secondary">Version:</span> v{policy.activeVersion}
            </p>
            <p>
              <span className="text-text-secondary">Uploaded:</span> {policy.uploadedAt}
            </p>
          </div>
        )}

        {policy.state === "PROCESSING" && (
          <div className="rounded-docket border border-line bg-paper p-3 text-sm">
            <p className="text-text-secondary">{policy.message}</p>
            <div className="mt-2">
              <Skeleton rows={2} />
            </div>
          </div>
        )}

        {policy.state === "FAILED" && (
          <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
            {policy.message || "Upload failed. Please try again."}
          </div>
        )}

        {uploadError && (
          <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
            {uploadError}
          </div>
        )}

        <label className="inline-flex items-center gap-2 rounded-docket border border-line px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-paper">
          <Upload size={17} aria-hidden="true" />
          {policy.state === "READY" ? "Upload new version" : "Upload PDF"}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={policy.state === "PROCESSING"}
          />
        </label>
        <p className="text-xs text-text-secondary">
          Max 5 MB · Max 20 pages · Text-based PDF only (scanned documents are rejected)
        </p>
      </SurfaceCard>

      <SurfaceCard className="p-5 space-y-3">
        <h2 className="font-semibold">Ask a question</h2>
        <p className="text-sm text-text-secondary">
          Only the policy text is used. The AI cannot see jobs, clients, invoices, or other companies.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <TextField
              label="Your question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is the cancellation policy?"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
            />
          </div>
          <ActionButton
            variant="stamp"
            onClick={ask}
            disabled={loading || !question.trim() || policy.state !== "READY"}
          >
            {loading ? "Thinking…" : "Ask"}
          </ActionButton>
        </div>
        {policy.state !== "READY" && (
          <p className="text-xs text-[#6E5600]">
            Upload a policy PDF first — the assistant only answers from it.
          </p>
        )}
      </SurfaceCard>

      {(loading || response) && (
        <div>
          <h2 className="font-semibold mb-3">Answer</h2>
          <FlowAIPanel
            question={question}
            answer={
              loading
                ? undefined
                : response?.status === "OK"
                  ? response.answer
                  : response?.status === "INSUFFICIENT_EVIDENCE"
                    ? "The uploaded policy document does not provide enough evidence to answer this question."
                    : response?.status === "UNAVAILABLE"
                      ? "The AI service is temporarily unavailable. You can still book services and manage jobs."
                      : "This company has not uploaded a public policy yet."
            }
            source={response?.status === "OK" ? response.source : undefined}
            page={response?.status === "OK" ? response.page : undefined}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
