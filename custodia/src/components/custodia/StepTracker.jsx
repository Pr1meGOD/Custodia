import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** current = index of in-progress step; steps < current are done; current >= length = all done */
export function StepTracker({ steps, current }) {
  return (
    <ol className="relative flex flex-col gap-0 sm:flex-row sm:items-start">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="relative flex flex-1 items-center gap-3 pb-5 sm:flex-col sm:pb-0 sm:text-center">
            {i < steps.length - 1 && (
              <>
                <span className="absolute left-4 top-8 h-full w-0.5 bg-border sm:left-1/2 sm:top-4 sm:ml-4 sm:h-0.5 sm:w-[calc(100%-2rem)]" />
                <span className={cn("absolute left-4 top-8 w-0.5 bg-success transition-all duration-500 sm:left-1/2 sm:top-4 sm:ml-4 sm:h-0.5", done ? "h-full sm:w-[calc(100%-2rem)]" : "h-0 sm:w-0")} />
              </>
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                done && "animate-pop border-success bg-success text-primary-foreground",
                active && "border-accent bg-accent-soft text-accent",
                !done && !active && "border-border bg-card text-muted-foreground"
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : active ? <Loader2 className="size-4 animate-spin" /> : i + 1}
            </span>
            <span className={cn("text-sm sm:mt-2 sm:text-xs", done ? "font-medium text-foreground" : active ? "font-medium text-accent" : "text-muted-foreground")}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
