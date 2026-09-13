import type { ActionCode } from "./types";

const ACTION_CLASS: Record<ActionCode, string> = {
  0: "hold",
  1: "adjust",
  2: "liquidate",
  3: "payout",
};

export function CyberFly({ action }: { action: ActionCode }) {
  return (
    <div className={`cyber-fly-wrap ${ACTION_CLASS[action]}`}>
      <div className="fly-ring ring-outer" />
      <div className="fly-ring ring-inner" />
      <svg
        className="cyber-fly"
        viewBox="0 0 440 360"
        role="img"
        aria-label="Cyber fruit fly"
      >
        <defs>
          <linearGradient id="fly-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6ee7b7" />
            <stop offset="0.55" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <radialGradient id="fly-eye" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f0fdfa" />
            <stop offset="0.25" stopColor="#67e8f9" />
            <stop offset="0.7" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#020617" />
          </radialGradient>
          <filter id="neon" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="fly-wings">
          <path
            className="wing wing-left"
            d="M220 178 C120 96 52 132 30 210 C64 250 142 242 220 214 Z"
          />
          <path
            className="wing wing-right"
            d="M220 178 C320 96 388 132 410 210 C376 250 298 242 220 214 Z"
          />
          <path className="wing-vein vein-left" d="M220 178 C145 138 85 168 46 210" />
          <path className="wing-vein vein-right" d="M220 178 C295 138 355 168 394 210" />
        </g>

        <g className="fly-body" filter="url(#neon)">
          <path
            d="M220 92 C206 136 199 168 202 210 C205 252 215 300 222 326 C229 300 239 252 242 210 C245 168 238 136 224 92 Z"
            fill="url(#fly-body)"
          />
          <ellipse cx="222" cy="126" rx="28" ry="34" fill="#0b0d10" opacity="0.7" />
          <ellipse cx="222" cy="286" rx="16" ry="24" fill="#0b0d10" opacity="0.5" />
        </g>

        <g className="fly-eyes">
          <ellipse cx="192" cy="92" rx="27" ry="21" fill="url(#fly-eye)" />
          <ellipse cx="252" cy="92" rx="27" ry="21" fill="url(#fly-eye)" />
          <circle cx="192" cy="92" r="5" fill="#fff" opacity="0.9" />
          <circle cx="252" cy="92" r="5" fill="#fff" opacity="0.9" />
        </g>

        <g className="fly-antennae">
          <path d="M192 78 C172 48 160 44 148 22" />
          <path d="M252 78 C272 48 284 44 296 22" />
          <circle cx="148" cy="22" r="6" className="antenna-tip" />
          <circle cx="296" cy="22" r="6" className="antenna-tip" />
        </g>

        <g className="fly-legs">
          <path d="M205 190 C165 186 132 200 106 230" />
          <path d="M239 190 C279 186 312 200 338 230" />
          <path d="M203 250 C160 252 128 272 110 306" />
          <path d="M241 250 C284 252 316 272 334 306" />
        </g>

        <g className="neural-web">
          <path className="neural-line n1" d="M222 142 C170 154 150 188 190 212" />
          <path className="neural-line n2" d="M222 142 C274 154 294 188 254 212" />
          <path className="neural-line n3" d="M222 214 C186 242 206 278 222 304" />
          <path className="neural-line n4" d="M222 214 C258 242 238 278 222 304" />
          <circle className="neural-node p1" cx="190" cy="212" r="5" />
          <circle className="neural-node p2" cx="254" cy="212" r="5" />
          <circle className="neural-node p3" cx="222" cy="304" r="5" />
          <circle className="neural-node p4" cx="222" cy="142" r="5" />
        </g>
      </svg>

      <div className="fly-scanline" />
    </div>
  );
}
