"use client";

import { useState } from "react";
import { Step1Metadata } from "./steps/Step1Metadata";
import { Step2Upload } from "./steps/Step2Upload";
import { Step3Processing } from "./steps/Step3Processing";

const STEPS = [
  { label: "Details", number: 1 },
  { label: "Upload", number: 2 },
  { label: "Process", number: 3 },
];

export function CreateGameStepper() {
  const [step, setStep] = useState(1);
  const [gameId, setGameId] = useState<number | null>(null);

  return (
    <div>
      {/* Step indicators */}
      <div className="flex items-center mb-10">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center">
            {/* Step circle */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-500 transition-all"
                style={{
                  background: step === s.number ? "var(--accent)" : step > s.number ? "rgba(34,197,94,0.2)" : "var(--bg-overlay)",
                  color: step === s.number ? "#0d0d0f" : step > s.number ? "var(--status-ready)" : "var(--text-muted)",
                  border: step > s.number ? "1px solid var(--status-ready)" : "1px solid var(--border-bright)",
                }}
              >
                {step > s.number ? "✓" : s.number}
              </div>
              <span
                className="font-mono text-xs uppercase tracking-wider"
                style={{ color: step === s.number ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {s.label}
              </span>
            </div>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div
                className="mx-4 h-px flex-1 w-12"
                style={{ background: step > s.number ? "var(--status-ready)" : "var(--border)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div
        className="p-8 rounded-lg"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
      >
        {step === 1 && (
          <Step1Metadata
            onNext={(id) => {
              setGameId(id);
              setStep(2);
            }}
          />
        )}
        {step === 2 && gameId && (
          <Step2Upload gameId={gameId} onNext={() => setStep(3)} />
        )}
        {step === 3 && gameId && <Step3Processing gameId={gameId} />}
      </div>
    </div>
  );
}
