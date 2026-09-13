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
      <div className="fly-halo" />
      <div className="fly-ring ring-outer" />
      <div className="fly-ring ring-mid" />
      <div className="fly-ring ring-inner" />
      <div className="orbit-dot dot-a" />
      <div className="orbit-dot dot-b" />
      <div className="orbit-dot dot-c" />

      <svg
        className="cyber-fly"
        viewBox="0 0 440 400"
        role="img"
        aria-label="Cyber fruit fly"
      >
        <defs>
          <linearGradient id="fly-body" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#eaffff" />
            <stop offset="0.24" stopColor="#7de9ff" />
            <stop offset="0.48" stopColor="#3a63ff" />
            <stop offset="0.72" stopColor="#7a3aff" />
            <stop offset="1" stopColor="#160a33" />
          </linearGradient>
          <linearGradient id="fly-armor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1a2140" />
            <stop offset="0.5" stopColor="#0b1230" />
            <stop offset="1" stopColor="#05070f" />
          </linearGradient>
          <linearGradient id="wing-film" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#00f0ff" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#ff3d8b" stopOpacity="0.34" />
            <stop offset="1" stopColor="#7a3aff" stopOpacity="0.44" />
          </linearGradient>
          <radialGradient id="fly-eye" cx="0.38" cy="0.34" r="0.72">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.16" stopColor="#ffd08a" />
            <stop offset="0.44" stopColor="#ff3d8b" />
            <stop offset="0.82" stopColor="#6d1cff" />
            <stop offset="1" stopColor="#120033" />
          </radialGradient>
          <radialGradient id="fly-halo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--fly-glow)" stopOpacity="0.6" />
            <stop offset="0.55" stopColor="var(--fly-glow)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--fly-glow)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="spark" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.32" stopColor="var(--fly-glow)" />
            <stop offset="1" stopColor="var(--fly-glow)" stopOpacity="0" />
          </radialGradient>
          <filter id="fly-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="soft" />
            <feMerge>
              <feMergeNode in="soft" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="fly-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="3.4" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="fly-halo-group">
          <circle cx="220" cy="186" r="150" fill="url(#fly-halo)" />
        </g>

        <g className="wing-set wing-set-upper">
          <g className="wing-unit">
            <path
              className="wing wing-left"
              d="M206 176 C150 112 74 92 34 146 C6 182 34 238 110 250 C160 254 192 224 206 194 Z"
            />
            <path className="wing-rim rim-left" d="M206 176 C150 112 74 92 34 146" />
            <path className="wing-vein v-l1" d="M198 182 C150 150 96 138 44 160" />
            <path className="wing-vein v-l2" d="M198 190 C156 176 108 176 62 200" />
            <path className="wing-vein v-l3" d="M200 198 C168 200 132 214 98 236" />
          </g>
          <g className="wing-unit">
            <path
              className="wing wing-right"
              d="M234 176 C290 112 366 92 406 146 C434 182 406 238 330 250 C280 254 248 224 234 194 Z"
            />
            <path className="wing-rim rim-right" d="M234 176 C290 112 366 92 406 146" />
            <path className="wing-vein v-r1" d="M242 182 C290 150 344 138 396 160" />
            <path className="wing-vein v-r2" d="M242 190 C284 176 332 176 378 200" />
            <path className="wing-vein v-r3" d="M240 198 C272 200 308 214 342 236" />
          </g>
        </g>

        <g className="wing-set wing-set-lower">
          <g className="wing-unit lower-left">
            <path
              className="wing wing-left-lower"
              d="M204 196 C156 192 104 214 82 258 C74 274 90 288 122 286 C164 284 194 250 204 216 Z"
            />
            <path className="wing-vein v-l4" d="M196 210 C156 214 122 232 102 258" />
          </g>
          <g className="wing-unit lower-right">
            <path
              className="wing wing-right-lower"
              d="M236 196 C284 192 336 214 358 258 C366 274 350 288 318 286 C276 284 246 250 236 216 Z"
            />
            <path className="wing-vein v-r4" d="M244 210 C284 214 318 232 338 258" />
          </g>
        </g>

        <g className="fly-torso">
          <ellipse cx="220" cy="196" rx="48" ry="66" fill="url(#fly-armor)" />
          <ellipse cx="220" cy="196" rx="48" ry="66" fill="none" stroke="var(--fly-glow)" strokeOpacity="0.5" strokeWidth="1.2" />
          <path
            className="fly-abdomen"
            d="M220 224 C208 254 202 296 210 344 C216 366 224 378 220 392 C216 378 224 366 230 344 C238 296 232 254 220 224 Z"
            fill="url(#fly-body)"
          />
          <path className="thorax-plate" d="M186 168 C204 158 236 158 254 168 L246 208 C232 216 208 216 194 208 Z" />
          <path className="thorax-plate plate-2" d="M192 214 C208 222 232 222 248 214 L244 244 C230 252 210 252 196 244 Z" />
          <g className="body-circuit">
            <path d="M198 176 L214 190 L206 206" />
            <path d="M242 176 L226 190 L234 206" />
            <path d="M220 236 L220 262" />
            <circle cx="214" cy="190" r="2.4" />
            <circle cx="226" cy="190" r="2.4" />
            <circle cx="220" cy="262" r="2.4" />
          </g>
        </g>

        <g className="head-group">
          <ellipse cx="220" cy="150" rx="40" ry="30" fill="url(#fly-armor)" />
          <ellipse className="compound-eye" cx="192" cy="140" rx="36" ry="31" fill="url(#fly-eye)" />
          <ellipse className="compound-eye" cx="248" cy="140" rx="36" ry="31" fill="url(#fly-eye)" />
          <g className="eye-grid" opacity="0.5">
            <path d="M170 128 H214 M170 140 H214 M170 152 H214" />
            <path d="M226 128 H270 M226 140 H270 M226 152 H270" />
            <path d="M178 120 V162 M192 118 V164 M206 122 V160" />
            <path d="M234 120 V162 M248 118 V164 M262 122 V160" />
          </g>
          <ellipse className="eye-spec" cx="180" cy="128" rx="11" ry="7" />
          <ellipse className="eye-spec" cx="236" cy="128" rx="11" ry="7" />
          <circle className="eye-core" cx="192" cy="140" r="7" />
          <circle className="eye-core" cx="248" cy="140" r="7" />
          <ellipse cx="220" cy="172" rx="10" ry="7" fill="#0b1230" />
        </g>

        <g className="costal-fringe">
          <path d="M220 162 C214 176 214 196 220 210" />
        </g>

        <g className="fly-antennae">
          <path d="M190 120 C168 84 150 62 132 40" />
          <path d="M250 120 C272 84 290 62 308 40" />
          <circle className="antenna-tip" cx="132" cy="40" r="7" />
          <circle className="antenna-tip" cx="308" cy="40" r="7" />
        </g>

        <g className="fly-legs">
          <path d="M196 200 C166 200 142 214 122 240" />
          <path d="M196 236 C168 244 148 262 134 292" />
          <path d="M200 268 C182 292 176 318 182 344" />
          <path d="M244 200 C274 200 298 214 318 240" />
          <path d="M244 236 C272 244 292 262 306 292" />
          <path d="M240 268 C258 292 264 318 258 344" />
        </g>

        <g className="neural-web">
          <path className="neural-line n1" d="M220 96 C168 118 128 160 122 214" />
          <path className="neural-line n2" d="M220 96 C272 118 312 160 318 214" />
          <path className="neural-line n3" d="M122 214 C150 288 186 330 220 352" />
          <path className="neural-line n4" d="M318 214 C290 288 254 330 220 352" />
          <circle className="neural-node p1" cx="122" cy="214" r="5" />
          <circle className="neural-node p2" cx="318" cy="214" r="5" />
          <circle className="neural-node p3" cx="220" cy="352" r="5" />
          <circle className="neural-node p4" cx="220" cy="96" r="5" />
        </g>

        <g className="fly-sparks">
          <circle className="spark s1" cx="58" cy="120" r="4" fill="url(#spark)" />
          <circle className="spark s2" cx="380" cy="108" r="3.4" fill="url(#spark)" />
          <circle className="spark s3" cx="90" cy="300" r="3" fill="url(#spark)" />
          <circle className="spark s4" cx="356" cy="296" r="3.6" fill="url(#spark)" />
          <circle className="spark s5" cx="150" cy="62" r="2.6" fill="url(#spark)" />
          <circle className="spark s6" cx="296" cy="58" r="2.8" fill="url(#spark)" />
        </g>
      </svg>

      <div className="fly-scanline" />
      <div className="fly-hud">
        <span className="hud-dot" />
        <span>CONNECTOME LIVE</span>
      </div>
    </div>
  );
}
