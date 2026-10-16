import { ScanSearch } from "lucide-react";
import { AppShell } from "@/components/custodia/AppShell";
import { EvidenceTable } from "@/components/custodia/EvidenceTable";
import { AccessDenied } from "@/components/custodia/bits";
import { useCustodia } from "@/lib/custodia";

export default function Intermediary() {
  const { role, records } = useCustodia();
  const count = (s) => records.filter((r) => r.reviewStatus === s).length;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-lg bg-violet-600 text-white"><ScanSearch className="size-5" /></span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Intermediary review</h1>
            <p className="mt-1 text-sm text-muted-foreground">Human judgement gate — evidence is only treated as officially valid once approved here.</p>
          </div>
        </div>
        {role === "Intermediary" && (
          <div className="flex gap-6 text-sm">
            <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-semibold">{count("Pending")}</p></div>
            <div><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-semibold text-success">{count("Approved")}</p></div>
            <div><p className="text-xs text-muted-foreground">Rejected</p><p className="text-xl font-semibold text-destructive">{count("Rejected")}</p></div>
          </div>
        )}
      </div>
      {role === "Intermediary" ? <EvidenceTable mode="intermediary" /> : <AccessDenied required="Intermediary" />}
    </AppShell>
  );
}
