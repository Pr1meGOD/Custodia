import { AlertTriangle, Check, Download, FolderLock, Search, ShieldCheck, ShieldQuestion, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fmtTime, truncAddr, truncMid, useCustodia } from "@/lib/custodia";
import { AiScoreBadge, CopyChip, Panel, ReviewBadge, StatusPill } from "./bits";
import { VerifyDialog } from "./VerifyDialog";

function downloadFromIPFS(r) {
  const url = `https://gateway.pinata.cloud/ipfs/${r.cid}`;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.click();
  toast("Download started", { description: `Evidence #${r.id}` });
}

function VerifyBadge({ v }) {
  if (!v) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ShieldQuestion className="size-3.5" />Not verified</span>;
  return v === "verified" ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-success-soft px-2 py-0.5 text-xs font-semibold text-success"><ShieldCheck className="size-3.5" />Verified</span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-danger-soft px-2 py-0.5 text-xs font-semibold text-destructive"><AlertTriangle className="size-3.5" />Mismatch</span>
  );
}

function StatusEditor({ r }) {
  const { updateStatus } = useCustodia();
  const STATUS_MAP = { "Open": 0, "Under Review": 1, "Closed": 2 };
  const [s, setS] = useState(String(r.statusIdx));
  const [busy, setBusy] = useState(false);

  const handleUpdate = async () => {
    setBusy(true);
    try {
      toast.info(`Updating status for evidence #${r.id} — please confirm in MetaMask…`);
      await updateStatus(r.id, parseInt(s));
      toast.success(`Status updated for evidence #${r.id}`);
    } catch (err) {
      console.error("updateStatus failed:", err);
      toast.error("Failed to update status: " + (err.message || "Transaction rejected"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <select value={s} onChange={(e) => setS(e.target.value)} disabled={busy} className="h-8 rounded-md border border-input bg-card px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40">
        <option value="0">Open</option>
        <option value="1">Under Review</option>
        <option value="2">Closed</option>
      </select>
      <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" disabled={parseInt(s) === r.statusIdx || busy} onClick={handleUpdate}>Update</Button>
    </div>
  );
}

/** Intermediary-only: approve / reject an evidence entry on-chain */
function ReviewActions({ r }) {
  const { reviewEvidence } = useCustodia();
  const [busy, setBusy] = useState(null); // "approve" | "reject" | null

  const handle = async (approve) => {
    setBusy(approve ? "approve" : "reject");
    try {
      toast.info(`${approve ? "Approving" : "Rejecting"} evidence #${r.id} — please confirm in MetaMask…`);
      await reviewEvidence(r.id, approve);
      toast.success(`Evidence #${r.id} ${approve ? "approved" : "rejected"}`);
    } catch (err) {
      console.error("reviewEvidence failed:", err);
      toast.error("Review failed: " + (err.message || "Transaction rejected"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" disabled={!!busy || r.reviewStatus === "Approved"} onClick={() => handle(true)} className="h-8 px-2.5 text-xs hover:border-success/50 hover:bg-success-soft hover:text-success">
        <Check className="size-3.5" /> {busy === "approve" ? "…" : "Approve"}
      </Button>
      <Button size="sm" variant="outline" disabled={!!busy || r.reviewStatus === "Rejected"} onClick={() => handle(false)} className="h-8 px-2.5 text-xs hover:border-destructive/50 hover:bg-danger-soft hover:text-destructive">
        <X className="size-3.5" /> {busy === "reject" ? "…" : "Reject"}
      </Button>
    </div>
  );
}

/**
 * mode: "officer" | "court" | "intermediary" | "victim"
 * records (optional): override the global record list (used by the Victim dashboard for case scoping)
 */
export function EvidenceTable({ mode, records: recordsOverride, title, description }) {
  const { records: allRecords, loading } = useCustodia();
  const records = recordsOverride ?? allRecords;
  const [q, setQ] = useState("");
  const [verifying, setVerifying] = useState(null);
  const [results, setResults] = useState({});
  const court = mode === "court";
  const intermediary = mode === "intermediary";
  const victim = mode === "victim";
  const canVerify = court || intermediary || victim; // verify is read-only (no state change)

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? records.filter((r) => r.caseId.toLowerCase().includes(s) || r.uploader.toLowerCase().includes(s) || r.description.toLowerCase().includes(s)) : records;
  }, [records, q]);

  const actions = (r) => (
    <div className="flex items-center gap-1.5">
      {intermediary && <ReviewActions r={r} />}
      {canVerify && (
        <Button size="sm" onClick={() => setVerifying(r)} className="h-8 bg-accent px-3 text-xs text-accent-foreground hover:bg-accent/90">
          <ShieldCheck className="size-3.5" /> Verify
        </Button>
      )}
      <button onClick={() => downloadFromIPFS(r)} title="Download" className="grid size-8 place-items-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95">
        <Download className="size-4" />
      </button>
    </div>
  );

  const defaultDescription = court
    ? "Re-hash any file against its on-chain record to confirm integrity."
    : intermediary
      ? "Review each submission and approve or reject it. Your decision is recorded on-chain."
      : victim
        ? "Read-only view of evidence linked to your case. You can verify file integrity at any time."
        : "Every record below is anchored to the custody contract.";

  return (
    <Panel
      title={title || "Evidence records"}
      description={description || defaultDescription}
      icon={<FolderLock className="size-4" />}
      action={
        <div className="relative hidden w-64 sm:block">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by Case ID or uploader" className="h-9 pl-8 text-sm" />
        </div>
      }
    >
      <div className="relative mb-4 sm:hidden">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by Case ID or uploader" className="h-9 pl-8 text-sm" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
          <span className="mb-4 grid size-12 place-items-center rounded-full bg-muted"><FolderLock className="size-6 text-muted-foreground" /></span>
          <p className="font-medium">{q ? "No records match your filter" : victim ? "No evidence linked to your case yet" : "No evidence on record yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{q ? "Try a different Case ID or wallet address." : victim ? "Once the admin links your wallet to a case and evidence is filed, it will appear here." : "Once an officer uploads evidence, it will appear here with its cryptographic fingerprint."}</p>
        </div>
      ) : (
        <>
          {/* desktop table */}
          <div className="-mx-5 hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5">ID</th><th className="px-3 py-2.5">Case</th><th className="px-3 py-2.5">Description</th><th className="px-3 py-2.5">CID</th><th className="px-3 py-2.5">Uploader</th><th className="px-3 py-2.5">Timestamp</th><th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Review</th><th className="px-3 py-2.5">AI check</th>
                  {canVerify && <th className="px-3 py-2.5">Integrity</th>}
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className={cn("transition-colors hover:bg-muted/50", results[r.id] === "mismatch" && "bg-danger-soft/60")}>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">#{String(r.id).padStart(3, "0")}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium">{r.caseId}</td>
                    <td className="max-w-[240px] px-3 py-3"><p className="line-clamp-2">{r.description}</p></td>
                    <td className="px-3 py-3"><CopyChip value={r.cid} display={truncMid(r.cid, 10, 5)} /></td>
                    <td className="px-3 py-3 font-mono text-xs">{truncAddr(r.uploader)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{fmtTime(r.timestamp)}</td>
                    <td className="px-3 py-3">{court ? <div className="space-y-1.5"><StatusPill status={r.status} /><StatusEditor r={r} /></div> : <StatusPill status={r.status} />}</td>
                    <td className="px-3 py-3"><ReviewBadge status={r.reviewStatus} /></td>
                    <td className="px-3 py-3"><AiScoreBadge score={r.aiFakeScore} /></td>
                    {canVerify && <td className="px-3 py-3"><VerifyBadge v={results[r.id]} /></td>}
                    <td className="px-5 py-3"><div className="flex justify-end">{actions(r)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* stacked cards for mobile */}
          <ul className="space-y-3 lg:hidden">
            {rows.map((r) => (
              <li key={r.id} className={cn("space-y-3 rounded-lg border p-4", results[r.id] === "mismatch" && "border-destructive/40 bg-danger-soft/60")}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-mono text-xs text-muted-foreground">#{String(r.id).padStart(3, "0")} · <span className="font-medium text-foreground">{r.caseId}</span></p><p className="mt-1 text-sm">{r.description}</p></div>
                  <StatusPill status={r.status} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-xs">
                  <dt className="text-muted-foreground">CID</dt><dd className="min-w-0"><CopyChip value={r.cid} display={truncMid(r.cid, 12, 6)} /></dd>
                  <dt className="text-muted-foreground">Uploader</dt><dd className="font-mono">{truncAddr(r.uploader)}</dd>
                  <dt className="text-muted-foreground">Time</dt><dd>{fmtTime(r.timestamp)}</dd>
                  <dt className="text-muted-foreground">Review</dt><dd><ReviewBadge status={r.reviewStatus} /></dd>
                  <dt className="text-muted-foreground">AI check</dt><dd><AiScoreBadge score={r.aiFakeScore} /></dd>
                  {canVerify && <><dt className="text-muted-foreground">Integrity</dt><dd><VerifyBadge v={results[r.id]} /></dd></>}
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">{court && <StatusEditor r={r} />}{actions(r)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      {canVerify && <VerifyDialog record={verifying} onClose={() => setVerifying(null)} onResult={(id, v) => setResults((m) => ({ ...m, [id]: v }))} />}
    </Panel>
  );
}
