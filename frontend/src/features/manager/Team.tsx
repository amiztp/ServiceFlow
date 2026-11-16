import { useState, type FormEvent } from 'react'
import {
  ActionButton, EmptyState, Modal, SelectField, SurfaceCard,
  TextField,
} from '../../components'
import { Notice, PageHeader, Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { EmployeeRow } from '../../types/provider'

export default function ManagerTeam() {
  const employees = useResource(() => providerService.listEmployees().catch(() => [] as EmployeeRow[]))
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [revealedPassword, setRevealedPassword] = useState<{ email: string; password: string } | null>(null)

  return <>
    <PageHeader title="Workers" description="Company employees who can be assigned to jobs.">
      <ActionButton variant="stamp" onClick={() => setAdding(true)}>+ Add employee</ActionButton>
    </PageHeader>

    <Resource {...employees} retry={employees.reload}>
      {employees.data && employees.data.length === 0
        ? <EmptyState title="No employees yet" description="Add your first employee to start assigning jobs." />
        : <div className="space-y-2">{employees.data?.map(e => (
            <SurfaceCard key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="sf-display font-semibold">{e.name}</h3>
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    e.status === 'ACTIVE'
                      ? 'bg-[var(--sf-success-bg)] text-[var(--sf-success)]'
                      : 'bg-paper text-text-secondary'
                  }`}>{e.status}</span>
                  {e.must_change_password && (
                    <span className="rounded bg-[var(--sf-warning-bg)] px-2 py-0.5 text-xs text-[var(--sf-warning)]">
                      First login pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">{e.email} · {e.phone}</p>
              </div>
              <ActionButton variant="stub" size="small" onClick={() => setEditing(e)}>Manage</ActionButton>
            </SurfaceCard>
          ))}</div>}
    </Resource>

    <Modal open={adding} title="Add employee" onClose={() => setAdding(false)}>
      {adding && <AddEmployee
        onDone={(created) => {
          setAdding(false)
          setRevealedPassword({ email: created.email, password: created.initial_password })
          employees.reload()
        }}
        onCancel={() => setAdding(false)}
      />}
    </Modal>

    <Modal open={!!editing} title="Manage employee" onClose={() => setEditing(null)}>
      {editing && <EditEmployee
        employee={editing}
        onDone={() => { setEditing(null); employees.reload() }}
        onCancel={() => setEditing(null)}
      />}
    </Modal>

    <Modal open={!!revealedPassword} title="Employee account created" onClose={() => setRevealedPassword(null)}>
      {revealedPassword && <>
        <Notice>
          Share these credentials with the employee. The password <strong>will not be shown again</strong> —
          the employee must change it on first login.
        </Notice>
        <div className="mt-4 space-y-2 rounded-docket border border-line bg-paper p-4 text-sm">
          <div><span className="text-text-secondary">Email:</span> <strong>{revealedPassword.email}</strong></div>
          <div><span className="text-text-secondary">Initial password:</span> <strong className="sf-mono">{revealedPassword.password}</strong></div>
        </div>
        <div className="mt-4 flex justify-end">
          <ActionButton variant="stamp" onClick={() => setRevealedPassword(null)}>Done</ActionButton>
        </div>
      </>}
    </Modal>
  </>
}

function AddEmployee({ onDone, onCancel }: {
  onDone: (created: { email: string; initial_password: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending) return
    setPending(true); setError('')
    try {
      const created = await providerService.createEmployee({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      })
      onDone({ email: created.email, initial_password: created.initial_password })
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <TextField label="Full name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={150} />
    <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
    <TextField label="Phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required minLength={7} maxLength={30} />
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending || !name.trim() || !email.trim() || !phone.trim()}>
        {pending ? 'Creating…' : 'Create employee'}
      </ActionButton>
    </div>
  </form>
}

function EditEmployee({ employee, onDone, onCancel }: {
  employee: EmployeeRow
  onDone: () => void
  onCancel: () => void
}) {
  const [email, setEmail] = useState(employee.email)
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(employee.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending) return
    setPending(true); setError('')
    try {
      await providerService.updateEmployee(employee.id, {
        email: email.trim() !== employee.email ? email.trim() : undefined,
        status: status !== employee.status ? status : undefined,
      })
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div className="rounded-docket border border-line bg-paper p-3 text-sm">
      <p className="font-semibold">{employee.name}</p>
      <p className="text-text-secondary">{employee.phone}</p>
    </div>
    <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
    <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}>
      <option value="ACTIVE">Active — can be assigned jobs</option>
      <option value="INACTIVE">Inactive — cannot log in</option>
    </SelectField>
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</ActionButton>
    </div>
  </form>
}