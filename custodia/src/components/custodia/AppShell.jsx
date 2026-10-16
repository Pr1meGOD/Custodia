import { Link, useNavigate } from "react-router-dom";
import { LogOut, Wallet } from "lucide-react";
import { Logo, RoleBadge } from "./bits";
import { truncAddr, useCustodia } from "@/lib/custodia";

export function AppShell({ children }) {
  const { address, role, disconnect } = useCustodia();
  const navigate = useNavigate();

  if (!address) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/"><Logo /></Link>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              {role === "Victim" ? (
                <Link to="/victim" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">My case</Link>
              ) : (
                <>
                  <Link to="/dashboard" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Evidence</Link>
                  <Link to="/court" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Verification</Link>
                  {role === "Intermediary" && (
                    <Link to="/intermediary" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Review</Link>
                  )}
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
              <Wallet className="size-4 text-muted-foreground" />
              <span className="hidden font-mono text-xs sm:inline">{truncAddr(address)}</span>
              <RoleBadge role={role} />
            </div>
            <button onClick={disconnect} title="Disconnect" className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
