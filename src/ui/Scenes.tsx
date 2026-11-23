import { ReactNode } from 'react';
import { SceneId } from '../game/state';
import { usePixelURL } from './pixel';
import { BUST_SVG } from './portraitArt';

/** Personagem da cena: busto em pixel art (DiceBear Pixel Art, CC0) sobre um corpo simples, com sombra. */
function Person({ x, y, h = 180, who = 'guest', suit = '#222' }: { x: number; y: number; h?: number; who?: string; suit?: string } & Record<string, unknown>) {
  const unit = h >= 240 ? 8 : 4; // 1 pixel do sprite = 4 ou 8 unidades (alinhado à grade 4×4 da cena)
  const w = unit * 16;
  const px = Math.round((x - w / 2) / 4) * 4;
  const top = Math.round((y - h * 0.86) / 4) * 4;
  const bodyTop = top + w * 0.78;
  const svg = BUST_SVG[who] ?? BUST_SVG.guest;
  return (
    <g>
      <rect x={px} y={Math.round(y / 4) * 4 - 4} width={w} height={8} fill="#000" opacity=".4" />
      <rect x={px + unit * 2} y={bodyTop} width={w - unit * 4} height={Math.max(8, y - bodyTop)} fill={suit} />
      <rect x={px + unit * 2} y={bodyTop} width={unit} height={Math.max(8, y - bodyTop)} fill="#fff" opacity=".12" />
      <rect x={px + w - unit * 3} y={bodyTop} width={unit} height={Math.max(8, y - bodyTop)} fill="#000" opacity=".25" />
      <image href={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} x={px} y={top} width={w} height={w} />
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#07040f" />
        <stop offset="1" stopColor="#241238" />
      </linearGradient>
      <linearGradient id="floorRed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a0d18" />
        <stop offset="1" stopColor="#14050a" />
      </linearGradient>
      <linearGradient id="wallWarm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2b0f1c" />
        <stop offset="1" stopColor="#1a0a12" />
      </linearGradient>
      <radialGradient id="warmGlow" cx="50%" cy="30%" r="65%">
        <stop offset="0" stopColor="#ffcf70" stopOpacity=".55" />
        <stop offset="1" stopColor="#ffcf70" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="felt" cx="50%" cy="40%" r="70%">
        <stop offset="0" stopColor="#1f7a4a" />
        <stop offset="1" stopColor="#0d3b24" />
      </radialGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id="brick" width="40" height="20" patternUnits="userSpaceOnUse">
        <rect width="40" height="20" fill="#2a1a20" />
        <path d="M0 0h40M0 10h40M0 20h40M20 0v10M0 10v10M40 10v10" stroke="#170d12" strokeWidth="2" fill="none" />
      </pattern>
      <pattern id="check" width="60" height="30" patternUnits="userSpaceOnUse">
        <rect width="60" height="30" fill="#1d0a10" />
        <rect width="30" height="15" fill="#2c0f19" />
        <rect x="30" y="15" width="30" height="15" fill="#2c0f19" />
      </pattern>
    </defs>
  );
}

function Rain() {
  return (
    <g className="rain" opacity=".25" stroke="#9ab" strokeWidth="1">
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i} x1={(i * 53) % 1000} y1={(i * 97) % 560} x2={((i * 53) % 1000) - 6} y2={((i * 97) % 560) + 22} />
      ))}
    </g>
  );
}

