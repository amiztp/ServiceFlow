import { useState, type ReactNode } from "react";
import { useSession } from "./app/session";
import MyBusiness from "./features/manager/MyBusiness";
import Pipeline from "./features/manager/Pipeline";
import AdminDashboard from "./features/admin/Dashboard";
import AdminDisputes from "./features/admin/Disputes";
import AdminAllRequestsJobs from "./features/admin/AllRequestsJobs";
import { NotificationBell } from "./components/NotificationBell";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ActionButton,
  AppSidebar,
  EmptyState,
  Modal,
  roleNav,
  SelectField,
  Skeleton,
  StatusBadge,
  SurfaceCard,
  TextField,
} from "./components";
import { Notice, PageHeader } from "./components/client-shared";
import { ClientShell } from "./components/layout/ClientShell";
import { ClientGuard, SessionProvider, destination } from "./app/session";
import { DirectoryPage } from "./features/marketplace/DirectoryPage";
import { LandingPage } from "./features/marketplace/LandingPage";
import { CompanyPage } from "./features/marketplace/pages";
import { AuthPage } from "./features/auth/AuthPage";
import { ChangePasswordPage, WorkspacePage } from "./features/auth/pages";
import {
  EmailVerificationPage,
  PasswordResetPage,
  PendingVerificationPage,
  ProviderOnboardingPage,
} from "./features/auth/AccountFlows";
import {
  ClientDashboardPage,
  LegacyClientRoute,
  RequestEntryRoute,
} from "./features/client/ClientDashboardPage";
import { SharedExamples } from "./features/client/SharedExamples";
import ManagerDashboard from "./features/manager/Dashboard";
import RequestInbox from "./features/manager/Requests";
import QuoteBuilder from "./features/manager/QuoteBuilder";
import ManagerJobs from "./features/manager/Jobs";
import ManagerSchedule from "./features/manager/Schedule";
import Invoices from "./features/manager/Invoices";
import ManagerTeam from "./features/manager/Team";
import EmployeeJobs from "./features/employee/Jobs";
import EmployeeJobDetail from "./features/employee/JobDetail";
import AdminCompanies from "./features/admin/Companies";
import AdminCatalog from "./features/admin/Catalog";
import "./styles/client.css";
import ManagerDisputes from "./features/manager/Disputes";

type Role = "manager" | "employee" | "admin";

function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const items = roleNav[role];

  const activeHref = items.reduce<string>((current, item) => {
    const isExactMatch = location.pathname === item.href;
    const isNestedMatch = item.href !== "/" && location.pathname.startsWith(`${item.href}/`);
    if (isExactMatch || isNestedMatch) {
      return item.href.length > current.length ? item.href : current;
    }
    return current;
  }, items[0]?.href ?? "/");

  const subtitleMap: Record<Role, string> = {
    manager: "Manager · BrightFix",
    employee: "Employee · BrightFix",
    admin: "Admin · BrightFix",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar
        items={items}
        activeHref={activeHref}
        userName={user?.name ?? "Amizka"}
        subtitle={subtitleMap[role]}
        onNavigate={(href) => navigate(href)}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: 12, padding: "10px 24px",
          borderBottom: "1px solid #e8e8e8", background: "white",
        }}>
          <NotificationBell />
          <span style={{ fontSize: 13, color: "#666" }}>{user?.name}</span>
        </header>
        <main style={{ flex: 1, padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}

function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession()
  if (!user) return <Navigate to="/login" replace />
  if (user.email_verified === false) return <Navigate to="/verify-email" replace />
  if (user.must_change_password) return <Navigate to="/change-password" replace />
  if (user.role !== role) return <Navigate to={destination(user)} replace />
  if (role === 'manager' && user.company_status !== 'APPROVED') return <Navigate to="/pending-verification" replace />
  return <>{children}</>
}

