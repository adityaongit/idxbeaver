import { CHROME_WEB_STORE_URL } from "@/lib/brand";
import { APP_VERSION } from "@/lib/version";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-mark-128.png"
      alt=""
      width={28}
      height={28}
      className="h-[28px] w-[28px] shrink-0 select-none"
    />
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-hair)] py-16 pb-8">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="mb-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <a href="#" className="mb-4 flex items-center gap-[10px] text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
              <Logo />
              <span>
                <span className="text-[var(--color-brand)]">idx</span>beaver
              </span>
            </a>
            <p className="mb-5 max-w-[320px] text-[13.5px] leading-[1.55] text-[var(--color-ink-mute)]">
              A native-feeling database client for the storage your browser already has.
            </p>
          </div>
          <FooterCol
            heading="Product"
            links={[
              { label: "Features", href: "/#features" },
              { label: "Query", href: "/#query" },
              { label: "FAQ", href: "/faq" },
              { label: "Add to Chrome", href: CHROME_WEB_STORE_URL, external: true },
            ]}
          />
          <FooterCol
            heading="Resources"
            links={[
              { label: "Blog", href: "/blog" },
              { label: "vs DevTools panel", href: "/vs/chrome-devtools-application-panel" },
              { label: "Docs", href: "https://github.com/adityaongit/idxbeaver#readme", external: true },
              { label: "GitHub", href: "https://github.com/adityaongit/idxbeaver", external: true },
              {
                label: "Releases",
                href: "https://github.com/adityaongit/idxbeaver/releases",
                external: true,
              },
            ]}
          />
          <FooterCol
            heading="Project"
            links={[
              { label: "About", href: "/about" },
              {
                label: "License · MIT",
                href: "https://github.com/adityaongit/idxbeaver/blob/main/LICENSE",
                external: true,
              },
              { label: "Privacy", href: "/privacy" },
              {
                label: "Contact",
                href: "mailto:work.adityajindal@gmail.com",
              },
            ]}
          />
        </div>
        <div className="mono flex flex-wrap justify-between gap-4 border-t border-[var(--color-hair)] pt-6 text-[11px] text-[var(--color-ink-faint)]">
          <div>© 2026 IdxBeaver · v{APP_VERSION}</div>
          <div>Built with hairlines</div>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = { label: string; href: string; external?: boolean };

function FooterCol({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div>
      <h5 className="mono mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
        {heading}
      </h5>
      <ul className="list-none">
        {links.map((l) => (
          <li
            key={l.label}
            className="py-[5px] text-[13.5px] text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-ink)]"
          >
            <a
              href={l.href}
              {...(l.external ? { target: "_blank", rel: "noopener" } : {})}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
