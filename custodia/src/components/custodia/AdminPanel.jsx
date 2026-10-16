import { ChevronDown, KeyRound, Link2, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isAddress, truncAddr, useCustodia } from "@/lib/custodia";
import { RoleBadge } from "./bits";

export function AdminPanel() {
  const { assignRole, revokeRole, assignVictimToCase } = useCustodia();
  const [open, setOpen] = useState(true);
  const [addr, setAddr] = useState("");
  const [role, setRole] = useState("1"); // "1" = Police, "2" = Court, "3" = Intermediary
  const [busy, setBusy] = useState(false);
  const valid = isAddress(addr);

  // Victim → case linking
  const [victimAddr, setVictimAddr] = useState("");
  const [victimCase, setVictimCase] = useState("");
  const victimValid = isAddress(victimAddr) && /^\d+$/.test(victimCase.trim());

  const ROLE_NAMES = { "1": "Police", "2": "Court", "3": "Intermediary" };

  const handleLinkVictim = async () => {
    if (!victimValid) return;
    setBusy(true);
    try {
      toast.info(`Linking victim to case ${victimCase.trim()} — please confirm in MetaMask…`);
      await assignVictimToCase(victimCase.trim(), victimAddr.trim());
      toast.success(`Victim linked to case ${victimCase.trim()}`, { description: truncAddr(victimAddr.trim()) });
      setVictimAddr("");
      setVictimCase("");
    } catch (err) {
      console.error("assignVictimToCase failed:", err);
      toast.error("Victim linking failed: " + (err.message || "Transaction rejected"));
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      toast.info(`Assigning ${ROLE_NAMES[role]} role — please confirm in MetaMask…`);
      await assignRole(addr.trim(), role);
      toast.success(`${ROLE_NAMES[role]} role assigned`, { description: truncAddr(addr.trim()) });
      setAddr("");
    } catch (err) {
      console.error("assignRole failed:", err);
      toast.error("Role assignment failed: " + (err.message || "Transaction rejected"));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      toast.info("Revoking role — please confirm in MetaMask…");
      await revokeRole(addr.trim());
      toast.success("Role revoked", { description: truncAddr(addr.trim()) });
      setAddr("");
    } catch (err) {
      console.error("revokeRole failed:", err);
      toast.error("Role revocation failed: " + (err.message || "Transaction rejected"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border bg-card shadow-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><KeyRound className="size-4" /></span>
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">Role management <RoleBadge role="Admin" /></h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Grant or revoke on-chain permissions for officers, court officials, intermediaries and victims.</p>
          </div>
        </div>
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-8 border-t p-5 lg:grid-cols-2">
          <div className="space-y-4 max-w-lg">
            <div className="space-y-1.5">
              <Label htmlFor="addr">Wallet address</Label>
              <Input id="addr" placeholder="0x…" value={addr} onChange={(e) => setAddr(e.target.value)} className="font-mono text-xs" disabled={busy} />
              {addr && !valid && <p className="text-xs text-destructive">Enter a valid 42-character address.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} disabled={busy} className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
                <option value="1">🚔 Police</option>
                <option value="2">⚖️ Court</option>
                <option value="3">🔎 Intermediary</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button disabled={!valid || busy} onClick={handleAssign} className="flex-1">
                <UserPlus className="size-4" /> Assign role
              </Button>
              <Button variant="outline" disabled={!valid || busy} onClick={handleRevoke} className="flex-1 hover:border-destructive/40 hover:text-destructive">
                <UserMinus className="size-4" /> Revoke
              </Button>
            </div>
          </div>

          <div className="space-y-4 max-w-lg lg:border-l lg:pl-8">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">Link victim to case <RoleBadge role="Victim" /></h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Grants the Victim role and gives read-only access to that case's evidence. Use Revoke (left) to remove it.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="victim-case">Case ID</Label>
              <Input id="victim-case" type="number" min="1" placeholder="e.g. 10042" value={victimCase} onChange={(e) => setVictimCase(e.target.value)} className="font-mono" disabled={busy} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="victim-addr">Victim wallet address</Label>
              <Input id="victim-addr" placeholder="0x…" value={victimAddr} onChange={(e) => setVictimAddr(e.target.value)} className="font-mono text-xs" disabled={busy} />
              {victimAddr && !isAddress(victimAddr) && <p className="text-xs text-destructive">Enter a valid 42-character address.</p>}
            </div>
            <Button id="btn-link-victim" disabled={!victimValid || busy} onClick={handleLinkVictim} className="w-full">
              <Link2 className="size-4" /> Link victim
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
