'use client'

import type { ComponentType, ReactNode } from 'react'
import type { KnmIllustrationId } from '@/lib/exam-prep/kmn/knmIllustrationRegistry'

type SceneProps = { className?: string }

const css = `
@keyframes knm-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@keyframes knm-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
@keyframes knm-drip { 0%{transform:translateY(0);opacity:1} 80%{transform:translateY(14px);opacity:.2} 100%{transform:translateY(14px);opacity:0} }
@keyframes knm-blink { 0%,90%,100%{opacity:1} 95%{opacity:.2} }
.knm-anim-float { animation: knm-float 2.8s ease-in-out infinite; }
.knm-anim-pulse { animation: knm-pulse 1.6s ease-in-out infinite; }
.knm-anim-drip { animation: knm-drip 1.4s ease-in infinite; }
.knm-anim-blink { animation: knm-blink 3s ease-in-out infinite; }
`

function Frame({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <svg viewBox="0 0 320 168" className="w-full h-auto max-h-[13rem]" role="img" aria-label={label}>
      <style>{css}</style>
      <rect width="320" height="168" rx="12" fill="url(#knm-bg)" />
      <defs>
        <linearGradient id="knm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2ff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  )
}

function SceneZorg0() {
  return (
    <Frame label="Kind met koorts">
      <circle cx="160" cy="72" r="28" fill="#fde68a" className="knm-anim-float" />
      <rect x="132" y="98" width="56" height="48" rx="10" fill="#6366f1" opacity=".85" />
      <rect x="200" y="108" width="36" height="12" rx="4" fill="#ef4444" className="knm-anim-pulse" />
      <text x="218" y="118" fontSize="11" fill="#fff" fontWeight="bold">
        38,5
      </text>
      <rect x="48" y="120" width="52" height="32" rx="6" fill="#fff" stroke="#94a3b8" />
      <path d="M58 132h32M58 140h24" stroke="#cbd5e1" strokeWidth="2" />
    </Frame>
  )
}
function SceneZorg1() {
  return (
    <Frame label="Avond, pijn">
      <circle cx="280" cy="36" r="18" fill="#fef3c7" className="knm-anim-pulse" />
      <text x="272" y="42" fontSize="10" fill="#92400e">
        22:00
      </text>
      <ellipse cx="150" cy="90" rx="40" ry="48" fill="#6366f1" opacity=".9" />
      <rect x="210" y="70" width="64" height="44" rx="8" fill="#fff" stroke="#6366f1" strokeWidth="2" />
      <text x="222" y="96" fontSize="10" fill="#4338ca">
        Huisartsenpost
      </text>
    </Frame>
  )
}
function SceneZorg2() {
  return (
    <Frame label="Doorverwijzing">
      <rect x="60" y="48" width="88" height="72" rx="8" fill="#fff" stroke="#94a3b8" />
      <path d="M76 68h56M76 80h48M76 92h40" stroke="#cbd5e1" strokeWidth="3" />
      <path d="M168 84h44" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arr)" />
      <rect x="212" y="60" width="56" height="48" rx="8" fill="#e0e7ff" stroke="#6366f1" />
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="#6366f1" />
        </marker>
      </defs>
    </Frame>
  )
}
function SceneZorg3() {
  return (
    <Frame label="Apotheek">
      <rect x="100" y="40" width="120" height="88" rx="10" fill="#fff" stroke="#22c55e" strokeWidth="3" />
      <rect x="118" y="58" width="84" height="52" rx="6" fill="#dcfce7" />
      <text x="128" y="90" fontSize="14" fill="#166534" fontWeight="bold">
        APOTHEEK
      </text>
      <circle cx="88" cy="100" r="10" fill="#22c55e" className="knm-anim-pulse" />
    </Frame>
  )
}

