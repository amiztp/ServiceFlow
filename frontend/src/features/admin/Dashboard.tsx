import { useNavigate } from 'react-router-dom'
import { ActionButton, SurfaceCard } from '../../components'
import { Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const data = useResource(async () => {
    const [providers, services, disputes] = await Promise.all([
      providerService.adminListProviders().catch(() => ({ items: [], total: 0, limit: 0, offset: 0 })),
      providerService.adminListServices().catch(() => []),
      providerService.adminListDisputes().catch(() => []),
    ])
    return { providers, services, disputes }
  })

  return <>
    <div className="mb-6">
      <h1 className="sf-display text-2xl font-bold">Admin dashboard</h1>
      <p className="mt-1 text-sm text-text-secondary">Platform overview.</p>
    </div>

    <Resource {...data} retry={data.reload}>
      {data.data && <AdminContent
        providerTotal={data.data.providers.total}
        pendingProviders={data.data.providers.items.filter(p => p.verification_status === 'PENDING').length}
        services={data.data.services}
        disputes={data.data.disputes}
        onNavigate={navigate}
      />}
    </Resource>
  </>
}

function AdminContent({ providerTotal, pendingProviders, services, disputes, onNavigate }: {
  providerTotal: number
  pendingProviders: number
  services: { is_active: boolean }[]
  disputes: { status: string }[]
  onNavigate: (path: string) => void
}) {
  const activeServices = services.filter(s => s.is_active).length
  const openDisputes = disputes.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length
  const resolvedDisputes = disputes.filter(d => d.status === 'RESOLVED' || d.status === 'CLOSED').length

  return <>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="PROVIDERS" value={String(providerTotal)} detail={`${pendingProviders} pending`} onClick={() => onNavigate('/admin/companies')} warning={pendingProviders > 0} />
      <Tile label="ACTIVE SERVICES" value={String(activeServices)} detail={`${services.length} total`} onClick={() => onNavigate('/admin/catalog')} />
      <Tile label="OPEN DISPUTES" value={String(openDisputes)} detail={`${resolvedDisputes} resolved`} onClick={() => onNavigate('/admin/disputes')} warning={openDisputes > 0} />
      <Tile label="TOTAL DISPUTES" value={String(disputes.length)} detail="All time" onClick={() => onNavigate('/admin/disputes')} />
    </div>

    <SurfaceCard className="mt-6 p-5">
      <h2 className="mb-3 font-semibold">Quick actions</h2>
      <div className="flex flex-wrap gap-2">
        <ActionButton variant="stamp" onClick={() => onNavigate('/admin/companies')}>Review providers</ActionButton>
        <ActionButton variant="stub" onClick={() => onNavigate('/admin/disputes')}>Open disputes</ActionButton>
        <ActionButton variant="stub" onClick={() => onNavigate('/admin/catalog')}>Service catalog</ActionButton>
      </div>
    </SurfaceCard>

    <SurfaceCard className="mt-4 p-5">
      <p className="text-sm text-text-secondary">
        Platform-wide user management, reports and settings are not yet exposed by the backend.
        Use the API docs at <code>/docs</code> for those operations until they ship.
      </p>
    </SurfaceCard>
  </>
}

function Tile({ label, value, detail, onClick, warning = false }: {
  label: string
  value: string
  detail?: string
  onClick: () => void
  warning?: boolean
}) {
  return <button type="button" onClick={onClick}
    className="sf-card w-full p-5 text-left transition hover:border-graphite">
    <p className="sf-mono text-[11px] text-text-secondary">{label}</p>
    <p className={`sf-tabular mt-2 text-2xl font-semibold ${warning ? 'text-[var(--sf-warning)]' : ''}`}>{value}</p>
    {detail && <p className="mt-1 text-xs text-text-secondary">{detail}</p>}
  </button>
}