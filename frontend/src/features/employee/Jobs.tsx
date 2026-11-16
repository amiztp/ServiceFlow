import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ActionButton, EmptyState, SurfaceCard, Tabs, TextField,
} from '../../components'
import { Notice, RecordStatus, Resource, useResource, today } from '../../components/client-shared'
import { employeeService } from '../../lib/employee-service'
import type { EmployeeRow, SkillRow } from '../../types/provider'

const tabs = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history', label: 'History' },
  { key: 'profile', label: 'Profile' },
  { key: 'skills', label: 'Skills' },
] as const
type Tab = typeof tabs[number]['key']

export default function EmployeeJobs() {
  const [tab, setTab] = useState<Tab>('today')
  return <div className="space-y-6">
    <div>
      <h1 className="sf-display text-2xl font-bold">My Day</h1>
      <p className="mt-1 text-sm text-text-secondary">Your jobs and personal info.</p>
    </div>
    <Tabs label="My Day" items={tabs} value={tab} onChange={setTab}>
      {tab === 'today' && <JobsTab tab="today" />}
      {tab === 'upcoming' && <JobsTab tab="upcoming" />}
      {tab === 'history' && <JobsTab tab="history" />}
      {tab === 'profile' && <ProfileTab />}
      {tab === 'skills' && <SkillsTab />}
    </Tabs>
  </div>
}

// ---------- Jobs ----------
function JobsTab({ tab }: { tab: 'today' | 'upcoming' | 'history' }) {
  const jobs = useResource(() => employeeService.listMyJobs())
  const navigate = useNavigate()
  const all = jobs.data?.items ?? []
  const todayStr = today()

  const filtered =
    tab === 'today'
      ? all.filter(j =>
          j.schedule_date === todayStr &&
          ['SCHEDULE_CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(j.status),
        )
      : tab === 'upcoming'
      ? all
          .filter(j =>
            j.status === 'SCHEDULE_CONFIRMED' &&
            j.schedule_date &&
            j.schedule_date > todayStr,
          )
          .sort((a, b) => (a.schedule_date ?? '').localeCompare(b.schedule_date ?? ''))
      : all
          .filter(j => j.status === 'COMPLETED')
          .sort((a, b) => (b.schedule_date ?? '').localeCompare(a.schedule_date ?? ''))

  return <Resource {...jobs} retry={jobs.reload}>
    {filtered.length === 0
      ? <EmptyState
          title={`No ${tab} jobs`}
          description={
            tab === 'today' ? 'No jobs scheduled for today.' :
            tab === 'upcoming' ? 'No upcoming jobs assigned yet.' :
            'Completed jobs will appear here.'
          }
        />
      : <div className="grid gap-4 md:grid-cols-2">{filtered.map(j => (
          <button
            key={j.id}
            type="button"
            onClick={() => navigate(`/employee/jobs/${j.id}`)}
            className="text-left"
          >
            <SurfaceCard className="space-y-2 p-4 transition hover:border-graphite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="sf-mono text-xs text-text-secondary">Job #{j.id}</span>
                <RecordStatus status={j.status} />
              </div>
              <p className="text-sm">
                {j.schedule_date
                  ? `${j.schedule_date}${j.schedule_time ? ` ${j.schedule_time.slice(0, 5)}` : ''}`
                  : 'Not scheduled'}
              </p>
              <p className="text-xs text-text-secondary">
                Schedule: {j.schedule_status.replaceAll('_', ' ').toLowerCase()}
              </p>
            </SurfaceCard>
          </button>
        ))}</div>}
  </Resource>
}

// ---------- Profile ----------
function ProfileTab() {
  const profile = useResource(() => employeeService.me())
  return <Resource {...profile} retry={profile.reload}>
    {profile.data && <ProfileForm employee={profile.data} onSaved={profile.reload} />}
  </Resource>
}

function ProfileForm({ employee, onSaved }: { employee: EmployeeRow; onSaved: () => void }) {
  const [name, setName] = useState(employee.name)
  const [phone, setPhone] = useState(employee.phone)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const dirty = name !== employee.name || phone !== employee.phone

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pending || !dirty) return
    setPending(true); setError(''); setSaved(false)
    try {
      await employeeService.updateMe({ name: name.trim(), phone: phone.trim() })
      setSaved(true)
      onSaved()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <SurfaceCard className="max-w-xl p-5">
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="sf-mono text-xs text-text-secondary">EMAIL</p>
        <p className="mt-1">{employee.email}</p>
      </div>
      <TextField
        label="Full name"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        minLength={2}
        maxLength={150}
      />
      <TextField
        label="Phone"
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        required
        minLength={7}
        maxLength={30}
      />
      {error && <Notice error>{error}</Notice>}
      {saved && <Notice>Profile saved.</Notice>}
      <ActionButton type="submit" variant="stamp" disabled={pending || !dirty}>
        {pending ? 'Saving…' : 'Save profile'}
      </ActionButton>
    </form>
  </SurfaceCard>
}

// ---------- Skills ----------
function SkillsTab() {
  const skills = useResource(() => employeeService.listSkills())
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function add(e: FormEvent) {
    e.preventDefault()
    if (pending || !name.trim()) return
    setPending(true); setError('')
    try {
      await employeeService.addSkill(name.trim())
      setName('')
      skills.reload()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  async function remove(id: number) {
    setError('')
    try {
      await employeeService.removeSkill(id)
      skills.reload()
    } catch (c) { setError((c as Error).message) }
  }

  return <>
    <SurfaceCard className="mb-4 max-w-xl p-4">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <TextField
            label="Add a skill"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. Electrical maintenance"
          />
        </div>
        <ActionButton type="submit" variant="stamp" disabled={pending || !name.trim()}>
          {pending ? 'Adding…' : 'Add'}
        </ActionButton>
      </form>
      {error && <div className="mt-3"><Notice error>{error}</Notice></div>}
    </SurfaceCard>

    <Resource {...skills} retry={skills.reload}>
      {skills.data && skills.data.length === 0
        ? <EmptyState title="No skills yet" description="Add skills so your manager can schedule you for matching jobs." />
        : <div className="max-w-xl space-y-2">{skills.data?.map((s: SkillRow) => (
            <SurfaceCard key={s.id} className="flex items-center justify-between p-3">
              <span>{s.skill_name}</span>
              <ActionButton variant="void" size="small" onClick={() => remove(s.id)}>Remove</ActionButton>
            </SurfaceCard>
          ))}</div>}
    </Resource>
  </>
}