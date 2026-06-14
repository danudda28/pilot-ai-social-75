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
        <div className="mt-10 pt-6 border-t border-border/40 text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-3">
          <p>© {new Date().getFullYear()} Social Spark. Toate drepturile rezervate.</p>
          <div className="flex gap-4">
            <Link to="/politica-confidentialitate" className="hover:text-foreground">Politica de confidențialitate</Link>
            <Link to="/termeni-si-conditii" className="hover:text-foreground">Termeni și condiții</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
