// The garden's paints and props as vector art: gradients, a shadow, and one
// symbol per object so every copy on the scale and on the conclusion board
// stays identical.
export function GardenDefs() {
  return (
    <defs>
      <GardenPaints />
      <ProduceSymbols />
      <GroupSymbol />
      <BasketSymbol />
    </defs>
  );
}

function GardenPaints() {
  return (
    <>
      <linearGradient id="garden-wood" x2="0" y2="1">
        <stop stopColor="#f6c185" />
        <stop offset=".45" stopColor="#b96a31" />
        <stop offset="1" stopColor="#653319" />
      </linearGradient>
      <linearGradient id="garden-gold" x2="0" y2="1">
        <stop stopColor="#ffeb9f" />
        <stop offset=".46" stopColor="#e0a951" />
        <stop offset="1" stopColor="#87501d" />
      </linearGradient>
      <linearGradient id="garden-turq" x2="0" y2="1">
        <stop stopColor="#78d2bb" />
        <stop offset=".38" stopColor="#377e70" />
        <stop offset="1" stopColor="#1a463d" />
      </linearGradient>
      <radialGradient id="garden-red" cx=".33" cy=".25" r=".77">
        <stop stopColor="#ffb96d" />
        <stop offset=".39" stopColor="#ed5233" />
        <stop offset="1" stopColor="#9f2633" />
      </radialGradient>
      <linearGradient id="garden-leaf" x1=".1" y1=".1" x2=".8" y2="1">
        <stop stopColor="#e6f6a5" />
        <stop offset=".45" stopColor="#7abd50" />
        <stop offset="1" stopColor="#237a40" />
      </linearGradient>
      <linearGradient id="garden-cuke" x1="0" y1=".2" x2=".8" y2="1">
        <stop stopColor="#a1dc72" />
        <stop offset=".52" stopColor="#579a50" />
        <stop offset="1" stopColor="#295e43" />
      </linearGradient>
      <linearGradient id="garden-paper" x2="0" y2="1">
        <stop stopColor="#ffe9b2" />
        <stop offset="1" stopColor="#d1a674" />
      </linearGradient>
      <filter id="garden-shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#251b14" floodOpacity=".32" />
      </filter>
    </>
  );
}

function ProduceSymbols() {
  return (
    <>
      <symbol id="garden-apple" viewBox="-37 -37 74 74">
        <path
          d="M0-13Q-12-24-26-15C-42-4-30 30-14 31Q-5 30 0 26Q10 35 23 29C43 15 39-14 22-19Q10-23 0-13Z"
          fill="url(#garden-red)"
          stroke="#8a3029"
          strokeWidth="1.7"
        />
        <path
          d="M-1-13Q0-23 6-32"
          fill="none"
          stroke="#794829"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M2-24Q15-40 28-30Q24-19 3-21" fill="url(#garden-leaf)" />
        <ellipse
          cx="-19"
          cy="-4"
          rx="7"
          ry="10"
          fill="#fff5bf"
          opacity=".37"
          transform="rotate(24 -19 -4)"
        />
      </symbol>
      <symbol id="garden-cabbage" viewBox="-40 -41 80 82">
        <path
          d="M-4 35Q-31 26-34 8T-25-17Q-26-39-8-34Q5-48 18-31Q37-33 33-10Q47 8 31 23Q14 39-4 35"
          fill="url(#garden-leaf)"
          stroke="#448b3e"
          strokeWidth="2"
        />
        <path
          d="M-6 34Q3 15 4-29M-5 27Q-8 3-24-15M1 29Q15 11 26-2M-3 16Q-16 12-29 4M4 9Q15 6 23-12"
          fill="none"
          stroke="#e8f3a3"
          strokeWidth="3"
          strokeLinecap="round"
          opacity=".72"
        />
        <path d="M-19 32Q-5 29 13 32L9 39H-11Z" fill="#e3edb4" />
      </symbol>
      <symbol id="garden-cucumber" viewBox="-35 -18 70 36">
        <path
          d="M-30-3Q-25-15 14-14Q32-15 34-5Q36 7 13 13Q-12 19-29 11Q-38 6-30-3Z"
          fill="url(#garden-cuke)"
          stroke="#365b38"
          strokeWidth="1.8"
        />
        <path
          d="M-22-2Q-9-8 18-7"
          fill="none"
          stroke="#d3f5a0"
          strokeWidth="3"
          opacity=".47"
          strokeLinecap="round"
        />
        <circle cx="-11" cy="8" r="1.7" fill="#386447" />
        <circle cx="4" cy="5" r="1.4" fill="#386447" />
        <circle cx="20" cy="1" r="1.4" fill="#386447" />
      </symbol>
    </>
  );
}

// A group of cucumbers in its frame, as the swaps leave them on the scale,
// drawn small for the conclusion board.
function GroupSymbol() {
  return (
    <symbol id="garden-group" viewBox="-28 -66 56 70">
      <rect
        x="-26"
        y="-63"
        width="52"
        height="64"
        rx="11"
        fill="#a0c47855"
        stroke="#e4dea0"
        strokeWidth="2.4"
      />
      <use href="#garden-cucumber" x="-22" y="-56" width="44" height="23" />
      <use href="#garden-cucumber" x="-22" y="-42" width="44" height="23" />
      <use href="#garden-cucumber" x="-22" y="-28" width="44" height="23" />
    </symbol>
  );
}

function BasketSymbol() {
  return (
    <symbol id="garden-basket" viewBox="-82 -68 164 136">
      <path d="M-48 0Q-44-64 1-62Q51-64 53 1" fill="none" stroke="#985d32" strokeWidth="13" />
      <path d="M-48 0Q-44-64 1-62Q51-64 53 1" fill="none" stroke="#f1be75" strokeWidth="7" />
      <ellipse cy="-7" rx="70" ry="19" fill="#532f21" stroke="#c5874f" strokeWidth="7" />
      <path
        d="M-71-7Q0 16 71-7L59 44Q0 71-59 44Z"
        fill="url(#garden-wood)"
        stroke="#8b4b28"
        strokeWidth="2"
      />
      <path
        d="M-66 6Q0 27 66 6M-64 20Q0 40 64 20M-61 33Q0 54 61 33M-42 4L-32 49M-17 8L-13 53M17 9L13 53M42 4L32 49"
        fill="none"
        stroke="#f2bb75"
        strokeWidth="3"
        opacity=".75"
      />
    </symbol>
  );
}
