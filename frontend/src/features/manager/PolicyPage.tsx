import { useState } from 'react'
import {
  ActionButton, StatusBadge, SurfaceCard, TextAreaField,
  FlowAIPanel, Skeleton, Tabs,
} from '../../components'
import { Notice, PageHeader } from '../../components/client-shared'
import { api, ApiError } from '../../lib/api'
import { mockPolicyStatus, type PolicyStatus, type PolicyState } from '../../mocks/data'
import { Upload } from 'lucide-react'

const policyStatus = (s: PolicyState): 'awaiting' | 'scheduled' | 'approved' | 'declined' => {
  if (s === 'READY') return 'approved'
  if (s === 'PROCESSING') return 'scheduled'
  if (s === 'FAILED') return 'declined'
  return 'awaiting'
}

type AskResponse = {
  status?: string
  answer?: string
  citations?: Array<{ source: string; page: number }>
}

const askTabs = [
  { key: 'policy', label: 'Ask about policy' },
  { key: 'business', label: 'Ask about business' },
] as const
type AskTab = typeof askTabs[number]['key']

export default function PolicyPage() {
  return (
    <>
      <PageHeader
        title="Flow AI"
        description="Ask questions about your policy or your business data. Scope is derived from your account."
      />
      <div className="max-w-2xl space-y-6">
        <PolicyUploadSection />
        <AskSection />
      </div>
    </>
  )
}

function PolicyUploadSection() {
  const [policy, setPolicy] = useState<PolicyStatus>(mockPolicyStatus)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('PDF must be 5 MB or smaller.')
      return
    }
    setPolicy({
      state: 'PROCESSING',
      filename: file.name,
      message: 'Uploading and extracting text...',
    })
    setTimeout(() => {
      setPolicy({
        state: 'READY',
        activeVersion: (policy.activeVersion ?? 0) + 1,
        filename: file.name,
        uploadedAt: new Date().toISOString().slice(0, 10),
      })
    }, 1500)
  }

  return (
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
      {policy.state === 'READY' && (
        <div className="rounded-docket border border-line bg-paper p-3 text-sm space-y-1">
          <p><span className="text-text-secondary">File:</span> <strong>{policy.filename}</strong></p>
          <p><span className="text-text-secondary">Version:</span> v{policy.activeVersion}</p>
          <p><span className="text-text-secondary">Uploaded:</span> {policy.uploadedAt}</p>
        </div>
      )}
      {policy.state === 'PROCESSING' && (
        <div className="rounded-docket border border-line bg-paper p-3 text-sm">
          <p className="text-text-secondary">{policy.message}</p>
          <div className="mt-2"><Skeleton rows={2} /></div>
        </div>
      )}
      {uploadError && (
        <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">{uploadError}</div>
      )}
      <label className="inline-flex items-center gap-2 rounded-docket border border-line px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-paper">
        <Upload size={17} aria-hidden="true" />
        {policy.state === 'READY' ? 'Upload new version' : 'Upload PDF'}
        <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={policy.state === 'PROCESSING'} />
      </label>
      <p className="text-xs text-text-secondary">Max 5 MB · Max 20 pages · Text-based PDF only</p>
    </SurfaceCard>
  )
}

function AskSection() {
  const [tab, setTab] = useState<AskTab>('policy')

  return (
    <SurfaceCard className="p-5 space-y-4">
      <h2 className="font-semibold">Ask Flow AI</h2>
      <Tabs label="Flow AI question types" items={askTabs} value={tab} onChange={setTab}>
        {tab === 'policy' && (
          <AskPanel
            endpoint="/ai/ask-docs"
            description="Answers come from your uploaded public policy document."
            placeholder="e.g. What is the arrival window for a standard appointment?"
          />
        )}
        {tab === 'business' && (
          <AskPanel
            endpoint="/ai/ask-data"
            description="Answers come from your own requests, quotations, jobs, and invoices."
            placeholder="e.g. How many service requests have I received this month?"
          />
        )}
      </Tabs>
    </SurfaceCard>
  )
}

function AskPanel({ endpoint, description, placeholder }: {
  endpoint: string
  description: string
  placeholder: string
}) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AskResponse | null>(null)
  const [error, setError] = useState('')

  async function ask() {
    if (!question.trim() || loading) return
    setLoading(true); setError(''); setResponse(null)
    try {
      const result = await api<AskResponse>(
        endpoint,
        'POST',
        { question: question.trim() },
        { timeout: 120000 },
      )
      setResponse(result)
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 502 || e.status === 503) setError('Flow AI is unavailable right now. Please try again.')
        else if (e.status === 403) setError('Flow AI is only available to provider accounts.')
        else if (e.status === 0) setError('Flow AI timed out. Check your connection or try a shorter question.')
        else setError(e.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const displayAnswer = loading
    ? undefined
    : response?.status === 'insufficient_evidence'
      ? (response.answer || 'The available data does not provide enough evidence to answer this question.')
      : response?.answer

  return (
    <div className="space-y-4 pt-3">
      <p className="text-sm text-text-secondary">{description}</p>
      <TextAreaField
        label="Your question"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); ask()
          }
        }}
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-secondary">{loading ? 'Usually takes 4–10 seconds' : ''}</span>
        <ActionButton variant="stamp" onClick={ask} disabled={loading || !question.trim()}>
          {loading ? 'Thinking…' : 'Ask'}
        </ActionButton>
      </div>
      {error && <Notice error>{error}</Notice>}
      {(loading || response) && (
        <FlowAIPanel
          question={question}
          answer={displayAnswer}
          citations={response?.citations}
          loading={loading}
        />
      )}
    </div>
  )
}