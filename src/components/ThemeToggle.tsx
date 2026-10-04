import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  useEffect(() => {
    const stored = (localStorage.getItem("ss-theme") as "dark" | "light" | null) ?? "light";
    setTheme(stored);
    document.documentElement.classList.toggle("dark", stored === "dark");
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ss-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }
  return (
    <button onClick={toggle} aria-label="Schimbă tema"
      className="rounded-lg border border-border bg-card px-2.5 py-2 text-sm hover:bg-secondary">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
