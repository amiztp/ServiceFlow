import { AppSidebar, ActionButton, StatusBadge, JobTicketCard, roleNav } from './components';

export default function TestPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AppSidebar items={roleNav.manager} activeHref="/manager/jobs" userName="Chamari" subtitle="Company Manager · BrightFix" />
      <main style={{ padding: 24, display: 'grid', gap: 16, alignContent: 'start' }}>
        <h1>Component test page</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <ActionButton variant="stamp" onClick={() => alert('Primary works')}>Add job</ActionButton>
          <ActionButton variant="stub">View requests</ActionButton>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge status="scheduled" />
          <StatusBadge status="in_progress" />
          <StatusBadge status="completed" />
          <StatusBadge status="unpaid" />
        </div>
        <JobTicketCard
          id="SF-JOB-2087"
          title="AC not cooling — inspection"
          status="scheduled"
          client="Nimal Fernando"
          schedule="Fri 24 Oct 2026 · 09:00–11:00"
          employee="Asha Perera"
          amount="LKR 3,000"
        />
      </main>
    </div>
  );
}
