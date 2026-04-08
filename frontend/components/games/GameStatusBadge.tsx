import { GAME_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Status = keyof typeof GAME_STATUSES;

interface GameStatusBadgeProps {
  status: string;
  className?: string;
}

export function GameStatusBadge({ status, className }: GameStatusBadgeProps) {
  const s = GAME_STATUSES[status as Status] ?? {
    label: status,
    color: "text-zinc-400",
    bg: "bg-zinc-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs uppercase tracking-wider",
        s.bg,
        s.color,
        className
      )}
    >
      {status === "PROCESSING" && (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--status-processing)" }} />
      )}
      {status === "READY" && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-ready)" }} />
      )}
      {status === "ERROR" && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-error)" }} />
      )}
      {s.label}
    </span>
  );
}