function Rua() {
  return (
    <>
      <rect width="1000" height="560" fill="url(#sky)" />
      {/* skyline */}
      {[0, 90, 180, 760, 850, 930].map((x, i) => (
        <g key={x}>
          <rect x={x} y={120 + (i % 3) * 40} width="80" height={300 - (i % 3) * 40} fill="#100a1c" />
          {Array.from({ length: 8 }, (_, k) => (
            <rect key={k} x={x + 12 + (k % 2) * 28} y={140 + (i % 3) * 40 + Math.floor(k / 2) * 40} width="14" height="18" fill={(i + k) % 3 === 0 ? '#e8b64c' : '#2a2038'} opacity=".8" />
          ))}
        </g>
      ))}
      {/* fachada */}
      <rect x="300" y="60" width="400" height="390" fill="#1a0f26" stroke="#3a2150" strokeWidth="3" />
      <rect x="300" y="60" width="400" height="30" fill="#2a1640" />
      <rect x="320" y="190" width="40" height="150" fill="#2c1840" />
      <rect x="640" y="190" width="40" height="150" fill="#2c1840" />
      {[330, 650].map((x) => (
        <rect key={x} x={x} y="200" width="20" height="30" fill="#d4af37" opacity=".7" />
      ))}
      {/* letreiro */}
      <g filter="url(#glow)">
        <rect x="380" y="86" width="260" height="68" rx="10" fill="#10051a" stroke="#ff2a6d" strokeWidth="4" />
        <text x="510" y="118" textAnchor="middle" fontSize="26" fontWeight="700" fill="#ff2a6d" fontFamily="Georgia, serif" letterSpacing="4">CASSINO</text>
        <text x="510" y="146" textAnchor="middle" fontSize="26" fontWeight="700" fill="#08d9d6" fontFamily="Georgia, serif" letterSpacing="10">ÔNIX</text>
      </g>
      {/* porta */}
      <rect x="395" y="240" width="210" height="190" fill="#0a0410" stroke="#d4af37" strokeWidth="4" />
      <rect x="405" y="250" width="90" height="180" fill="#5a1022" />
      <rect x="505" y="250" width="90" height="180" fill="#5a1022" />
      <circle cx="488" cy="345" r="5" fill="#d4af37" />
      <circle cx="512" cy="345" r="5" fill="#d4af37" />
      <path d="M390 430 L610 430 L650 470 L350 470Z" fill="#7a1020" />
      <Person who="guard" x={450} y={430} h={190} suit="#0b0b10" skin="#b98a6a" hair="#111" tie="#7a1020" />
      {/* cartaz */}
      <rect x="625" y="250" width="100" height="110" fill="#efe3c0" stroke="#d4af37" strokeWidth="3" transform="rotate(2 675 305)" />
      <text x="675" y="278" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5a1022" transform="rotate(2 675 305)">NOITE DOS</text>
      <text x="675" y="294" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5a1022" transform="rotate(2 675 305)">MAGNATAS</text>
      <text x="675" y="322" textAnchor="middle" fontSize="9" fill="#333" transform="rotate(2 675 305)">Evento privado</text>
      <text x="675" y="336" textAnchor="middle" fontSize="9" fill="#333" transform="rotate(2 675 305)">Traje a rigor</text>
      {/* calçada */}
      <rect x="0" y="440" width="1000" height="120" fill="#17101f" />
      <rect x="0" y="440" width="1000" height="6" fill="#2d1f40" />
      <rect x="0" y="500" width="1000" height="60" fill="#0d0814" />
      <g opacity=".25">
        <rect x="380" y="500" width="240" height="40" fill="#ff2a6d" />
      </g>
      {/* banco */}
      <rect x="90" y="400" width="190" height="14" fill="#6b4a2b" />
      <rect x="90" y="378" width="190" height="10" fill="#6b4a2b" />
      <rect x="100" y="414" width="10" height="50" fill="#3a2a18" />
      <rect x="260" y="414" width="10" height="50" fill="#3a2a18" />
      <rect x="120" y="388" width="6" height="12" fill="#3a2a18" />
      <rect x="240" y="388" width="6" height="12" fill="#3a2a18" />
      <path d="M170 398 l4 -4 l8 0 l4 4z" fill="#ffd54f" opacity=".9" />
      {/* lixeira */}
      <rect x="810" y="400" width="70" height="80" fill="#2e3340" stroke="#4a5060" strokeWidth="2" />
      <rect x="802" y="390" width="86" height="14" fill="#3a4050" />
      {/* poste */}
      <rect x="60" y="150" width="8" height="300" fill="#2a2a34" />
      <circle cx="64" cy="146" r="16" fill="#ffd54f" opacity=".9" filter="url(#glow)" />
      {/* beco */}
      <rect x="900" y="230" width="95" height="190" fill="#05030a" />
      <path d="M900 230 L930 215 L995 215 L995 230Z" fill="#1a1024" />
      <text x="948" y="330" textAnchor="middle" fontSize="40" fill="#3a2a50">→</text>
      <Rain />
    </>
  );
}

