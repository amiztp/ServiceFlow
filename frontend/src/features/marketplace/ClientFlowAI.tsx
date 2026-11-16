import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ActionButton, FlowAIPanel, TextAreaField } from '../../components'
import { Notice } from '../../components/client-shared'
import { useSession } from '../../app/session'
import { clientService } from '../../lib/client-service'
import type { PolicyAnswer } from '../../types/client'

export function ClientFlowAI({ companyId }: { companyId: string }) {
  const { user } = useSession()
  const [question, setQuestion] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [answer, setAnswer] = useState<PolicyAnswer>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function ask(event: FormEvent) {
    event.preventDefault()
    if (pending || !question.trim()) return
    setPending(true)
    setError('')
    setAnswer(undefined)
    setSubmitted(question.trim())
    try { setAnswer(await clientService.ask(companyId, question.trim())) }
    catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }
  const cited = answer?.status === 'ANSWERED' && answer.citations.length > 0
  return <div className="space-y-5">
    <h2 className="sf-display text-xl font-semibold">Ask Flow AI</h2>
    <p className="text-sm text-text-secondary">Answers come from the selected company’s public policy PDF and include policy page citations.</p>
    {user?.role === 'client' ? <form onSubmit={ask} className="space-y-4">
      <TextAreaField label="Your policy question" required maxLength={1000} value={question} onChange={event => setQuestion(event.target.value)} />
      <ActionButton type="submit" variant="stamp" disabled={pending || !question.trim()}>{pending ? 'Checking policy…' : 'Ask question'}</ActionButton>
    </form> : <Link className="sf-link" to="/login">Sign in as a client to ask →</Link>}
    {error && <Notice error>{error}</Notice>}
    {pending && <FlowAIPanel question={submitted} loading />}
    {answer && <>
      <FlowAIPanel question={submitted} answer={answer.status === 'ANSWERED' && !cited ? 'The policy response did not include evidence. Please try again or open the public policy.' : answer.answer} source={cited ? answer.citations[0].title : undefined} page={cited ? answer.citations[0].page : undefined} />
      {cited && answer.citations.map(citation => <PolicyCitation key={`${citation.policy_id}-${citation.page}`} citation={citation} />)}
    </>}
  </div>
}

function PolicyCitation({ citation }: { citation: PolicyAnswer['citations'][number] }) {
  let url: URL
  try { url = new URL(citation.url, window.location.origin) }
  catch { return <Notice error>Policy citation link is unavailable.</Notice> }
  if (!['https:', 'http:'].includes(url.protocol) || !Number.isInteger(citation.page) || citation.page < 1) return <Notice error>Policy citation link is unavailable.</Notice>
  url.hash = `page=${citation.page}`
  return <a className="sf-link block text-sm" target="_blank" rel="noreferrer" href={url.href}>{citation.title} · Version {citation.policy_version} · Page {citation.page} ↗</a>
}