function SceneWerk0() {
  return (
    <Frame label="Ziek melden">
      <rect x="48" y="56" width="100" height="72" rx="8" fill="#e2e8f0" />
      <ellipse cx="98" cy="110" rx="36" ry="14" fill="#6366f1" opacity=".3" />
      <rect x="168" y="72" width="96" height="56" rx="10" fill="#fff" stroke="#6366f1" />
      <text x="182" y="104" fontSize="11" fill="#4338ca">
        Ziek gemeld
      </text>
      <circle cx="248" cy="48" r="14" fill="#fef3c7" className="knm-anim-blink" />
    </Frame>
  )
}
function SceneWerk1() {
  return (
    <Frame label="Contract lezen">
      <rect x="72" y="44" width="176" height="96" rx="8" fill="#fff" stroke="#94a3b8" />
      <path d="M92 64h136M92 76h120M92 88h128M92 100h80" stroke="#cbd5e1" strokeWidth="3" />
      <circle cx="248" cy="52" r="16" fill="#6366f1" className="knm-anim-float" />
      <text x="238" y="57" fontSize="14">
        ✓
      </text>
    </Frame>
  )
}
function SceneWerk2() {
  return (
    <Frame label="Op kantoor">
      <rect x="40" y="100" width="240" height="8" rx="2" fill="#cbd5e1" />
      <rect x="80" y="52" width="48" height="48" rx="24" fill="#6366f1" />
      <rect x="160" y="60" width="48" height="40" rx="6" fill="#fecaca" className="knm-anim-pulse" />
      <text x="172" y="86" fontSize="10" fill="#991b1b">
        HR
      </text>
    </Frame>
  )
}
function SceneWerk3() {
  return (
    <Frame label="Contract afloop">
      <rect x="88" y="50" width="144" height="80" rx="8" fill="#fff" stroke="#6366f1" strokeWidth="2" />
      <text x="108" y="82" fontSize="12" fill="#4338ca" fontWeight="bold">
        CONTRACT
      </text>
      <text x="108" y="100" fontSize="10" fill="#64748b">
        afloop
      </text>
      <rect x="200" y="118" width="48" height="6" rx="2" fill="#f59e0b" className="knm-anim-pulse" />
    </Frame>
  )
}

function SceneOnderwijs0() {
  return (
    <Frame label="Verzuim school">
      <rect x="100" y="36" width="120" height="64" rx="6" fill="#fff" stroke="#94a3b8" />
      <text x="120" y="72" fontSize="12" fill="#334155">
        SCHOOL
      </text>
      <circle cx="72" cy="120" r="20" fill="#fbbf24" />
      <path d="M64 120h16" stroke="#fff" strokeWidth="2" />
    </Frame>
  )
}
function SceneOnderwijs1() {
  return (
    <Frame label="Oudergesprek">
      <rect x="60" y="70" width="56" height="56" rx="28" fill="#6366f1" opacity=".85" />
      <rect x="200" y="70" width="56" height="56" rx="28" fill="#818cf8" opacity=".85" />
      <rect x="128" y="48" width="64" height="40" rx="6" fill="#fff" stroke="#cbd5e1" />
      <text x="138" y="74" fontSize="10" fill="#475569">
        gesprek
      </text>
    </Frame>
  )
}
function SceneOnderwijs2() {
  return (
    <Frame label="School wisselen">
      <rect x="48" y="88" width="72" height="48" rx="6" fill="#e2e8f0" />
      <path d="M128 112h64" stroke="#6366f1" strokeWidth="4" />
      <polygon points="192,112 184,104 184,120" fill="#6366f1" />
      <rect x="208" y="72" width="72" height="64" rx="6" fill="#c7d2fe" />
      <text x="220" y="108" fontSize="10" fill="#3730a3">
        nieuwe school
      </text>
    </Frame>
  )
}
function SceneOnderwijs3() {
  return (
    <Frame label="Nederlands leren">
      <rect x="96" y="44" width="128" height="88" rx="8" fill="#fff" stroke="#6366f1" />
      <text x="118" y="78" fontSize="22" fill="#4338ca" fontWeight="bold">
        NL
      </text>
      <text x="118" y="100" fontSize="10" fill="#64748b">
        taalhulp
      </text>
    </Frame>
  )
}