function Beco() {
  return (
    <>
      <rect width="1000" height="560" fill="#0b0712" />
      <rect x="0" y="0" width="1000" height="450" fill="url(#brick)" opacity=".9" />
      <rect x="0" y="0" width="1000" height="450" fill="#000" opacity=".35" />
      <rect x="0" y="450" width="1000" height="110" fill="#14101a" />
      <rect x="0" y="444" width="1000" height="8" fill="#1f1828" />
      {/* furgão */}
      <rect x="40" y="250" width="360" height="200" rx="16" fill="#e8e8ee" />
      <rect x="40" y="250" width="360" height="200" rx="16" fill="#000" opacity=".15" />
      <rect x="300" y="268" width="90" height="70" rx="6" fill="#2a3a55" />
      <rect x="60" y="290" width="220" height="60" fill="#1d3a6b" />
      <text x="170" y="328" textAnchor="middle" fontSize="26" fontWeight="700" fill="#fff" fontFamily="Georgia, serif">LAVANDERIA CISNE</text>
      <rect x="52" y="360" width="300" height="12" fill="#bcbcc8" />
      {/* porta traseira aberta com cabides */}
      <rect x="40" y="262" width="70" height="170" fill="#2d2d3a" />
      {[48, 62, 76, 90].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="268" x2={x} y2="280" stroke="#999" />
          <rect x={x - 5} y="280" width="10" height={90 + (i % 2) * 20} fill={i === 1 ? '#0e0e14' : '#4a4a5a'} />
        </g>
      ))}
      <circle cx="110" cy="450" r="30" fill="#111" /><circle cx="110" cy="450" r="14" fill="#555" />
      <circle cx="320" cy="450" r="30" fill="#111" /><circle cx="320" cy="450" r="14" fill="#555" />
      {/* Nando */}
      <Person who="waiter" x={575} y={460} h={220} suit="#f4f4f4" skin="#c9946f" hair="#1a0f0a" tie="#111" />
      <rect x="610" y="402" width="42" height="5" fill="#bbb" />
      <ellipse cx="631" cy="398" rx="14" ry="5" fill="#d9d9d9" />
      {/* porta de serviço */}
      <rect x="690" y="220" width="140" height="220" fill="#303644" stroke="#555d70" strokeWidth="4" />
      <rect x="705" y="236" width="110" height="60" fill="#232832" />
      <circle cx="808" cy="360" r="7" fill="#d4af37" />
      <rect x="690" y="200" width="140" height="14" fill="#ff2a6d" opacity=".7" filter="url(#glow)" />
      <text x="760" y="266" textAnchor="middle" fontSize="12" fill="#aab">SERVIÇO</text>
      {/* lixeira */}
      <rect x="860" y="370" width="100" height="90" fill="#2c3340" stroke="#4a5568" strokeWidth="2" />
      <rect x="852" y="358" width="116" height="16" fill="#3b4558" />
      {/* vapor */}
      <g opacity=".25" fill="#aab">
        <circle cx="905" cy="330" r="18" /><circle cx="925" cy="300" r="24" /><circle cx="945" cy="260" r="30" />
      </g>
      <rect x="380" y="500" width="240" height="40" rx="6" fill="#241a30" stroke="#4a3a60" />
      <text x="500" y="526" textAnchor="middle" fill="#9a88b8" fontSize="16">↓ Voltar para a rua</text>
    </>
  );
}

