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
