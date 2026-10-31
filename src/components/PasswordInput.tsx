import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  id?: string;
  className?: string;
  /** Light panel (reset-password) vs dark marketing auth panel */
  tone?: "dark" | "light";
};

export function PasswordInput({
  value,
  onChange,
  required,
  autoComplete = "current-password",
  id,
  className = "",
  tone = "dark",
}: Props) {
  const [show, setShow] = useState(false);
  const inputCls =
    tone === "dark"
      ? "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-4 pr-12 text-sm text-white outline-none focus:border-[var(--m-accent)]"
      : "mt-1.5 w-full rounded-lg border border-border bg-input/50 py-3 pl-4 pr-12 text-sm outline-none focus:border-primary";
  const btnCls =
    tone === "dark"
      ? "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/45 hover:bg-white/5 hover:text-white"
      : "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground";

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className={inputCls}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className={btnCls}
        aria-label={show ? "Ascunde parola" : "Arată parola"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
