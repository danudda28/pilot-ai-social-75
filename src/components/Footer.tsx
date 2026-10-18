import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import anpcSol from "@/assets/anpc-sol.png.asset.json";
import { PRODUCTS, SOLUTIONS } from "@/lib/marketing";

export function Footer() {
  return (
    <footer className="relative mt-8 border-t border-white/8">
      <div className="m-container grid gap-12 py-16 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 text-lg font-medium text-white">
            <img src={logoAsset.url} alt="" className="h-7 w-7 object-contain" />
            Social Spark
          </div>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/45">
            Managerul de social media al afacerii tale. Creează, programează și publică — fără agenție.
          </p>
          <p className="mt-8 text-2xl font-medium tracking-tight text-white/90">Noul tău team de social.</p>
        </div>
        <Col title="Produse" items={PRODUCTS} to="/produse/$slug" />
        <Col title="Soluții" items={SOLUTIONS} to="/solutii/$slug" />
        <div>
          <h2 className="text-[13px] font-medium text-white">Companie</h2>
          <ul className="mt-4 space-y-2.5 text-[14px] text-white/45">
            <li><Link to="/preturi" className="hover:text-white">Prețuri</Link></li>
            <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link to="/despre" className="hover:text-white">Despre</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
          </ul>
          <h2 className="mt-8 text-[13px] font-medium text-white">Politici</h2>
          <ul className="mt-4 space-y-2.5 text-[14px] text-white/45">
            <li><Link to="/termeni-si-conditii" className="hover:text-white">Termeni</Link></li>
            <li><Link to="/politica-confidentialitate" className="hover:text-white">Confidențialitate</Link></li>
            <li><Link to="/cookies" className="hover:text-white">Cookies</Link></li>
          </ul>
        </div>
      </div>
      <div className="m-container flex flex-col gap-4 border-t border-white/8 py-6 text-[12px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Social Spark. Toate drepturile rezervate.</p>
        <a href="https://eservicii.anpc.ro/" target="_blank" rel="noopener noreferrer" className="inline-flex rounded bg-white p-1">
          <img src={anpcSol.url} alt="ANPC" className="h-8 w-auto" />
        </a>
      </div>
    </footer>
  );
}

function Col({
  title,
  items,
  to,
}: {
  title: string;
  items: { slug: string; nav: string }[];
  to: "/produse/$slug" | "/solutii/$slug";
}) {
  return (
    <div>
      <h2 className="text-[13px] font-medium text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-[14px] text-white/45">
        {items.map((item) => (
          <li key={item.slug}>
            <Link to={to} params={{ slug: item.slug }} className="hover:text-white">{item.nav}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
