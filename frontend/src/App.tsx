import type { ReactNode } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AppSidebar, roleNav } from "./components";

type Role = "manager" | "employee" | "admin";

const ManagerHome = () => <h1>ManagerHome</h1>;
//const RequestInbox = () => <h1>RequestInbox</h1>;
import RequestInbox from "./features/manager/Requests";
const QuoteBuilder = () => <h1>QuoteBuilder</h1>;
const ManagerJobs = () => <h1>ManagerJobs</h1>;
const ManagerSchedule = () => <h1>ManagerSchedule</h1>;
const ManagerInvoices = () => <h1>ManagerInvoices</h1>;
const ManagerTeam = () => <h1>ManagerTeam</h1>;
const PolicyPage = () => <h1>PolicyPage</h1>;
const EmployeeHome = () => <h1>EmployeeHome</h1>;
const EmployeeJobs = () => <h1>EmployeeJobs</h1>;
const EmployeeJobDetail = () => <h1>EmployeeJobDetail</h1>;
const EmployeeSchedule = () => <h1>EmployeeSchedule</h1>;
const AdminHome = () => <h1>AdminHome</h1>;
const AdminCompanies = () => <h1>AdminCompanies</h1>;
const AdminSettings = () => <h1>AdminSettings</h1>;

function Shell({ role, children }: { role: Role; children: ReactNode }) {
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
        userName="Chamari"
        subtitle={subtitleMap[role]}
        onNavigate={(href) => navigate(href)}
      />
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/manager" element={<Shell role="manager"><ManagerHome /></Shell>} />
        <Route path="/manager/requests" element={<Shell role="manager"><RequestInbox /></Shell>} />
        <Route path="/manager/quotations" element={<Shell role="manager"><RequestInbox /></Shell>} />
        <Route path="/manager/quotations/:requestId" element={<Shell role="manager"><QuoteBuilder /></Shell>} />
        <Route path="/manager/jobs" element={<Shell role="manager"><ManagerJobs /></Shell>} />
        <Route path="/manager/schedule" element={<Shell role="manager"><ManagerSchedule /></Shell>} />
        <Route path="/manager/invoices" element={<Shell role="manager"><ManagerInvoices /></Shell>} />
        <Route path="/manager/ai" element={<Shell role="manager"><PolicyPage /></Shell>} />
        <Route path="/manager/team" element={<Shell role="manager"><ManagerTeam /></Shell>} />

        <Route path="/employee" element={<Shell role="employee"><EmployeeHome /></Shell>} />
        <Route path="/employee/jobs" element={<Shell role="employee"><EmployeeJobs /></Shell>} />
        <Route path="/employee/jobs/:jobId" element={<Shell role="employee"><EmployeeJobDetail /></Shell>} />
        <Route path="/employee/schedule" element={<Shell role="employee"><EmployeeSchedule /></Shell>} />

        <Route path="/admin" element={<Shell role="admin"><AdminHome /></Shell>} />
        <Route path="/admin/companies" element={<Shell role="admin"><AdminCompanies /></Shell>} />
        <Route path="/admin/settings" element={<Shell role="admin"><AdminSettings /></Shell>} />

        <Route path="/" element={<Navigate to="/manager" replace />} />
      </Routes>
    </BrowserRouter>
  );
}