function SceneWonen0() {
  return (
    <Frame label="Buren en geluid">
      <rect x="40" y="48" width="100" height="88" rx="6" fill="#e2e8f0" />
      <rect x="180" y="48" width="100" height="88" rx="6" fill="#e2e8f0" />
      <path d="M148 60 Q160 40 172 60" stroke="#6366f1" strokeWidth="3" fill="none" className="knm-anim-pulse" />
      <text x="132" y="100" fontSize="18">
        ♪♪
      </text>
    </Frame>
  )
}
function SceneWonen1() {
  return (
    <Frame label="Lekkage plafond">
      <rect x="48" y="40" width="224" height="100" rx="6" fill="#f1f5f9" />
      <ellipse cx="200" cy="52" rx="24" ry="10" fill="#94a3b8" opacity=".5" />
      <ellipse cx="200" cy="48" rx="16" ry="6" fill="#64748b" className="knm-anim-drip" />
      <ellipse cx="188" cy="70" rx="8" ry="20" fill="#38bdf8" opacity=".6" className="knm-anim-pulse" />
      <rect x="72" y="120" width="48" height="32" rx="6" fill="#6366f1" />
      <text x="78" y="140" fontSize="9" fill="#fff">
        verhuurder
      </text>
    </Frame>
  )
}
function SceneWonen2() {
  return (
    <Frame label="Huurcontract">
      <rect x="80" y="48" width="160" height="88" rx="8" fill="#fff" stroke="#6366f1" strokeWidth="2" />
      <text x="108" y="88" fontSize="13" fill="#4338ca" fontWeight="bold">
        HUUR
      </text>
      <circle cx="248" cy="56" r="20" fill="#fde68a" className="knm-anim-float" />
      <text x="242" y="62" fontSize="14">
        🔑
      </text>
    </Frame>
  )
}
function SceneWonen3() {
  return (
    <Frame label="Verhuizing">
      <rect x="56" y="72" width="80" height="64" rx="6" fill="#cbd5e1" />
      <rect x="184" y="72" width="80" height="64" rx="6" fill="#a5b4fc" />
      <path d="M144 100h32" stroke="#6366f1" strokeWidth="4" />
      <rect x="120" y="40" width="80" height="28" rx="6" fill="#fff" stroke="#6366f1" />
      <text x="132" y="58" fontSize="10" fill="#4338ca">
        gemeente
      </text>
    </Frame>
  )
}

function SceneOverheid0() {
  return (
    <Frame label="Stemmen">
      <rect x="120" y="48" width="80" height="96" rx="6" fill="#fff" stroke="#94a3b8" />
      <rect x="136" y="64" width="48" height="56" rx="4" fill="#e0e7ff" />
      <circle cx="88" cy="88" r="24" fill="#6366f1" opacity=".9" />
      <rect x="200" y="80" width="40" height="28" rx="4" fill="#fef3c7" />
    </Frame>
  )
}
function SceneOverheid1() {
  return (
    <Frame label="Paspoort">
      <rect x="108" y="52" width="104" height="72" rx="6" fill="#1e3a5f" />
      <circle cx="160" cy="80" r="18" fill="#fde68a" />
      <rect x="200" y="60" width="56" height="40" rx="6" fill="#fff" stroke="#6366f1" />
      <text x="210" y="84" fontSize="9" fill="#4338ca">
        afspraak
      </text>
    </Frame>
  )
}
function SceneOverheid2() {
  return (
    <Frame label="DigiD">
      <rect x="88" y="56" width="144" height="72" rx="10" fill="#fff" stroke="#6366f1" strokeWidth="2" />
      <text x="128" y="100" fontSize="20" fill="#4338ca" fontWeight="bold">
        DigiD
      </text>
      <circle cx="72" cy="72" r="12" fill="#ef4444" className="knm-anim-blink" />
      <text x="66" y="76" fontSize="10" fill="#fff">
        !
      </text>
    </Frame>
  )
}
function SceneOverheid3() {
  return (
    <Frame label="Politiek Nederland">
      <rect x="48" y="100" width="224" height="12" fill="#cbd5e1" />
      <rect x="72" y="48" width="48" height="52" fill="#6366f1" />
      <rect x="136" y="56" width="48" height="44" fill="#818cf8" />
      <rect x="200" y="64" width="40" height="36" fill="#a5b4fc" />
      <text x="100" y="78" fontSize="9" fill="#fff">
        TK
      </text>
    </Frame>
  )
}

