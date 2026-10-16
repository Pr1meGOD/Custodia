import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/custodia/AppShell";
import { AdminPanel } from "@/components/custodia/AdminPanel";
import { UploadPanel } from "@/components/custodia/UploadPanel";
import { EvidenceTable } from "@/components/custodia/EvidenceTable";
import { useCustodia } from "@/lib/custodia";

export default function Dashboard() {
  const { role, records, isAdmin } = useCustodia();
  if (role === "Victim") return <Navigate to="/victim" replace />; // victims only get the case-scoped view
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? "Administration" : "Evidence intake"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {role}. All actions are recorded on the custody ledger.</p>
        </div>
        <div className="flex gap-6 text-sm">
          <div><p className="text-xs text-muted-foreground">Records</p><p className="text-xl font-semibold">{records.length}</p></div>
          <div><p className="text-xs text-muted-foreground">Open cases</p><p className="text-xl font-semibold">{records.filter((r) => r.status !== "Closed").length}</p></div>
        </div>
      </div>
      {isAdmin && <AdminPanel />}
      {(role === "Police" || isAdmin) && <UploadPanel />}
      <EvidenceTable mode="officer" />
    </AppShell>
  );
}
