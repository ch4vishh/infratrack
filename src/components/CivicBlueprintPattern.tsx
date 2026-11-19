import React from "react";

export function CivicBlueprintPattern({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* 1. Base soft radial warm-sage & cream gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_50%_50%,rgba(163,185,170,0.42)_0%,rgba(202,218,208,0.22)_40%,rgba(247,246,240,0)_75%)]" />

      {/* 2. Authentic civic blueprint topographic underlay (from user asset) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.13] mix-blend-multiply contrast-125"
        style={{ backgroundImage: "url('/civic-blueprint-map.jpg')" }}
      />

      {/* 3. Custom precision inline SVG: Orthogonal Civic Street Grid + Topographic Elevation Blueprint */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07] text-[#163D2C]"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          {/* Minor blocks (20px) */}
          <pattern id="civic-minor-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>

          {/* Major civic avenue grid (100px) */}
          <pattern id="civic-major-grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#civic-minor-grid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1.2" />
            {/* Coordinate intersection crosshair */}
            <path
              d="M 50 44 L 50 56 M 44 50 L 56 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
            />
          </pattern>
        </defs>

        {/* Global Grid Fill */}
        <rect width="100%" height="100%" fill="url(#civic-major-grid)" />

        {/* Central Civic Hub & Radial Arteries */}
        <g transform="translate(720, 260)">
          {/* Concentric civic plaza rings */}
          <circle
            cx="0"
            cy="0"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <circle cx="0" cy="0" r="95" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle
            cx="0"
            cy="0"
            r="160"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="8 4"
          />
          <circle cx="0" cy="0" r="240" fill="none" stroke="currentColor" strokeWidth="0.8" />

          {/* Radial Boulevards */}
          <line x1="-600" y1="0" x2="600" y2="0" stroke="currentColor" strokeWidth="2" />
          <line x1="0" y1="-300" x2="0" y2="300" stroke="currentColor" strokeWidth="2" />
          <line x1="-420" y1="-240" x2="420" y2="240" stroke="currentColor" strokeWidth="1.4" />
          <line x1="-420" y1="240" x2="420" y2="-240" stroke="currentColor" strokeWidth="1.4" />
        </g>

        {/* Topographic Contour Elevation Curves (Left Terrain) */}
        <path
          d="M -50 40 C 120 70, 180 180, 140 320 C 100 460, 240 520, 280 650"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M -80 80 C 80 110, 140 210, 100 340 C 60 480, 190 560, 230 680"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
        />
        <path
          d="M -110 130 C 40 160, 95 250, 60 370 C 20 500, 140 590, 180 710"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
        />
        <path
          d="M -140 180 C 0 210, 50 290, 20 400 C -10 520, 90 620, 130 740"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
        />

        {/* Topographic Contour Elevation Curves (Right Terrain & Hill Ridge) */}
        <path
          d="M 1250 20 C 1380 90, 1440 230, 1370 380 C 1300 520, 1410 630, 1520 720"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M 1290 60 C 1410 130, 1470 260, 1410 400 C 1340 540, 1450 660, 1560 740"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
        />
        <path
          d="M 1330 100 C 1440 170, 1500 290, 1440 430 C 1380 570, 1480 680, 1600 760"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
        />

        {/* Topographic Elevation Rings (Northeast Hill Formation) */}
        <path
          d="M 1380 140 C 1420 120, 1470 130, 1490 160 C 1510 190, 1490 230, 1450 240 C 1410 250, 1370 230, 1355 200 C 1340 170, 1360 150, 1380 140 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M 1395 155 C 1425 140, 1460 148, 1475 170 C 1490 192, 1475 220, 1445 228 C 1415 235, 1385 220, 1375 198 C 1365 176, 1380 162, 1395 155 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M 1410 170 C 1430 160, 1450 165, 1460 180 C 1470 195, 1460 210, 1440 215 C 1420 220, 1400 210, 1395 195 C 1390 180, 1400 172, 1410 170 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
        />

        {/* Southwest Valley Contours */}
        <path
          d="M 50 680 C 140 640, 220 670, 270 740 C 310 800, 280 860, 210 880"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M 20 720 C 110 680, 180 710, 230 770 C 270 830, 240 880, 180 900"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
        />

        {/* Survey Coordinates & Benchmark Marks */}
        <g fontSize="9" fontFamily="monospace" fill="currentColor" letterSpacing="1">
          <text x="40" y="35">
            GRID REF: IN-BLR-04
          </text>
          <text x="40" y="50">
            ELEV: 920M
          </text>
          <text x="1320" y="35">
            LAT: 12°58&apos;23&quot;N
          </text>
          <text x="1320" y="50">
            LNG: 77°35&apos;45&quot;E
          </text>
          <text x="680" y="490">
            CIVIC PLAZA CENTRAL
          </text>
        </g>
      </svg>

      {/* 4. Edge blending gradients to smoothly marry with adjacent sections */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}