function SceneIntegratie0() {
  return (
    <Frame label="Meedoen buurt">
      <circle cx="100" cy="100" r="22" fill="#6366f1" />
      <circle cx="160" cy="88" r="22" fill="#818cf8" className="knm-anim-float" />
      <circle cx="220" cy="100" r="22" fill="#a5b4fc" />
      <rect x="128" y="40" width="64" height="32" rx="6" fill="#dcfce7" />
      <text x="140" y="60" fontSize="10" fill="#166534">
        club
      </text>
    </Frame>
  )
}
function SceneIntegratie1() {
  return (
    <Frame label="Koningsdag">
      <rect x="0" y="120" width="320" height="48" fill="#fb923c" opacity=".35" />
      <text x="120" y="56" fontSize="28" fill="#ea580c" fontWeight="bold" className="knm-anim-pulse">
        27 apr
      </text>
      <circle cx="80" cy="96" r="16" fill="#f97316" />
      <circle cx="240" cy="88" r="20" fill="#fb923c" className="knm-anim-float" />
    </Frame>
  )
}
function SceneIntegratie2() {
  return (
    <Frame label="Afval container">
      <rect x="200" y="56" width="56" height="88" rx="4" fill="#64748b" />
      <rect x="208" y="48" width="40" height="12" rx="2" fill="#475569" />
      <circle cx="120" cy="108" r="28" fill="#22c55e" opacity=".8" />
      <path d="M108 108h24" stroke="#fff" strokeWidth="3" />
    </Frame>
  )
}
function SceneIntegratie3() {
  return (
    <Frame label="Voetbal">
      <ellipse cx="160" cy="120" rx="100" ry="24" fill="#22c55e" opacity=".5" />
      <circle cx="160" cy="88" r="20" fill="#fff" stroke="#334155" />
      <path d="M152 88 L168 88 M160 80 L160 96" stroke="#334155" strokeWidth="2" />
      <circle cx="220" cy="72" r="16" fill="#6366f1" className="knm-anim-pulse" />
    </Frame>
  )
}

function SceneVeiligheid0() {
  return (
    <Frame label="Brandlucht">
      <rect x="48" y="40" width="80" height="100" rx="6" fill="#e2e8f0" />
      <path d="M200 100 Q220 60 240 100 Q220 80 200 100" fill="#f97316" className="knm-anim-pulse" opacity=".9" />
      <text x="168" y="48" fontSize="11" fill="#64748b">
        rook
      </text>
    </Frame>
  )
}
function SceneVeiligheid1() {
  return (
    <Frame label="Ruzie op straat">
      <rect x="0" y="130" width="320" height="38" fill="#cbd5e1" />
      <circle cx="120" cy="88" r="20" fill="#fecaca" className="knm-anim-pulse" />
      <circle cx="200" cy="88" r="20" fill="#fecaca" className="knm-anim-pulse" />
      <text x="140" y="52" fontSize="10" fill="#475569">
        op afstand
      </text>
    </Frame>
  )
}
function SceneVeiligheid2() {
  return (
    <Frame label="Fietsongeluk">
      <circle cx="120" cy="108" r="28" stroke="#334155" strokeWidth="4" fill="none" />
      <line x1="148" y1="108" x2="200" y2="108" stroke="#334155" strokeWidth="4" />
      <ellipse cx="200" cy="120" rx="20" ry="8" fill="#ef4444" className="knm-anim-pulse" />
      <text x="228" y="72" fontSize="16" fill="#dc2626" fontWeight="bold">
        112
      </text>
    </Frame>
  )
}
function SceneVeiligheid3() {
  return (
    <Frame label="Baby koorts avond">
      <circle cx="280" cy="40" r="16" fill="#fef3c7" />
      <text x="268" y="46" fontSize="10" fill="#92400e">
        23:00
      </text>
      <ellipse cx="140" cy="108" rx="36" ry="20" fill="#fce7f3" />
      <circle cx="140" cy="88" r="14" fill="#fda4af" />
      <rect x="200" y="72" width="72" height="48" rx="8" fill="#e0e7ff" stroke="#6366f1" />
      <text x="212" y="100" fontSize="9" fill="#4338ca">
        huisartsenpost
      </text>
    </Frame>
  )
}

