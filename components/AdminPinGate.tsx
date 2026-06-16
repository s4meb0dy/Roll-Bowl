"use client";

import { useState, type ReactNode } from "react";
import { Lock, Loader2 } from "lucide-react";
import { verifyAdminPinRemote, markAdminSessionUnlocked } from "@/lib/admin/pinClient";

type AdminPinGateProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  onUnlock: (pin: string) => void;
  /** Called inside the submit gesture (e.g. unlock Web Audio on kitchen page). */
  onUnlockGesture?: () => void;
};

export default function AdminPinGate({
  title,
  subtitle = "Voer je PIN in om verder te gaan",
  icon,
  onUnlock,
  onUnlockGesture,
}: AdminPinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || pin.length < 4) return;
    setLoading(true);
    setError(false);
    const ok = await verifyAdminPinRemote(pin);
    setLoading(false);
    if (ok) {
      onUnlockGesture?.();
      markAdminSessionUnlocked(pin);
      onUnlock(pin);
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mb-5 flex justify-center">{icon}</div>
        <h1 className="font-display mb-1 text-xl font-bold text-neutral-800">{title}</h1>
        <p className="mb-6 text-sm text-neutral-400">{subtitle}</p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoFocus
              disabled={loading}
              className={`input-field pl-9 text-center text-2xl tracking-[0.5em] ${
                error ? "border-red-300 bg-red-50" : ""
              }`}
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 animate-fade-in">Onjuiste PIN. Probeer opnieuw.</p>
          )}
          <button type="submit" disabled={loading || pin.length < 4} className="btn-primary w-full justify-center">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Controleren…
              </>
            ) : (
              "Ontgrendelen"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
