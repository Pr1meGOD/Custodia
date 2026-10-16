import { HeartHandshake } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/custodia/AppShell";
import { EvidenceTable } from "@/components/custodia/EvidenceTable";
import { AccessDenied } from "@/components/custodia/bits";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustodia } from "@/lib/custodia";

export default function Victim() {
  const { role, records, loadMyVictimCases } = useCustodia();
  const [myCases, setMyCases] = useState(null); // Set<string> | null while loading

  // Find which caseIds have caseVictim(caseId) == connected wallet
  useEffect(() => {
    if (role !== "Victim") return;
    let cancelled = false;
    setMyCases(null);
    loadMyVictimCases(records)
      .then((s) => !cancelled && setMyCases(s))
      .catch((err) => {
        console.error("Failed to resolve victim cases:", err);
        if (!cancelled) setMyCases(new Set());
      });
    return () => { cancelled = true; };
  }, [role, records, loadMyVictimCases]);

  const mine = useMemo(() => (myCases ? records.filter((r) => myCases.has(r.caseId)) : []), [records, myCases]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-lg bg-rose-600 text-white"><HeartHandshake className="size-5" /></span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My case</h1>
            <p className="mt-1 text-sm text-muted-foreground">Read-only view of the evidence filed in your case. Nothing here can be changed from this account.</p>
          </div>
        </div>
        {role === "Victim" && myCases && (
          <div className="flex gap-6 text-sm">
            <div><p className="text-xs text-muted-foreground">Linked cases</p><p className="font-mono text-xl font-semibold">{myCases.size ? [...myCases].join(", ") : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Evidence items</p><p className="text-xl font-semibold">{mine.length}</p></div>
          </div>
        )}
      </div>
      {role !== "Victim" ? (
        <AccessDenied required="Victim" />
      ) : myCases === null ? (
        <div className="space-y-3 rounded-lg border bg-card p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <EvidenceTable mode="victim" records={mine} title="Evidence in my case" />
      )}
    </AppShell>
  );
}
