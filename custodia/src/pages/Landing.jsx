import { Link } from "react-router-dom";
import { ArrowRight, Fingerprint, Loader2, Scale, Upload, Wallet, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo, RoleBadge } from "@/components/custodia/bits";
import { truncAddr, useCustodia } from "@/lib/custodia";

const FLOW = [
  { icon: Upload, title: "Upload", text: "An authorised officer submits evidence with its case ID and description." },
  { icon: Fingerprint, title: "Hash & Store", text: "The file is fingerprinted with SHA-256, pinned to IPFS, and the hash is written on-chain." },
  { icon: Scale, title: "Verify", text: "Courts re-hash the file at any time and compare it to the immutable record." },
];

const ROLE_HOME = {
  Court: { to: "/court", label: "verification" },
  Intermediary: { to: "/intermediary", label: "review dashboard" },
  Victim: { to: "/victim", label: "my case" },
};

export default function Landing() {
  const { address, role, connect, disconnect } = useCustodia();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await connect();
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-hero relative overflow-hidden text-primary-foreground">
        <div className="hero-grid absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6">
          <header className="flex h-20 items-center justify-between">
            <Logo inverted />
          </header>
          <div className="mx-auto max-w-3xl py-24 text-center sm:py-32">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1 text-xs font-medium text-primary-foreground/80">
              <span className="size-1.5 rounded-full bg-success" /> Chain-of-custody protocol
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Tamper-proof evidence,<br /><span className="text-accent">cryptographically verified.</span></h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-primary-foreground/65 sm:text-lg">Custodia anchors every piece of digital evidence to an immutable ledger — so officers, prosecutors and judges can trust what they see.</p>

            <div className="mt-10 flex flex-col items-center gap-4">
              {!address ? (
                <>
                  <Button size="lg" disabled={connecting} onClick={handleConnect} className="h-12 gap-2.5 bg-accent px-7 text-base text-accent-foreground shadow-card hover:bg-accent/90">
                    {connecting ? <Loader2 className="size-5 animate-spin" /> : <Wallet className="size-5" />}
                    {connecting ? "Waiting for wallet…" : "Connect Wallet"}
                  </Button>
                  {error && <p className="text-sm text-destructive-foreground bg-destructive/80 px-4 py-2 rounded-md">{error}</p>}
                </>
              ) : (
                <div className="animate-pop flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-2.5">
                    <span className="size-2 rounded-full bg-success" />
                    <span className="font-mono text-sm">{truncAddr(address)}</span>
                    <RoleBadge role={role} />
                    <button onClick={disconnect} title="Disconnect" className="text-primary-foreground/50 hover:text-primary-foreground"><LogOut className="size-4" /></button>
                  </div>
                  <Button asChild size="lg" className="h-12 gap-2 bg-primary-foreground px-7 text-base text-primary hover:bg-primary-foreground/90">
                    <Link to={ROLE_HOME[role]?.to || "/dashboard"}>Open {ROLE_HOME[role]?.label || "dashboard"} <ArrowRight className="size-4" /></Link>
                  </Button>
                </div>
              )}
              <p className="text-xs text-primary-foreground/45">Connect MetaMask to access role-based dashboards.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-accent">How it works</p>
        <h2 className="mt-2 text-center text-2xl font-semibold tracking-tight sm:text-3xl">A custody trail no one can quietly rewrite</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {FLOW.map((f, i) => (
            <div key={f.title} className="relative rounded-lg border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground"><f.icon className="size-5" /></span>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">© 2026 Custodia · Built for evidentiary integrity</footer>
    </div>
  );
}
