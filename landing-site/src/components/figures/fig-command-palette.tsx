export function FigCommandPalette() {
  return (
    <svg viewBox="0 0 380 340" xmlns="http://www.w3.org/2000/svg" className="block h-auto w-full overflow-visible">
      <g>
        {/* ⌘K floating key */}
        <g className="cmd-key">
          <rect x="260" y="40" width="52" height="22" rx="5" className="iso iso-draw" style={{ ["--dash" as never]: 160 }} />
          <text
            x="272"
            y="55"
            fontFamily="Geist Mono, monospace"
            fontSize="11"
            fill="rgba(255,255,255,.7)"
            className="iso-fade"
            style={{ ["--delay" as never]: "0.4s" }}
          >
            ⌘K
          </text>
          <line x1="286" y1="68" x2="286" y2="84" className="iso iso-dim iso-draw" style={{ ["--dash" as never]: 20, ["--delay" as never]: "0.5s" }} />
          <path d="M 282 80 L 286 84 L 290 80" className="iso iso-dim iso-draw" style={{ ["--dash" as never]: 16, ["--delay" as never]: "0.55s" }} />
        </g>

        {/* palette frame */}
        <rect x="60" y="92" width="260" height="210" rx="10" className="iso iso-draw" style={{ ["--dash" as never]: 940, ["--delay" as never]: "0.15s" }} />

        {/* input divider */}
        <line x1="60" y1="126" x2="320" y2="126" className="iso iso-dim iso-draw" style={{ ["--dash" as never]: 260, ["--delay" as never]: "0.3s" }} />
        <text x="76" y="115" fontFamily="Geist Mono, monospace" fontSize="11" fill="rgba(255,255,255,.55)" className="iso-fade" style={{ ["--delay" as never]: "0.5s" }}>›</text>
        <text x="92" y="115" fontFamily="Geist Mono, monospace" fontSize="11" fill="rgba(255,255,255,.8)" className="iso-fade" style={{ ["--delay" as never]: "0.55s" }}>open events</text>
        <rect x="167" y="106" width="2" height="11" fill="var(--color-ir-2)" className="iso-fade cmd-caret" style={{ ["--delay" as never]: "0.6s" }} />

        {/* result row 1 — active */}
        <g>
          <rect x="68" y="140" width="244" height="24" rx="4" fill="rgba(244,114,182,.1)" className="palette-row-bg pr1" />
          <circle cx="80" cy="152" r="3" className="iso-dot iso-fade" style={{ ["--delay" as never]: "0.7s" }} />
          <text x="92" y="156" fontFamily="Geist Mono, monospace" fontSize="10.5" fill="rgba(255,255,255,.8)" className="iso-fade" style={{ ["--delay" as never]: "0.65s" }}>open store · events</text>
          <text x="276" y="156" fontFamily="Geist Mono, monospace" fontSize="9" fill="rgba(255,255,255,.4)" className="iso-fade" style={{ ["--delay" as never]: "0.7s" }}>IDB</text>
        </g>
        {/* result row 2 */}
        <g>
          <rect x="68" y="172" width="244" height="24" rx="4" fill="rgba(244,114,182,.06)" className="palette-row-bg pr2" />
          <text x="80" y="188" fontFamily="Geist Mono, monospace" fontSize="10.5" fill="rgba(255,255,255,.55)" className="iso-fade" style={{ ["--delay" as never]: "0.75s" }}>★ saved · upcoming reviews</text>
          <text x="272" y="188" fontFamily="Geist Mono, monospace" fontSize="9" fill="rgba(255,255,255,.35)" className="iso-fade" style={{ ["--delay" as never]: "0.8s" }}>query</text>
        </g>
        {/* result row 3 */}
        <g>
          <rect x="68" y="204" width="244" height="24" rx="4" fill="rgba(244,114,182,.04)" className="palette-row-bg pr3" />
          <text x="80" y="220" fontFamily="Geist Mono, monospace" fontSize="10.5" fill="rgba(255,255,255,.45)" className="iso-fade" style={{ ["--delay" as never]: "0.85s" }}>⇪ export NDJSON</text>
          <text x="264" y="220" fontFamily="Geist Mono, monospace" fontSize="9" fill="rgba(255,255,255,.3)" className="iso-fade" style={{ ["--delay" as never]: "0.9s" }}>action</text>
        </g>
        {/* result row 4 */}
        <g>
          <text x="80" y="252" fontFamily="Geist Mono, monospace" fontSize="10.5" fill="rgba(255,255,255,.35)" className="iso-fade" style={{ ["--delay" as never]: "0.95s" }}>⌫ clear store</text>
          <text x="272" y="252" fontFamily="Geist Mono, monospace" fontSize="9" fill="rgba(255,255,255,.25)" className="iso-fade" style={{ ["--delay" as never]: "1s" }}>action</text>
        </g>

        {/* footer hint */}
        <line x1="60" y1="274" x2="320" y2="274" className="iso iso-dim iso-draw" style={{ ["--dash" as never]: 260, ["--delay" as never]: "0.8s" }} />
        <text x="76" y="290" fontFamily="Geist Mono, monospace" fontSize="9" fill="rgba(255,255,255,.35)" className="iso-fade" style={{ ["--delay" as never]: "1.05s" }}>↑↓ navigate · ↵ select · esc close</text>
      </g>
    </svg>
  );
}