export default function App() {
  return <BrowserRouter>
    <SessionProvider>
      <Routes>
        <Route element={<ClientShell />}>
          <Route index element={<LandingPage />} />
          <Route path="services" element={<DirectoryPage />} />
          <Route path="companies" element={<DirectoryPage />} />
          <Route path="companies/:id" element={<CompanyRoute />} />
          <Route path="companies/:id/request" element={<ClientGuard><RequestEntryRoute /></ClientGuard>} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage register />} />
          <Route path="verify-email" element={<EmailVerificationPage />} />
          <Route path="pending-verification" element={<PendingVerificationPage />} />
          <Route path="account-status" element={<PendingVerificationPage />} />
          <Route path="password-reset" element={<PasswordResetPage />} />
          <Route path="provider-onboarding" element={<ProviderOnboardingPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="workspace" element={<WorkspacePage />} />
          <Route path="style-guide" element={<StyleGuidePage />} />
          <Route path="client" element={<ClientGuard><ClientDashboardPage /></ClientGuard>} />
          {(['requests', 'quotations', 'jobs', 'invoices', 'profile'] as const).map(tab => (
            <Route key={tab} path={`client/${tab}`} element={<ClientGuard><LegacyClientRoute tab={tab} /></ClientGuard>} />
          ))}
          {(['requests', 'quotations', 'jobs', 'invoices'] as const).map(tab => (
            <Route key={tab} path={`client/${tab}/:id`} element={<ClientGuard><LegacyClientRoute tab={tab} /></ClientGuard>} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/manager" element={<RoleGuard role="manager"><Shell role="manager"><ManagerDashboard /></Shell></RoleGuard>} />
        <Route path="/manager/requests" element={<RoleGuard role="manager"><Shell role="manager"><RequestInbox /></Shell></RoleGuard>} />
        <Route path="/manager/pipeline" element={<RoleGuard role="manager"><Shell role="manager"><Pipeline /></Shell></RoleGuard>} />
        <Route path="/manager/quotations/:requestId" element={<RoleGuard role="manager"><Shell role="manager"><QuoteBuilder /></Shell></RoleGuard>} />
        <Route path="/manager/jobs" element={<RoleGuard role="manager"><Shell role="manager"><ManagerJobs /></Shell></RoleGuard>} />
        <Route path="/manager/schedule" element={<RoleGuard role="manager"><Shell role="manager"><ManagerSchedule /></Shell></RoleGuard>} />
        <Route path="/manager/invoices" element={<RoleGuard role="manager"><Shell role="manager"><Invoices /></Shell></RoleGuard>} />
        <Route path="/manager/business" element={<RoleGuard role="manager"><Shell role="manager"><MyBusiness /></Shell></RoleGuard>} />
        <Route path="/manager/team" element={<RoleGuard role="manager"><Shell role="manager"><ManagerTeam /></Shell></RoleGuard>} />
        <Route path="/manager/ai" element={<RoleGuard role="manager"><Shell role="manager"><FlowAIPlaceholder /></Shell></RoleGuard>} />
        <Route path="/manager/company" element={<RoleGuard role="manager"><Navigate to="/manager/business" replace /></RoleGuard>} />

        <Route path="/employee" element={<RoleGuard role="employee"><Navigate to="/employee/jobs" replace /></RoleGuard>} />
        <Route path="/employee/jobs" element={<RoleGuard role="employee"><Shell role="employee"><EmployeeJobs /></Shell></RoleGuard>} />
        <Route path="/employee/jobs/:jobId" element={<RoleGuard role="employee"><Shell role="employee"><EmployeeJobDetail /></Shell></RoleGuard>} />
        <Route path="/employee/schedule" element={<RoleGuard role="employee"><Navigate to="/employee/jobs" replace /></RoleGuard>} />

        <Route path="/admin" element={<RoleGuard role="admin"><Shell role="admin"><AdminDashboard /></Shell></RoleGuard>} />
        <Route path="/admin/companies" element={<RoleGuard role="admin"><Shell role="admin"><AdminCompanies /></Shell></RoleGuard>} />
        <Route path="/admin/catalog" element={<RoleGuard role="admin"><Shell role="admin"><AdminCatalog /></Shell></RoleGuard>} />
        <Route path="/admin/requests" element={<RoleGuard role="admin"><Shell role="admin"><AdminAllRequestsJobs /></Shell></RoleGuard>} />
        <Route path="/admin/disputes" element={<RoleGuard role="admin"><Shell role="admin"><AdminDisputes /></Shell></RoleGuard>} />
        <Route path="/admin/settings" element={<RoleGuard role="admin"><Shell role="admin"><AdminSettingsPlaceholder /></Shell></RoleGuard>} />
        <Route path="/manager/disputes" element={<RoleGuard role="manager"><Shell role="manager"><ManagerDisputes /></Shell></RoleGuard>} />
     </Routes>
    </SessionProvider>
  </BrowserRouter>
}

function FlowAIPlaceholder() {
  return <div>
    <PageHeader title="Flow AI" description="Ask questions about your policies and business data." />
    <SurfaceCard className="max-w-2xl p-5">
      <p className="text-sm text-text-secondary">
        Flow AI is being built by Member 4. The panel will appear here once the
        {' '}<code>/ai/ask-docs</code> and <code>/ai/ask-data</code> endpoints are live.
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        In the meantime, upload policies in <Link className="sf-link" to="/manager/business">My Business → Policies</Link> so
        the AI has documents to reference when it launches.
      </p>
    </SurfaceCard>
  </div>
}

function AdminSettingsPlaceholder() {
  return <div>
    <PageHeader title="Settings" description="Platform settings." />
    <SurfaceCard className="max-w-2xl p-5">
      <p className="text-sm text-text-secondary">
        Platform-wide settings are not yet exposed by the backend.
        Use the API docs at <code>/docs</code> for administrative operations until this endpoint ships.
      </p>
    </SurfaceCard>
  </div>
}

function StyleGuidePage() {
  const [modal, setModal] = useState(false)
  return <><PageHeader eyebrow="SHARED UI · MEMBER 1" title="The ServiceFlow toolkit" description="One shared component library for public, client and operational screens. All examples below use sample content." /><div className="grid items-start gap-6 lg:grid-cols-2"><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Actions</h2><div className="flex flex-wrap gap-4"><ActionButton variant="stamp" onClick={() => setModal(true)}>Open example dialog</ActionButton><ActionButton>Secondary</ActionButton><ActionButton variant="void">Destructive</ActionButton><ActionButton disabled>Unavailable</ActionButton></div><Notice>Use the yellow stamp for the primary action. Pair destructive actions with confirmation.</Notice></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Form fields</h2><TextField label="Service address" placeholder="Enter your address" /><TextField label="Email address" error="Enter a valid email address." defaultValue="sample" /><SelectField label="Service"><option>Basic inspection</option></SelectField><TextField label="Unavailable field" disabled value="Not editable" /></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Status vocabulary</h2><div className="flex flex-wrap gap-3">{(['awaiting', 'approved', 'declined', 'scheduled', 'in_progress', 'completed', 'paid', 'unpaid', 'cancelled'] as const).map(status => <StatusBadge key={status} status={status} />)}</div><p className="text-sm text-text-secondary">Use the backend state and a text label. A status color alone is insufficient.</p></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Feedback</h2><Skeleton rows={2} /><Notice error>Sample error: this appointment is no longer available.</Notice><EmptyState title="No requests yet" description="Your service requests will appear here." /></SurfaceCard></div><SharedExamples /><Modal open={modal} title="Example confirmation" description="This demonstrates the shared keyboard-accessible dialog." onClose={() => setModal(false)}><ActionButton variant="stamp" onClick={() => setModal(false)}>Close example</ActionButton></Modal></>
}
function CompanyRoute() {
  const { id } = useParams()
  return <CompanyPage key={id} />
}

function NotFoundPage() {
  return <><PageHeader title="We couldn’t find that page" description="The link may have changed or the record may be unavailable." /><Link className="sf-link" to="/services">Browse services →</Link></>
}