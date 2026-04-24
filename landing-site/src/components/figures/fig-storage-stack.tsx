export function FigStorageStack() {
  return (
    <svg viewBox="0 0 380 340" xmlns="http://www.w3.org/2000/svg" className="block h-auto w-full overflow-visible">
      <g className="illus-group-1">
        {/* disc cap */}
        <g className="disc-cap">
          <ellipse cx="190" cy="40" rx="44" ry="15" className="iso iso-draw" style={{ ["--dash" as never]: 280 }} />
          <line x1="146" y1="40" x2="146" y2="50" className="iso iso-dim iso-draw" style={{ ["--dash" as never]: 20 }} />
          <line x1="234" y1="40" x2="234" y2="50" className="iso iso-dim iso-draw" style={{ ["--dash" as never]: 20 }} />
          <ellipse cx="190" cy="50" rx="44" ry="15" className="iso iso-dim iso-draw" style={{ ["--dash" as never]: 280 }} />
        </g>
        {/* plate 1 */}
        <g className="plate p1">
          <path d="M 190 72 L 310 98 L 190 124 L 70 98 Z" className="iso iso-draw" style={{ ["--dash" as never]: 520, ["--delay" as never]: "0.1s" }} />
          <text x="324" y="102" className="iso-label iso-fade" style={{ ["--delay" as never]: "0.6s" }}>IDB</text>
        </g>
        {/* plate 2 */}
        <g className="plate p2">
          <path d="M 190 120 L 310 146 L 190 172 L 70 146 Z" className="iso iso-draw" style={{ ["--dash" as never]: 520, ["--delay" as never]: "0.2s" }} />
          <text x="324" y="150" className="iso-label iso-fade" style={{ ["--delay" as never]: "0.7s" }}>LS</text>
        </g>
        {/* plate 3 — accent */}
        <g className="plate p3">
          <path d="M 190 168 L 310 194 L 190 220 L 70 194 Z" className="iso iso-accent iso-draw" style={{ ["--dash" as never]: 520, ["--delay" as never]: "0.3s" }} />
          <circle cx="190" cy="194" r="2.5" className="iso-accent-dot iso-fade" style={{ ["--delay" as never]: "0.9s" }} />
          <text x="324" y="198" className="iso-label iso-label-active iso-fade" style={{ ["--delay" as never]: "0.8s" }}>SS ·</text>
        </g>
        {/* plate 4 */}
        <g className="plate p4">
          <path d="M 190 216 L 310 242 L 190 268 L 70 242 Z" className="iso iso-draw" style={{ ["--dash" as never]: 520, ["--delay" as never]: "0.4s" }} />
          <text x="324" y="246" className="iso-label iso-fade" style={{ ["--delay" as never]: "0.9s" }}>CK</text>
        </g>
        {/* plate 5 */}
        <g className="plate p5">
          <path d="M 190 264 L 310 290 L 190 316 L 70 290 Z" className="iso iso-draw" style={{ ["--dash" as never]: 520, ["--delay" as never]: "0.5s" }} />
          <text x="324" y="294" className="iso-label iso-fade" style={{ ["--delay" as never]: "1s" }}>$C</text>
        </g>
      </g>
    </svg>
  );
}
