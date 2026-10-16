import { FileUp, Upload, X, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCustodia } from "@/lib/custodia";
import { AiScoreBadge, CopyChip, Panel } from "./bits";
import { StepTracker } from "./StepTracker";

const STEPS = ["Hashing file", "Checking authenticity", "Uploading to IPFS", "Writing to blockchain", "Confirmed"];

export function UploadPanel() {
  const { uploadEvidence, address, records = [], loadRecords } = useCustodia();
  const [selectedCaseOption, setSelectedCaseOption] = useState("");
  const [newCaseId, setNewCaseId] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const busy = step >= 0 && step < STEPS.length;

  useEffect(() => {
    loadRecords?.();
  }, [loadRecords]);

  // Derive unique case IDs and counts from evidence list
  const existingCases = useMemo(() => {
    const counts = new Map();
    for (const r of records || []) {
      if (r.caseId !== undefined && r.caseId !== null) {
        const id = String(r.caseId).trim();
        if (id) {
          counts.set(id, (counts.get(id) || 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([caseId, count]) => ({ caseId, count }))
      .sort((a, b) => {
        const numA = Number(a.caseId);
        const numB = Number(b.caseId);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.caseId.localeCompare(b.caseId);
      });
  }, [records]);

  const isNewCase = selectedCaseOption === "+ New case ID" || selectedCaseOption === "__NEW__";
  const trimmedNewCase = newCaseId.trim();
  const isDuplicateCase = Boolean(
    isNewCase &&
      trimmedNewCase &&
      existingCases.some(
        (c) =>
          c.caseId.toLowerCase() === trimmedNewCase.toLowerCase() ||
          (!isNaN(parseInt(c.caseId, 10)) &&
            !isNaN(parseInt(trimmedNewCase, 10)) &&
            parseInt(c.caseId, 10) === parseInt(trimmedNewCase, 10))
      )
  );

  const effectiveCaseId = isNewCase ? trimmedNewCase : selectedCaseOption;

  async function submit(e) {
    e.preventDefault();
    if (!file || !effectiveCaseId || isDuplicateCase || !address) return;
    setResult(null);
    setError(null);
    setStep(0);

    try {
      const res = await uploadEvidence(
        file,
        effectiveCaseId,
        desc.trim() || file.name,
        (s) => setStep(s),
        (msg) => toast.warning(msg) // AI check is optional — warn but keep going
      );
      setStep(STEPS.length); // all done
      setResult(res);
      toast.success("Evidence anchored on-chain", { description: `Case ${effectiveCaseId} · ${file.name}` });
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.message || "Unknown error");
      toast.error("Evidence upload failed: " + (err.message || "Unknown error"));
    }
  }

  function reset() {
    setSelectedCaseOption("");
    setNewCaseId("");
    setDesc("");
    setFile(null);
    setStep(-1);
    setResult(null);
    setError(null);
  }

  return (
    <Panel title="Upload evidence" description="Files are hashed locally (SHA-256), pinned to IPFS and anchored to the custody contract." icon={<FileUp className="size-4" />}>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="case">Case ID</Label>
            <select
              id="case"
              value={selectedCaseOption}
              onChange={(e) => setSelectedCaseOption(e.target.value)}
              disabled={busy}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                Select a case…
              </option>
              {existingCases.length > 0 ? (
                <optgroup label="Add to existing case">
                  {existingCases.map(({ caseId: cId, count }) => (
                    <option key={cId} value={cId}>
                      Case {cId} ({count} {count === 1 ? "item" : "items"})
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="Add to existing case">
                  <option value="" disabled>
                    No existing cases
                  </option>
                </optgroup>
              )}
              <option value="+ New case ID">+ New case ID</option>
            </select>

            {isNewCase && (
              <div className="space-y-1.5 pt-1">
                <Input
                  id="new-case"
                  type="number"
                  placeholder="Enter new case ID (e.g. 10042)"
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value)}
                  disabled={busy}
                  className={cn(
                    "font-mono",
                    isDuplicateCase && "border-destructive focus-visible:ring-destructive"
                  )}
                  min="1"
                  autoFocus
                />
                {isDuplicateCase && (
                  <p className="text-xs text-destructive">
                    This case ID already exists -- select it from the dropdown above instead
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={4} placeholder="e.g. CCTV footage from crime scene" value={desc} onChange={(e) => setDesc(e.target.value)} disabled={busy} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div
            onClick={() => !busy && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
            className={cn("flex min-h-[168px] flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors", drag ? "border-accent bg-accent-soft" : "hover:border-accent/50 hover:bg-muted/60", busy && "pointer-events-none opacity-60")}
          >
            <input ref={inputRef} type="file" hidden onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
            {file ? (
              <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 shadow-card">
                <FileUp className="size-5 text-accent" />
                <div className="text-left">
                  <p className="max-w-[220px] truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
              </div>
            ) : (
              <>
                <span className="mb-3 grid size-11 place-items-center rounded-full bg-muted"><Upload className="size-5 text-muted-foreground" /></span>
                <p className="text-sm font-medium">Drop evidence file here</p>
                <p className="mt-1 text-xs text-muted-foreground">or click to browse · any format</p>
              </>
            )}
          </div>
          <Button type="submit" size="lg" disabled={!file || !effectiveCaseId || isDuplicateCase || busy} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {busy ? "Securing evidence…" : "Hash & anchor evidence"}
          </Button>
        </div>
      </form>

      {step >= 0 && (
        <div className="mt-6 rounded-lg border bg-background p-5">
          <StepTracker steps={STEPS} current={step} />
          {error && (
            <div className="animate-pop mt-6 flex items-start gap-3 rounded-md border border-destructive/30 bg-danger-soft p-4">
              <span className="text-destructive font-semibold text-sm">❌ Upload failed: {error}</span>
            </div>
          )}
          {result && (
            <div className="animate-pop mt-6 flex flex-col gap-3 rounded-md border border-success/30 bg-success-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-semibold">Evidence secured. Chain of custody started.</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">IPFS CID <CopyChip value={result.cid} className="max-w-[300px] bg-card" /></div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">SHA-256 <CopyChip value={result.fileHash} display={`${result.fileHash.slice(0, 16)}…${result.fileHash.slice(-8)}`} className="bg-card" /></div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">Authenticity <AiScoreBadge score={result.aiFakeScore} /></div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>Upload another</Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
