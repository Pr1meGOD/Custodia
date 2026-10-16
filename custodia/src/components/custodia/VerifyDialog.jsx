import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCustodia } from "@/lib/custodia";
import { StepTracker } from "./StepTracker";

const STEPS = ["Fetching from IPFS", "Re-hashing file", "Reading blockchain", "Comparing"];

export function VerifyDialog({ record, onClose, onResult }) {
  const { verifyEvidence } = useCustodia();
  const [step, setStep] = useState(0);
  const [outcome, setOutcome] = useState(null); // "verified" | "mismatch" | null
  const [recomputedHash, setRecomputedHash] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!record) return;
    setStep(0);
    setOutcome(null);
    setRecomputedHash("");
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        const result = await verifyEvidence(
          record.id,
          record.cid,
          record.fileHash,
          (s) => {
            if (!cancelled) setStep(s + 1); // +1 because onStep(0) = first step active, we want step 1 done
          }
        );
        if (!cancelled) {
          setStep(STEPS.length); // all done
          setOutcome(result.outcome);
          setRecomputedHash(result.recomputedHash);
          onResult(record.id, result.outcome);
          if (result.outcome === "verified") {
            toast.success("Verification complete — integrity confirmed", { description: `Case ${record.caseId}` });
          } else {
            toast.error("Verification failed — hash mismatch", { description: `Case ${record.caseId}` });
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`Verification failed for evidence #${record.id}:`, err);
          setError(err.message);
          setOutcome("error");
          onResult(record.id, "mismatch");
          toast.error(`Evidence #${record.id}: Verification failed — ${err.message}`);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  const finished = step >= STEPS.length;
  const ok = outcome === "verified";

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Integrity verification</DialogTitle>
          <DialogDescription>
            <span className="font-mono">Case {record?.caseId}</span> · Evidence #{record?.id}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-background p-4"><StepTracker steps={STEPS} current={step} /></div>

        <div className="space-y-2 rounded-lg border p-4 font-mono text-[11px] leading-relaxed">
          <div><p className="mb-0.5 font-sans text-xs text-muted-foreground">On-chain SHA-256</p><p className="break-all">{record?.fileHash}</p></div>
          <div>
            <p className="mb-0.5 font-sans text-xs text-muted-foreground">Recomputed SHA-256</p>
            <p className={finished ? (ok ? "break-all text-success" : "break-all text-destructive") : "break-all text-muted-foreground/50"}>
              {step >= 2 ? (recomputedHash || "computing…") : "computing…"}
            </p>
          </div>
        </div>

        {error && (
          <div className="animate-pop flex items-center gap-4 rounded-xl border-2 border-destructive/40 bg-danger-soft p-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-card"><AlertTriangle className="size-7" /></span>
            <div>
              <p className="text-lg font-semibold text-destructive">Verification Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {finished && !error && (
          ok ? (
            <div className="animate-pop flex items-center gap-4 rounded-xl border-2 border-success/40 bg-success-soft p-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-success text-primary-foreground shadow-card"><ShieldCheck className="size-7" /></span>
              <div>
                <p className="text-lg font-semibold text-success">Verified — Not Tampered</p>
                <p className="text-sm text-muted-foreground">The file matches the hash recorded on-chain. Chain of custody intact.</p>
              </div>
            </div>
          ) : (
            <div className="animate-pop flex items-center gap-4 rounded-xl border-2 border-destructive/40 bg-danger-soft p-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-card"><AlertTriangle className="size-7" /></span>
              <div>
                <p className="text-lg font-semibold text-destructive">Mismatch Detected</p>
                <p className="text-sm text-muted-foreground">This file differs from the on-chain record. Treat as potentially tampered evidence.</p>
              </div>
            </div>
          )
        )}
        {(finished || error) && <Button variant="outline" onClick={onClose}>Close</Button>}
      </DialogContent>
    </Dialog>
  );
}
