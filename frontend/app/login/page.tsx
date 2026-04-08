import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center field-grid relative"
    >
      {/* Ambient glow at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, rgba(245,166,35,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center font-display font-800 text-base"
              style={{ background: "var(--accent)", color: "#0d0d0f" }}
            >
              ST
            </div>
            <span
              className="font-display text-2xl font-700 tracking-wider uppercase"
              style={{ color: "var(--text-primary)" }}
            >
              SnapTag
            </span>
          </div>
          <p
            className="font-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Tag every play. Know every player.
          </p>
        </div>

        {/* Card */}
        <div
          className="p-8 rounded-lg"
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
          }}
        >
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
