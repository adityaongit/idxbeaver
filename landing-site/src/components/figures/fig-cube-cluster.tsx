export function FigCubeCluster() {
  return (
    <svg viewBox="0 0 380 340" xmlns="http://www.w3.org/2000/svg" className="block h-auto w-full overflow-visible">
      <g className="illus-group-2">
        {/* Cube A — center top */}
        <g className="cube cA">
          <path d="M 220 88 L 262 112 L 220 136 L 178 112 Z" className="iso iso-draw" style={{ ["--dash" as never]: 200, ["--delay" as never]: "0.1s" }} />
          <line x1="178" y1="112" x2="178" y2="160" className="iso iso-draw" style={{ ["--dash" as never]: 50, ["--delay" as never]: "0.25s" }} />
          <line x1="220" y1="136" x2="220" y2="184" className="iso iso-draw" style={{ ["--dash" as never]: 50, ["--delay" as never]: "0.25s" }} />
          <line x1="262" y1="112" x2="262" y2="160" className="iso iso-draw" style={{ ["--dash" as never]: 50, ["--delay" as never]: "0.25s" }} />
          <path d="M 178 160 L 220 184 L 262 160" className="iso iso-draw" style={{ ["--dash" as never]: 100, ["--delay" as never]: "0.4s" }} />
          <circle cx="220" cy="112" r="2.2" className="iso-dot iso-fade" style={{ ["--delay" as never]: "0.6s" }} />
          <text x="270" y="108" className="iso-label iso-fade" style={{ ["--delay" as never]: "0.8s" }}>app.acme</text>
        </g>

        {/* Cube B — left mid */}
        <g className="cube cB">
          <path d="M 130 152 L 166 172 L 130 192 L 94 172 Z" className="iso iso-draw" style={{ ["--dash" as never]: 170, ["--delay" as never]: "0.15s" }} />
          <line x1="94" y1="172" x2="94" y2="212" className="iso iso-draw" style={{ ["--dash" as never]: 42, ["--delay" as never]: "0.3s" }} />
          <line x1="130" y1="192" x2="130" y2="232" className="iso iso-draw" style={{ ["--dash" as never]: 42, ["--delay" as never]: "0.3s" }} />
          <line x1="166" y1="172" x2="166" y2="212" className="iso iso-draw" style={{ ["--dash" as never]: 42, ["--delay" as never]: "0.3s" }} />
          <path d="M 94 212 L 130 232 L 166 212" className="iso iso-draw" style={{ ["--dash" as never]: 82, ["--delay" as never]: "0.45s" }} />
          <circle cx="130" cy="172" r="1.9" className="iso-dot iso-fade" style={{ ["--delay" as never]: "0.7s" }} />
          <text x="28" y="170" className="iso-label iso-fade" style={{ ["--delay" as never]: "0.9s" }}>auth.acme</text>
        </g>

        {/* Cube C — accent (active frame) */}
        <g className="cube cC">
          <path d="M 270 184 L 312 208 L 270 232 L 228 208 Z" className="iso iso-accent iso-draw" style={{ ["--dash" as never]: 200, ["--delay" as never]: "0.2s" }} />
          <line x1="228" y1="208" x2="228" y2="258" className="iso iso-accent iso-draw" style={{ ["--dash" as never]: 52, ["--delay" as never]: "0.35s" }} />
          <line x1="270" y1="232" x2="270" y2="282" className="iso iso-accent iso-draw" style={{ ["--dash" as never]: 52, ["--delay" as never]: "0.35s" }} />
          <line x1="312" y1="208" x2="312" y2="258" className="iso iso-accent iso-draw" style={{ ["--dash" as never]: 52, ["--delay" as never]: "0.35s" }} />
          <path d="M 228 258 L 270 282 L 312 258" className="iso iso-accent iso-draw" style={{ ["--dash" as never]: 100, ["--delay" as never]: "0.5s" }} />
          <circle cx="270" cy="208" r="2.6" className="iso-accent-dot iso-fade" style={{ ["--delay" as never]: "0.75s" }} />
          <text x="318" y="204" className="iso-label iso-label-active iso-fade" style={{ ["--delay" as never]: "0.95s" }}>iframe ·</text>
        </g>

        {/* Cube D — center bottom */}
        <g className="cube cD">
          <path d="M 180 232 L 218 254 L 180 276 L 142 254 Z" className="iso iso-draw" style={{ ["--dash" as never]: 180, ["--delay" as never]: "0.25s" }} />
          <line x1="142" y1="254" x2="142" y2="298" className="iso iso-draw" style={{ ["--dash" as never]: 46, ["--delay" as never]: "0.4s" }} />
          <line x1="180" y1="276" x2="180" y2="320" className="iso iso-draw" style={{ ["--dash" as never]: 46, ["--delay" as never]: "0.4s" }} />
          <line x1="218" y1="254" x2="218" y2="298" className="iso iso-draw" style={{ ["--dash" as never]: 46, ["--delay" as never]: "0.4s" }} />
          <path d="M 142 298 L 180 320 L 218 298" className="iso iso-draw" style={{ ["--dash" as never]: 90, ["--delay" as never]: "0.55s" }} />
          <circle cx="180" cy="254" r="2" className="iso-dot iso-fade" style={{ ["--delay" as never]: "0.8s" }} />
          <text x="42" y="254" className="iso-label iso-fade" style={{ ["--delay" as never]: "1s" }}>widget.3p</text>
        </g>
      </g>
    </svg>
  );
}
