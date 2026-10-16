import { Scale } from "lucide-react";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/custodia/AppShell";
import { EvidenceTable } from "@/components/custodia/EvidenceTable";
import { useCustodia } from "@/lib/custodia";

export default function Court() {
  const { role } = useCustodia();
  if (role === "Victim") return <Navigate to="/victim" replace />; // victims only get the case-scoped view
  return (
    <AppShell>
      <div className="flex items-start gap-4">
        <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground"><Scale className="size-5" /></span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Court verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">Confirm each exhibit is byte-for-byte identical to what was originally submitted.</p>
        </div>
      </div>
      <EvidenceTable mode="court" />
    </AppShell>
  );
}