function Salao() {
  return (
    <>
      <rect width="1000" height="560" fill="url(#wallWarm)" />
      <rect x="0" y="0" width="1000" height="560" fill="url(#warmGlow)" />
      {/* cortinas */}
      {[0, 940].map((x) => (
        <rect key={x} x={x} y="0" width="60" height="330" fill="#5a0f22" />
      ))}
      {[0, 20, 40, 940, 960, 980].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="330" stroke="#3a0814" strokeWidth="3" />
      ))}
      {/* painéis na parede */}
      {[330, 440, 560, 700, 830].map((x, i) => (
        <rect key={x} x={x} y="60" width="70" height="200" fill="none" stroke="#7a5a1a" strokeWidth="2" opacity={i === 1 || i === 2 ? 0 : 0.7} />
      ))}
      {/* piso */}
      <rect x="0" y="330" width="1000" height="230" fill="url(#check)" />
      <rect x="0" y="330" width="1000" height="6" fill="#d4af37" opacity=".6" />
      {/* lustre */}
      <g filter="url(#glow)">
        <line x1="500" y1="0" x2="500" y2="40" stroke="#d4af37" strokeWidth="3" />
        <path d="M430 60 L570 60 L540 100 L460 100Z" fill="#ffe9a8" opacity=".85" />
        <path d="M400 60 Q500 20 600 60" stroke="#d4af37" strokeWidth="4" fill="none" />
        {[410, 450, 500, 550, 590].map((x) => (
          <path key={x} d={`M${x} 64 L${x - 5} 100 L${x + 5} 100Z`} fill="#fff6d6" />
        ))}
      </g>
      {/* convidados */}
      <Person who="dame" x={470} y={290} h={170} suit="#1a1030" skin="#e8c4a6" hair="#7a2a2a" accent="#08d9d6" />
      <Person who="guest" x={535} y={292} h={185} suit="#0e1a2b" skin="#d4a07c" hair="#bbb" tie="#d4af37" />
      <rect x="448" y="198" width="12" height="18" fill="#ffd54f" opacity=".8" />
      {/* porta serviço (esquerda) */}
      <rect x="320" y="120" width="90" height="160" fill="#1a0f14" stroke="#7a5a1a" strokeWidth="3" />
      <text x="365" y="205" textAnchor="middle" fontSize="12" fill="#c9b27a">SERVIÇO</text>
      <text x="365" y="228" textAnchor="middle" fontSize="22" fill="#c9b27a">←</text>
      {/* porta escritório */}
      <rect x="600" y="120" width="100" height="160" fill="#0d0d12" stroke="#d4af37" strokeWidth="4" />
      <rect x="610" y="132" width="80" height="136" fill="none" stroke="#d4af37" strokeWidth="1.5" opacity=".6" />
      <circle cx="676" cy="205" r="6" fill="#d4af37" />
      <text x="650" y="108" textAnchor="middle" fontSize="12" fill="#d4af37" fontFamily="Georgia, serif">PRIVADO</text>
      {/* bar */}
      <rect x="20" y="170" width="290" height="40" fill="#2a1410" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={36 + i * 28} y={110 + (i % 3) * 6} width="12" height={58 - (i % 3) * 6} rx="3" fill={['#2e7d32', '#b71c1c', '#ff8f00', '#1565c0', '#6a1b9a'][i % 5]} opacity=".85" />
      ))}
      <rect x="20" y="170" width="290" height="6" fill="#d4af37" />
      <rect x="20" y="260" width="290" height="190" fill="#3a1c14" stroke="#5a3a28" strokeWidth="3" />
      <rect x="20" y="248" width="290" height="14" fill="#6b3a22" />
      <Person who="barman" x={150} y={250} h={190} suit="#f0f0f0" skin="#c4906c" hair="#2a1a10" tie="#111" />
      <circle cx="260" cy="236" r="9" fill="#e8e8ee" opacity=".7" /><rect x="256" y="236" width="8" height="12" fill="#e8e8ee" opacity=".7" />
      {/* mesa de poker */}
      <ellipse cx="520" cy="395" rx="190" ry="85" fill="#3b1c10" stroke="#d4af37" strokeWidth="4" />
      <ellipse cx="520" cy="392" rx="165" ry="68" fill="url(#felt)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={440 + i * 26} y="380" width="20" height="30" rx="3" fill="#fff" stroke="#222" transform={`rotate(${(i - 2) * 6} ${450 + i * 26} 395)`} />
      ))}
      {[[470, 420, '#c62828'], [500, 425, '#1565c0'], [530, 422, '#2e7d32'], [560, 424, '#111']].map(([x, y, c], i) => (
        <ellipse key={i} cx={x as number} cy={y as number} rx="11" ry="5" fill={c as string} stroke="#fff" strokeWidth="1" />
      ))}
      <Person who="dealer" x={520} y={345} h={140} suit="#7a1020" skin="#e0b48f" hair="#2a1a14" accent="#d4af37" tie="#d4af37" />
      {/* agiota */}
      <rect x="770" y="380" width="200" height="90" rx="30" fill="#3a0f1e" stroke="#5a1a30" strokeWidth="3" />
      <rect x="780" y="300" width="180" height="100" rx="24" fill="#4a1426" />
      <Person who="lender" x={870} y={400} h={150} suit="#2a2a3a" skin="#d9b08c" hair="#cccccc" accent="#d4af37" tie="#a0001c" />
      <rect x="890" y="352" width="30" height="5" fill="#a0522d" /><circle cx="921" cy="354" r="3" fill="#ff7043" />
      <rect x="0" y="470" width="1000" height="90" fill="#0b0408" opacity=".55" />
    </>
  );
}