function SceneGeld0() {
  return (
    <Frame label="Belastingbrief">
      <rect x="100" y="56" width="120" height="80" rx="6" fill="#1d4ed8" />
      <text x="118" y="96" fontSize="11" fill="#fff" fontWeight="bold">
        BELASTING
      </text>
      <rect x="220" y="80" width="48" height="32" rx="4" fill="#fef3c7" className="knm-anim-float" />
    </Frame>
  )
}
function SceneGeld1() {
  return (
    <Frame label="Autoschade">
      <rect x="48" y="100" width="200" height="8" fill="#64748b" />
      <rect x="80" y="72" width="96" height="36" rx="8" fill="#ef4444" opacity=".85" />
      <rect x="200" y="56" width="64" height="48" rx="8" fill="#fff" stroke="#6366f1" />
      <text x="212" y="84" fontSize="9" fill="#4338ca">
        verzekering
      </text>
    </Frame>
  )
}
function SceneGeld2() {
  return (
    <Frame label="Bonnetjes">
      <rect x="72" y="48" width="64" height="88" rx="4" fill="#fff" stroke="#cbd5e1" />
      <rect x="152" y="56" width="64" height="72" rx="4" fill="#fff" stroke="#cbd5e1" />
      <rect x="232" y="64" width="48" height="64" rx="4" fill="#fff" stroke="#cbd5e1" className="knm-anim-float" />
      <text x="88" y="100" fontSize="10" fill="#64748b">
        bon
      </text>
    </Frame>
  )
}
function SceneGeld3() {
  return (
    <Frame label="Premie brief">
      <rect x="96" y="52" width="128" height="80" rx="8" fill="#fff" stroke="#f59e0b" strokeWidth="2" />
      <text x="120" y="88" fontSize="12" fill="#b45309" fontWeight="bold">
        PREMIE ↑
      </text>
      <path d="M120 100 L160 72 L200 100" stroke="#f59e0b" strokeWidth="3" fill="none" className="knm-anim-pulse" />
    </Frame>
  )
}

function SceneVoorbeeldDelta() {
  return (
    <Frame label="Deltawerken">
      <path d="M0 120 L320 120 L320 168 L0 168 Z" fill="#38bdf8" opacity=".5" />
      <path d="M80 120 L120 80 L160 120 Z" fill="#64748b" />
      <path d="M200 120 L240 90 L280 120 Z" fill="#64748b" />
      <ellipse cx="160" cy="100" rx="120" ry="8" fill="#0ea5e9" className="knm-anim-pulse" opacity=".6" />
    </Frame>
  )
}
function SceneVoorbeeldUn() {
  return (
    <Frame label="VN">
      <rect x="120" y="48" width="80" height="80" fill="#2563eb" />
      <circle cx="160" cy="88" r="28" fill="#fff" opacity=".9" />
      <ellipse cx="160" cy="88" rx="32" ry="12" fill="none" stroke="#fff" strokeWidth="3" className="knm-anim-float" />
    </Frame>
  )
}
function SceneVoorbeeldAmsterdam() {
  return (
    <Frame label="Amsterdam">
      <rect x="0" y="110" width="320" height="58" fill="#7dd3fc" opacity=".5" />
      <rect x="60" y="72" width="36" height="48" fill="#b45309" />
      <rect x="110" y="56" width="36" height="64" fill="#b45309" />
      <rect x="160" y="64" width="36" height="56" fill="#b45309" />
      <rect x="210" y="48" width="36" height="72" fill="#b45309" />
    </Frame>
  )
}
function SceneVoorbeeldWilhelmus() {
  return (
    <Frame label="Wilhelmus">
      <rect x="100" y="44" width="120" height="96" rx="6" fill="#fef3c7" stroke="#ca8a04" />
      <text x="128" y="100" fontSize="14" fill="#854d0e" fontWeight="bold">
        ♪ Wilhelmus
      </text>
      <rect x="128" y="48" width="64" height="8" fill="#f59e0b" className="knm-anim-pulse" />
    </Frame>
  )
}
function SceneVoorbeeldHolocaust() {
  return (
    <Frame label="WOII">
      <rect x="48" y="56" width="224" height="72" rx="6" fill="#e2e8f0" />
      <text x="100" y="100" fontSize="14" fill="#334155" fontWeight="bold">
        1940 – 1945
      </text>
      <circle cx="88" cy="72" r="8" fill="#64748b" className="knm-anim-pulse" />
    </Frame>
  )
}
function SceneVoorbeeldKoningsdag() {
  return <SceneIntegratie1 />
}
function SceneVoorbeeldTweedeKamer() {
  return <SceneOverheid3 />
}
function SceneVoorbeeldStembus() {
  return <SceneOverheid0 />
}
function SceneVoorbeeldRijksmuseum() {
  return (
    <Frame label="Rijksmuseum">
      <rect x="72" y="64" width="176" height="72" rx="4" fill="#b45309" />
      <rect x="100" y="48" width="120" height="24" fill="#92400e" />
      <rect x="140" y="40" width="40" height="80" fill="#78350f" />
      <text x="108" y="108" fontSize="11" fill="#fff">
        RIJKSMUSEUM
      </text>
    </Frame>
  )
}
function SceneVoorbeeldCao() {
  return <SceneWerk1 />
}
function SceneVoorbeeldHuisarts() {
  return <SceneZorg2 />
}
function SceneVoorbeeldBelasting() {
  return <SceneGeld0 />
}

