import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ActionButton, Modal, SurfaceCard, TextAreaField, TextField,
} from '../../components'
import { Notice, RecordStatus, Resource, dateTime, useResource } from '../../components/client-shared'
import { employeeService } from '../../lib/employee-service'

export default function EmployeeJobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const id = Number(jobId)
  const navigate = useNavigate()
  if (!id || Number.isNaN(id)) return <p className="p-6">Invalid job.</p>

  const job = useResource(() => employeeService.getJob(id), [id])
  const [adding, setAdding] = useState<'NOTE' | 'MATERIAL' | 'PHOTO' | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState<'start' | 'complete' | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<number | null>(null)

  async function start() {
    setPending('start'); setError('')
    try { await employeeService.startJob(id); job.reload() }
    catch (c) { setError((c as Error).message) } finally { setPending(null) }
  }
  async function complete() {
    setPending('complete'); setError('')
    try {
      await employeeService.completeJob(id)
      setConfirming(false); job.reload()
      setTimeout(() => navigate('/employee/jobs'), 800)
    } catch (c) { setError((c as Error).message) } finally { setPending(null) }
  }

  async function downloadPhoto(recordId: number, fileName: string) {
    setDownloading(recordId); setError('')
    try { await employeeService.downloadJobPhoto(id, recordId, fileName) }
    catch (c) { setError((c as Error).message) } finally { setDownloading(null) }
  }

  return <div className="mx-auto max-w-2xl space-y-4">
    <Link to="/employee/jobs" className="sf-link">← Back to My Day</Link>
    <Resource {...job} retry={job.reload}>
      {job.data && <>
        <SurfaceCard className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="sf-display text-xl font-semibold">Job #{job.data.id}</h1>
            <RecordStatus status={job.data.status} />
          </div>
          {job.data.schedule_date
            ? <p className="text-sm">
                Scheduled <strong>{job.data.schedule_date} {job.data.schedule_time?.slice(0, 5)}</strong>
                {' · '}<span className="text-text-secondary">{job.data.schedule_status}</span>
              </p>
            : <Notice>Not scheduled yet.</Notice>}
          {job.data.completed_at && (
            <p className="text-sm text-text-secondary">Completed {dateTime(job.data.completed_at)}</p>
          )}
        </SurfaceCard>

        {error && <Notice error>{error}</Notice>}

        <div className="flex flex-wrap gap-2">
          {job.data.status === 'SCHEDULE_CONFIRMED' && (
            <ActionButton variant="stamp" onClick={start} disabled={pending === 'start'}>
              {pending === 'start' ? 'Starting…' : 'Start job'}
            </ActionButton>
          )}
          {job.data.status === 'IN_PROGRESS' && (
            <ActionButton variant="stamp" onClick={() => setConfirming(true)}>Complete job</ActionButton>
          )}
          {job.data.status === 'JOB_CREATED' && (
            <Notice>Waiting for the schedule to be confirmed.</Notice>
          )}
          {['COMPLETED', 'CANCELLED'].includes(job.data.status) && (
            <Notice>This job is {job.data.status.toLowerCase()}.</Notice>
          )}
        </div>

        <SurfaceCard className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Work log</h2>
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="stub" size="small" onClick={() => setAdding('NOTE')}>+ Note</ActionButton>
              <ActionButton variant="stub" size="small" onClick={() => setAdding('MATERIAL')}>+ Material</ActionButton>
              <ActionButton variant="stub" size="small" onClick={() => setAdding('PHOTO')}>+ Photo</ActionButton>
            </div>
          </div>
          {job.data.records.length === 0
            ? <p className="text-sm text-text-secondary">No records yet.</p>
            : <ul className="divide-y divide-line">
                {job.data.records.map(r => (
                  <li key={r.id} className="py-2">
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>{r.record_type}</span>
                      <span>{dateTime(r.created_at)}</span>
                    </div>
                    {r.note && <p className="mt-1 whitespace-pre-wrap text-sm">{r.note}</p>}
                    {r.material_name && (
                      <p className="mt-1 text-sm">
                        <strong>{r.material_name}</strong>
                        {r.quantity && ` · ${r.quantity} ${r.unit ?? ''}`}
                      </p>
                    )}
                    {r.file_name && (
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-docket border border-line bg-paper p-2 text-sm">
                        <span className="truncate">{r.file_name}</span>
                        <ActionButton
                          variant="stub"
                          size="small"
                          onClick={() => downloadPhoto(r.id, r.file_name!)}
                          disabled={downloading === r.id}
                        >
                          {downloading === r.id ? '…' : 'Download'}
                        </ActionButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>}
        </SurfaceCard>
      </>}
    </Resource>

    <Modal
      open={adding !== null}
      title={adding === 'NOTE' ? 'Add note' : adding === 'MATERIAL' ? 'Add material' : 'Upload photo'}
      onClose={() => setAdding(null)}
    >
      {adding && adding !== 'PHOTO' && <AddRecord
        jobId={id}
        type={adding}
        onDone={() => { setAdding(null); job.reload() }}
        onCancel={() => setAdding(null)}
      />}
      {adding === 'PHOTO' && <UploadPhoto
        jobId={id}
        onDone={() => { setAdding(null); job.reload() }}
        onCancel={() => setAdding(null)}
      />}
    </Modal>

    <Modal open={confirming} title="Complete this job?" onClose={() => setConfirming(false)}>
      <p className="text-sm">Completing the job creates an invoice. This cannot be undone.</p>
      {error && <div className="mt-3"><Notice error>{error}</Notice></div>}
      <div className="mt-4 flex justify-end gap-2">
        <ActionButton onClick={() => setConfirming(false)}>Cancel</ActionButton>
        <ActionButton variant="stamp" onClick={complete} disabled={pending === 'complete'}>
          {pending === 'complete' ? 'Completing…' : 'Complete job'}
        </ActionButton>
      </div>
    </Modal>
  </div>
}

function AddRecord({ jobId, type, onDone, onCancel }: {
  jobId: number
  type: 'NOTE' | 'MATERIAL'
  onDone: () => void
  onCancel: () => void
}) {
  const [note, setNote] = useState('')
  const [materialName, setMaterialName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending) return
    setPending(true); setError('')
    try {
      if (type === 'NOTE') {
        await employeeService.createRecord(jobId, { record_type: 'NOTE', note: note.trim() })
      } else {
        await employeeService.createRecord(jobId, {
          record_type: 'MATERIAL',
          material_name: materialName.trim(),
          quantity: quantity ? Number(quantity) : undefined,
          unit: unit.trim() || undefined,
        })
      }
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    {type === 'NOTE'
      ? <TextAreaField label="Note" value={note} onChange={e => setNote(e.target.value)} required />
      : <>
          <TextField label="Material name" value={materialName} onChange={e => setMaterialName(e.target.value)} required maxLength={150} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Quantity" type="number" min={0} step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
            <TextField label="Unit" value={unit} onChange={e => setUnit(e.target.value)} maxLength={30} placeholder="e.g. pcs, m" />
          </div>
        </>}
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Saving…' : 'Save'}</ActionButton>
    </div>
  </form>
}

function UploadPhoto({ jobId, onDone, onCancel }: {
  jobId: number
  onDone: () => void
  onCancel: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending || !file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type)) {
      setError('Only JPG, PNG, WebP or HEIC images are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.')
      return
    }
    setPending(true); setError('')
    try {
      await employeeService.uploadJobPhoto(jobId, file)
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div>
      <label className="mb-1 block text-sm font-medium">Photo (JPG, PNG, WebP, HEIC · max 5 MB)</label>
      <input type="file" accept="image/*" className="sf-input" onChange={e => setFile(e.target.files?.[0] ?? null)} required />
    </div>
    {file && <p className="text-xs text-text-secondary">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending || !file}>{pending ? 'Uploading…' : 'Upload'}</ActionButton>
    </div>
  </form>
}