function Servico() {
  return (
    <>
      <rect width="1000" height="560" fill="#16161e" />
      <rect x="0" y="0" width="1000" height="450" fill="#22222c" />
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect x={60 + i * 170} y="20" width="90" height="10" fill="#fff4c4" opacity=".75" />
          <path d={`M${60 + i * 170} 30 L${40 + i * 170} 440 L${170 + i * 170} 440 L${150 + i * 170} 30Z`} fill="#fff4c4" opacity=".04" />
        </g>
      ))}
      <rect x="0" y="440" width="1000" height="120" fill="#0f0f14" />
      <rect x="0" y="436" width="1000" height="6" fill="#363644" />
      {/* tubulações */}
      <rect x="0" y="80" width="1000" height="16" fill="#3a3a48" /><rect x="0" y="110" width="1000" height="10" fill="#2e2e3a" />
      {/* Nando */}
      <Person who="waiter" x={305} y={455} h={230} suit="#f4f4f4" skin="#c9946f" hair="#1a0f0a" tie="#111" />
      {/* caixote */}
      <rect x="520" y="310" width="220" height="160" fill="#5a4026" stroke="#3a2a18" strokeWidth="4" />
      <path d="M520 310 L740 470 M740 310 L520 470" stroke="#3a2a18" strokeWidth="4" />
      <rect x="610" y="370" width="40" height="38" rx="5" fill="#d4af37" /><path d="M620 370 v-14 a10 10 0 0 1 20 0 v14" fill="none" stroke="#d4af37" strokeWidth="5" />
      <text x="630" y="338" textAnchor="middle" fontSize="12" fill="#e0cfa8">P.D.A.</text>
      {/* cabides */}
      <rect x="770" y="190" width="200" height="8" fill="#888" />
      <rect x="780" y="198" width="6" height="250" fill="#777" /><rect x="954" y="198" width="6" height="250" fill="#777" />
      {[800, 830, 860, 890, 920].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="198" x2={x} y2="212" stroke="#ccc" />
          <path d={`M${x - 12} 212 L${x + 12} 212 L${x + 14} 380 L${x - 14} 380Z`} fill={['#1b1b24', '#3b2d52', '#5a1022', '#2b3b4a', '#4a4a4a'][i]} />
        </g>
      ))}
      <rect x="380" y="500" width="240" height="40" rx="6" fill="#241a30" stroke="#4a3a60" />
      <text x="500" y="526" textAnchor="middle" fill="#9a88b8" fontSize="16">↓ Voltar ao salão</text>
    </>
  );
}