export const KNM_ILLUSTRATION_SCENES: Record<KnmIllustrationId, ComponentType<SceneProps>> = {
  zorg_gezondheid_0: SceneZorg0,
  zorg_gezondheid_1: SceneZorg1,
  zorg_gezondheid_2: SceneZorg2,
  zorg_gezondheid_3: SceneZorg3,
  werk_inkomen_0: SceneWerk0,
  werk_inkomen_1: SceneWerk1,
  werk_inkomen_2: SceneWerk2,
  werk_inkomen_3: SceneWerk3,
  onderwijs_opvoeding_0: SceneOnderwijs0,
  onderwijs_opvoeding_1: SceneOnderwijs1,
  onderwijs_opvoeding_2: SceneOnderwijs2,
  onderwijs_opvoeding_3: SceneOnderwijs3,
  wonen_buurt_0: SceneWonen0,
  wonen_buurt_1: SceneWonen1,
  wonen_buurt_2: SceneWonen2,
  wonen_buurt_3: SceneWonen3,
  overheid_recht_0: SceneOverheid0,
  overheid_recht_1: SceneOverheid1,
  overheid_recht_2: SceneOverheid2,
  overheid_recht_3: SceneOverheid3,
  integratie_cultuur_0: SceneIntegratie0,
  integratie_cultuur_1: SceneIntegratie1,
  integratie_cultuur_2: SceneIntegratie2,
  integratie_cultuur_3: SceneIntegratie3,
  veiligheid_hulp_0: SceneVeiligheid0,
  veiligheid_hulp_1: SceneVeiligheid1,
  veiligheid_hulp_2: SceneVeiligheid2,
  veiligheid_hulp_3: SceneVeiligheid3,
  geld_belasting_verzekering_0: SceneGeld0,
  geld_belasting_verzekering_1: SceneGeld1,
  geld_belasting_verzekering_2: SceneGeld2,
  geld_belasting_verzekering_3: SceneGeld3,
  voorbeeld_delta: SceneVoorbeeldDelta,
  voorbeeld_un: SceneVoorbeeldUn,
  voorbeeld_amsterdam: SceneVoorbeeldAmsterdam,
  voorbeeld_wilhelmus: SceneVoorbeeldWilhelmus,
  voorbeeld_holocaust: SceneVoorbeeldHolocaust,
  voorbeeld_koningsdag: SceneVoorbeeldKoningsdag,
  voorbeeld_tweede_kamer: SceneVoorbeeldTweedeKamer,
  voorbeeld_stembus: SceneVoorbeeldStembus,
  voorbeeld_rijksmuseum: SceneVoorbeeldRijksmuseum,
  voorbeeld_cao: SceneVoorbeeldCao,
  voorbeeld_huisarts: SceneVoorbeeldHuisarts,
  voorbeeld_belastingdienst: SceneVoorbeeldBelasting,
}
