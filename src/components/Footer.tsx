import { Link } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import anpcSal from "@/assets/anpc-sal.png.asset.json";
import anpcSol from "@/assets/anpc-sol.png.asset.json";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border/50 glass-strong">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <img src={logoAsset.url} alt="Social Spark" className="h-9 w-9 object-contain" />
              Social <span className="gradient-text">Spark</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm">
              Automatizare AI pentru Instagram și Facebook. Postări generate, programate și publicate fără efort.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Navigare</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground">Acasă</Link></li>
              <li><Link to="/despre" className="hover:text-foreground">Despre noi</Link></li>
              <li><Link to="/preturi" className="hover:text-foreground">Prețuri</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> 0784 227 844</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> bogdansergiu.arghir@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted-foreground">Protecția consumatorului:</span>
            <a
              href="https://anpc.ro/ce-este-sal/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ANPC — Soluționarea Alternativă a Litigiilor"
              className="block rounded-md bg-white p-1 hover:opacity-90 transition"
            >
              <img src={anpcSal.url} alt="ANPC SAL" loading="lazy" className="h-12 w-auto object-contain" />
            </a>
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ANPC — Soluționarea Online a Litigiilor"
              className="block rounded-md bg-white p-1 hover:opacity-90 transition"
            >
              <img src={anpcSol.url} alt="ANPC SOL" loading="lazy" className="h-12 w-auto object-contain" />
            </a>
            <a
              href="https://eservicii.anpc.ro/?_gl=1*1w1z9e0*_ga*Mjk1NjI5ODA5LjE3ODE0NDAxNjk.*_ga_FDVTGP2007*czE3ODE0NDAxNjgkbzEkZzAkdDE3ODE0NDAxNzYkajUyJGwwJGgw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Depune o sesizare la ANPC
            </a>
          </div>
          <div className="text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-3">
            <p>© {new Date().getFullYear()} Social Spark. Toate drepturile rezervate.</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/politica-confidentialitate" className="hover:text-foreground">Politica de confidențialitate</Link>
              <Link to="/termeni-si-conditii" className="hover:text-foreground">Termeni și condiții</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