function Gear({ cx, cy, r, teeth = 12, rot = 0, fill = '#2a2030' }: { cx: number; cy: number; r: number; teeth?: number; rot?: number; fill?: string }) {
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      {Array.from({ length: teeth }, (_, i) => (
        <rect key={i} x={cx - r * 0.12} y={cy - r * 1.18} width={r * 0.24} height={r * 0.32} fill={fill} transform={`rotate(${(360 / teeth) * i} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#4a3a28" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r * 0.35} fill="#0d0810" />
    </g>
  );
}

function Escritorio() {
  return (
    <>
      <rect width="1000" height="560" fill="#0c0710" />
      <Gear cx={120} cy={140} r={90} teeth={14} />
      <Gear cx={280} cy={80} r={55} teeth={10} rot={12} fill="#33262a" />
      <Gear cx={90} cy={360} r={60} teeth={11} rot={5} fill="#241a30" />
      <Gear cx={400} cy={60} r={40} teeth={9} fill="#2a2030" />
      <rect x="0" y="450" width="1000" height="110" fill="#120912" />
      <rect x="0" y="446" width="1000" height="6" fill="#d4af37" opacity=".5" />
      <rect x="0" y="0" width="1000" height="560" fill="url(#warmGlow)" opacity=".35" />
      {/* mesa */}
      <rect x="330" y="380" width="340" height="80" fill="#1a0f0a" stroke="#d4af37" strokeWidth="3" />
      <rect x="320" y="370" width="360" height="14" fill="#3a1f10" />
      <Person who="madame" x={500} y={375} h={240} suit="#0d0d12" skin="#e6c3a8" hair="#0a0a0a" accent="#d4af37" tie="#d4af37" />
      {/* Autômato */}
      <rect x="700" y="120" width="270" height="340" rx="14" fill="#2a1f18" stroke="#d4af37" strokeWidth="4" />
      <rect x="725" y="150" width="220" height="130" rx="8" fill="#050309" stroke="#08d9d6" strokeWidth="3" filter="url(#glow)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={745 + i * 38} y={260 - (i % 3 + 1) * 22} width="26" height={(i % 3 + 1) * 22} fill="#08d9d6" opacity=".75" />
      ))}
      <text x="835" y="172" textAnchor="middle" fontSize="12" fill="#08d9d6" fontFamily="monospace">P.D.A.  Q = {'{q0,q1,qf}'}</text>
      <Gear cx={760} cy={370} r={42} teeth={10} fill="#3a2a18" />
      <Gear cx={850} cy={390} r={30} teeth={8} rot={10} fill="#4a3220" />
      <Gear cx={920} cy={350} r={22} teeth={8} fill="#3a2a18" />
      <rect x="740" y="296" width="200" height="14" fill="#d4af37" opacity=".7" />
      <rect x="380" y="500" width="240" height="40" rx="6" fill="#241a30" stroke="#4a3a60" />
      <text x="500" y="526" textAnchor="middle" fill="#9a88b8" fontSize="16">↓ Voltar ao salão</text>
    </>
  );
}

const ART: Record<SceneId, () => ReactNode> = { rua: Rua, beco: Beco, salao: Salao, servico: Servico, escritorio: Escritorio };

export function SceneArt({ id }: { id: SceneId }) {
  const Art = ART[id];
  return (
    <>
      <Defs />
      <Art />
    </>
  );
}

/** Cena em pixel art: a arte é reduzida a 250×140 pixels e ampliada sem suavização. */
export function PixelScene({ id }: { id: SceneId }) {
  const url = usePixelURL(<SceneArt id={id} />, 1000, 560, 250, 140);
  return url ? (
    <image href={url} x="0" y="0" width="1000" height="560" preserveAspectRatio="none" className="px-img" />
  ) : (
    <rect width="1000" height="560" fill="#0c0710" />
  );
}
