function Logo() {
  return (
    <span
      className="relative h-[22px] w-[22px] shrink-0 rounded-[6px]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 25% 20%, rgba(255,255,255,.35), transparent 55%), linear-gradient(135deg, #F472B6 0%, #8A5CF6 100%)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,.12), 0 2px 10px -2px rgba(244,114,182,.5)",
      }}
    >
      <span
        className="absolute inset-[5px] rounded-[2px]"
        style={{
          background:
            "linear-gradient(rgba(255,255,255,.95),rgba(255,255,255,.95)) 0 20%/100% 1px no-repeat,linear-gradient(rgba(255,255,255,.85),rgba(255,255,255,.85)) 0 55%/100% 1px no-repeat,linear-gradient(rgba(255,255,255,.75),rgba(255,255,255,.75)) 0 90%/100% 1px no-repeat",
        }}
      />
    </span>
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
              <span>IdxBeaver</span>
            </a>
            <p className="mb-5 max-w-[320px] text-[13.5px] leading-[1.55] text-[var(--color-ink-mute)]">
              A native-feeling database client for the storage your browser already has.
            </p>
          </div>
          <FooterCol
            heading="Product"
            links={[
              { label: "Features", href: "#features" },
              { label: "Query", href: "#query" },
              { label: "Install", href: "#install" },
              {
                label: "Releases",
                href: "https://github.com/adityaongit/idxbeaver/releases",
              },
            ]}
          />
          <FooterCol
            heading="Resources"
            links={[
              { label: "Docs", href: "https://github.com/adityaongit/idxbeaver#readme" },
              { label: "GitHub", href: "https://github.com/adityaongit/idxbeaver" },
              { label: "Issues", href: "https://github.com/adityaongit/idxbeaver/issues" },
            ]}
          />
          <FooterCol
            heading="Project"
            links={[
              {
                label: "License · MIT",
                href: "https://github.com/adityaongit/idxbeaver/blob/main/LICENSE",
              },
              { label: "Privacy · none", href: "#" },
              {
                label: "Contact",
                href: "https://github.com/adityaongit/idxbeaver/issues/new",
              },
            ]}
          />
        </div>
        <div className="mono flex flex-wrap justify-between gap-4 border-t border-[var(--color-hair)] pt-6 text-[11px] text-[var(--color-ink-faint)]">
          <div>© 2026 IdxBeaver · v1.0.0</div>
          <div>Built with hairlines</div>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = { label: string; href: string };

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
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
