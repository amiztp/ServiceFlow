import { useState } from "react";
import {
  ActionButton,
  ResponsiveTable,
  Modal,
  TextField,
  EmptyState,
} from "../../components";
import { mockEmployees, type Employee } from "../../mocks/data";

export default function ManagerTeam() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const generatePassword = () =>
    Math.random().toString(36).slice(2, 8).toUpperCase();

  const addEmployee = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    const password = generatePassword();
    const employee: Employee = {
      id: `e-${Date.now()}`,
      fullName: newName.trim(),
      email: newEmail.trim(),
      isActive: true,
      hasActiveJobs: false,
    };

    setEmployees((current) => [...current, employee]);
    setTempPassword({ name: employee.fullName, password });
    setNewName("");
    setNewEmail("");
    setAdding(false);
  };

  const toggleActive = (emp: Employee) => {
    if (emp.isActive && emp.hasActiveJobs) {
      setBlockedReason(
        `${emp.fullName} has proposed, confirmed, or in-progress jobs. Reassign or cancel those before deactivating.`,
      );
      return;
    }
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === emp.id ? { ...employee, isActive: !employee.isActive } : employee,
      ),
    );
    setBlockedReason(null);
  };

  const activeCount = employees.filter((employee) => employee.isActive).length;
  const inactiveCount = employees.filter((employee) => !employee.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="sf-display text-2xl font-bold">Team</h1>
        <ActionButton variant="stamp" onClick={() => setAdding(true)}>
          + Add employee
        </ActionButton>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Active</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{activeCount}</p>
        </div>
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Inactive</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{inactiveCount}</p>
        </div>
      </div>

      {blockedReason && (
        <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
          {blockedReason}
        </div>
      )}

      <ResponsiveTable
        caption="Employees"
        rows={employees}
        columns={[
          {
            key: "name",
            heading: "Name",
            render: (employee) => (
              <div>
                <div className="font-semibold">{employee.fullName}</div>
                <div className="text-xs text-text-secondary">{employee.email}</div>
              </div>
            ),
          },
          {
            key: "active",
            heading: "Status",
            render: (employee) => (
              <span className={employee.isActive ? "text-sm" : "text-sm text-text-secondary"}>
                {employee.isActive ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            key: "jobs",
            heading: "Jobs",
            render: (employee) =>
              employee.hasActiveJobs ? (
                <span className="text-xs text-[#6E5600]">Has active jobs</span>
              ) : (
                <span className="text-xs text-text-secondary">No active jobs</span>
              ),
          },
          {
            key: "actions",
            heading: "",
            render: (employee) => (
              <ActionButton
                variant={employee.isActive ? "void" : "stub"}
                size="small"
                onClick={() => toggleActive(employee)}
              >
                {employee.isActive ? "Deactivate" : "Reactivate"}
              </ActionButton>
            ),
          },
        ]}
        empty={<EmptyState title="No employees yet" description="Add your first employee." />}
      />

      <Modal
        open={adding}
        title="Add employee"
        description="A temporary password will be generated. Show it to the employee once — they must change it at first login."
        onClose={() => {
          setAdding(false);
          setNewName("");
          setNewEmail("");
        }}
      >
        <div className="space-y-4">
          <TextField
            label="Full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <TextField
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <ActionButton
              variant="stub"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setNewEmail("");
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="stamp"
              disabled={!newName.trim() || !newEmail.trim()}
              onClick={addEmployee}
            >
              Create employee
            </ActionButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!tempPassword}
        title="Temporary password"
        description="This is shown only once. Copy it now."
        onClose={() => setTempPassword(null)}
      >
        {tempPassword && (
          <div className="space-y-4">
            <div className="rounded-docket border border-line bg-paper p-4 space-y-2">
              <p className="text-sm">
                <span className="text-text-secondary">Employee:</span>{" "}
                <strong>{tempPassword.name}</strong>
              </p>
              <p className="text-sm">
                <span className="text-text-secondary">Temp password:</span>{" "}
                <code className="sf-mono text-lg font-bold">{tempPassword.password}</code>
              </p>
            </div>
            <p className="text-xs text-[#6E5600]">
              Give this to the employee. They must change it on first login.
            </p>
            <div className="flex justify-end">
              <ActionButton variant="stamp" onClick={() => setTempPassword(null)}>
                I've saved it
              </ActionButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
