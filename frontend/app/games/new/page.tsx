import Link from "next/link";
import { CreateGameStepper } from "@/components/games/CreateGameStepper";

export default function NewGamePage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
        <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wider">
          Games
        </Link>
        <span>/</span>
        <span className="uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>New</span>
      </div>

      <h1
        className="font-display text-3xl font-700 uppercase tracking-wider mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        Create a Game
      </h1>
      <p className="font-mono text-xs mb-10" style={{ color: "var(--text-muted)" }}>
        Add game details, upload your film, and run the tracking pipeline.
      </p>

      <CreateGameStepper />
    </div>
  );
}
