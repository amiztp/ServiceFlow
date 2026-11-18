import { useState } from 'react'
import { ResponsiveTable, StatusBadge, SurfaceCard, Tabs } from '../../components'

export function SharedExamples() {
  const [tab, setTab] = useState<'list' | 'detail'>('list')
  return <SurfaceCard className="mt-6 space-y-5 p-6">
    <h2 className="sf-display text-xl font-semibold">Shared tabs, list and detail examples</h2>
    <Tabs label="Component examples" items={[{ key: 'list', label: 'List' }, { key: 'detail', label: 'Detail' }]} value={tab} onChange={setTab}>
      {tab === 'list' ? <ResponsiveTable
        caption="Sample requests"
        rows={[{ id: 'SAMPLE-001', service: 'Basic inspection', company: 'Sample company' }]}
        columns={[
          { key: 'id', heading: 'Request', render: row => row.id },
          { key: 'service', heading: 'Service', render: row => row.service },
          { key: 'company', heading: 'Company', render: row => row.company },
        ]}
      /> : <dl className="space-y-3">
        <div><dt className="text-sm text-text-secondary">Sample service</dt><dd className="font-semibold">Basic inspection</dd></div>
        <div><dt className="text-sm text-text-secondary">Status</dt><dd><StatusBadge status="awaiting" label="Awaiting quotation" /></dd></div>
      </dl>}
    </Tabs>
  </SurfaceCard>
}
