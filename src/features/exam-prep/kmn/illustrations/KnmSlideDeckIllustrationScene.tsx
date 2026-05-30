'use client'

import type { ReactNode } from 'react'
import '@/lib/exam-system/knmSlideDeckPack'
import { getSlideDeckIllustrationConfig } from '@/lib/exam-prep/kmn/knmSlideDeckIllustrationCatalog'
import type { SlideDeckVisualConfig, SlideDeckVisualTopic } from '@/lib/exam-prep/kmn/knmSlideDeckIllustrationTypes'

const css = `
@keyframes knm-sd-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes knm-sd-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.06)} }
@keyframes knm-sd-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes knm-sd-blink { 0%,88%,100%{opacity:1} 94%{opacity:.25} }
.knm-sd-float { animation: knm-sd-float 2.6s ease-in-out infinite; }
.knm-sd-pulse { animation: knm-sd-pulse 1.5s ease-in-out infinite; }
.knm-sd-spin { animation: knm-sd-spin 8s linear infinite; transform-origin: center; }
.knm-sd-blink { animation: knm-sd-blink 2.8s ease-in-out infinite; }
`

const CATEGORY_ACCENT: Record<SlideDeckVisualConfig['category'], string> = {
  wonen_buurt: '#0ea5e9',
  werk_inkomen: '#6366f1',
  onderwijs_opvoeding: '#8b5cf6',
  zorg_gezondheid: '#22c55e',
  overheid_recht: '#f59e0b',
  integratie_cultuur: '#f97316',
  veiligheid_hulp: '#ef4444',
  geld_belasting_verzekering: '#14b8a6',
}

function Frame({
  children,
  label,
  accent,
  variant,
}: {
  children: ReactNode
  label: string
  accent: string
  variant: number
}) {
  const bgId = `knm-sd-bg-${variant}`
  return (
    <svg viewBox="0 0 320 168" className="w-full h-auto max-h-[13rem]" role="img" aria-label={label}>
      <style>{css}</style>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#eef2ff" />
        </linearGradient>
      </defs>
      <rect width="320" height="168" rx="12" fill={`url(#${bgId})`} />
      <rect x="8" y="8" width="304" height="4" rx="2" fill={accent} opacity=".35" />
      <rect
        x={12 + (variant % 4) * 8}
        y={148}
        width={120}
        height={14}
        rx="4"
        fill="#fff"
        stroke={accent}
        strokeWidth="1"
        opacity=".9"
      />
      <text x={20 + (variant % 4) * 8} y={159} fontSize="9" fill="#334155" fontWeight="600">
        {label.length > 22 ? `${label.slice(0, 20)}…` : label}
      </text>
      {children}
    </svg>
  )
}

function TopicArt({ topic, accent, variant }: { topic: SlideDeckVisualTopic; accent: string; variant: number }) {
  const ox = (variant % 4) * 12
  const oy = Math.floor(variant / 4) * 10
  const anim = variant % 3 === 0 ? 'knm-sd-float' : variant % 3 === 1 ? 'knm-sd-pulse' : 'knm-sd-blink'

  switch (topic) {
    case 'house':
    case 'housing_corp':
    case 'antikraak':
      return (
        <>
          <polygon points={`${72 + ox},${88 + oy} ${160 + ox},${48 + oy} ${248 + ox},${88 + oy}`} fill={accent} opacity=".85" />
          <rect x={88 + ox} y={88 + oy} width={144} height={56} rx="6" fill="#fff" stroke={accent} strokeWidth="2" />
          <rect x={120 + ox} y={108 + oy} width={32} height={36} rx="4" fill={accent} opacity=".4" className={anim} />
        </>
      )
    case 'contract':
    case 'cao':
    case 'payslip':
    case 'tax_letter':
    case 'constitution':
      return (
        <>
          <rect x={90 + ox} y={44 + oy} width={140} height={100} rx="8" fill="#fff" stroke={accent} strokeWidth="2" className={anim} />
          <path d={`M${110 + ox} ${64 + oy}h100M${110 + ox} ${78 + oy}h80M${110 + ox} ${92 + oy}h90M${110 + ox} ${106 + oy}h60`} stroke="#cbd5e1" strokeWidth="3" />
          <text x={200 + ox} y={130 + oy} fontSize="18" fill={accent}>
            ✎
          </text>
        </>
      )
    case 'moving':
    case 'transfer':
      return (
        <>
          <rect x={60 + ox} y={72 + oy} width={56} height={40} rx="4" fill="#94a3b8" className="knm-sd-float" />
          <path d={`M${130 + ox} ${92 + oy}h80`} stroke={accent} strokeWidth="4" markerEnd="url(#knm-sd-arr)" />
          <rect x={220 + ox} y={64 + oy} width="48" height="56" rx="6" fill="#fff" stroke={accent} strokeWidth="2" />
          <defs>
            <marker id="knm-sd-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={accent} />
            </marker>
          </defs>
        </>
      )
    case 'neighbors':
    case 'conflict':
      return (
        <>
          <rect x={48 + ox} y={56 + oy} width="64" height="72" rx="6" fill="#e2e8f0" />
          <rect x={208 + ox} y={56 + oy} width="64" height="72" rx="6" fill="#e2e8f0" />
          <text x={108 + ox} y={100 + oy} fontSize="22" fill={accent} className="knm-sd-pulse">
            ♪
          </text>
          <text x={168 + ox} y={48 + oy} fontSize="10" fill="#64748b">
            22:00
          </text>
        </>
      )
    case 'leak':
    case 'flood':
      return (
        <>
          <rect x={100 + ox} y={40 + oy} width="120" height="80" rx="6" fill="#fff" stroke="#94a3b8" />
          <ellipse cx={160 + ox} cy={72 + oy} rx="24" ry="12" fill="#7dd3fc" opacity=".6" className="knm-sd-pulse" />
          <path d={`M${152 + ox} ${84 + oy} Q${160 + ox} ${110 + oy} ${168 + ox} ${130 + oy}`} stroke="#0ea5e9" strokeWidth="3" fill="none" className="knm-sd-float" />
        </>
      )
    case 'mortgage':
    case 'bank':
    case 'savings':
      return (
        <>
          <rect x={80 + ox} y={52 + oy} width="160" height="72" rx="10" fill={accent} opacity=".9" />
          <text x={120 + ox} y={98 + oy} fontSize="14" fill="#fff" fontWeight="bold">
            BANK
          </text>
          <rect x={200 + ox} y={68 + oy} width="48" height="32" rx="4" fill="#fff" className={anim} />
        </>
      )
    case 'delta':
    case 'polder':
      return (
        <>
          <path d={`M${40 + ox} ${120 + oy} L${280 + ox} ${120 + oy} L${260 + ox} ${80 + oy} L${60 + ox} ${80 + oy} Z`} fill="#7dd3fc" opacity=".5" />
          <rect x={120 + ox} y={64 + oy} width="80" height="24" rx="4" fill={accent} className="knm-sd-pulse" />
          <path d={`M${100 + ox} ${88 + oy} L${220 + ox} ${88 + oy}`} stroke={accent} strokeWidth="4" />
        </>
      )
    case 'kingsday':
      return (
        <>
          <circle cx={160 + ox} cy={80 + oy} r="36" fill="#f97316" className="knm-sd-pulse" />
          <text x={142 + ox} y={88 + oy} fontSize="14" fill="#fff" fontWeight="bold">
            27 apr
          </text>
          <rect x={60 + ox} y={120 + oy} width="200" height="8" rx="2" fill="#fdba74" />
        </>
      )
    case 'remembrance':
      return (
        <>
          <rect x={140 + ox} y={48 + oy} width="40" height="72" rx="4" fill="#64748b" />
          <circle cx={160 + ox} cy={44 + oy} r="12" fill={accent} className="knm-sd-blink" />
          <text x={100 + ox} y={140 + oy} fontSize="11" fill="#475569">
            4 mei
          </text>
        </>
      )
    case 'liberation':
      return (
        <>
          <rect x={72 + ox} y={100 + oy} width="176" height="12" rx="2" fill="#dc2626" />
          <rect x={72 + ox} y={88 + oy} width="176" height="12" rx="2" fill="#fff" />
          <rect x={72 + ox} y={76 + oy} width="176" height="12" rx="2" fill="#2563eb" />
          <text x={118 + ox} y={70 + oy} fontSize="10" fill="#334155">
            5 mei
          </text>
        </>
      )
    case 'sinterklaas':
      return (
        <>
          <circle cx={160 + ox} cy={72 + oy} r="28" fill="#dc2626" className={anim} />
          <rect x={148 + ox} y={44 + oy} width="24" height="16" rx="4" fill="#dc2626" />
          <text x={132 + ox} y={120 + oy} fontSize="11" fill="#64748b">
            nov / dec
          </text>
        </>
      )
    case 'emergency':
    case 'police_report':
      return (
        <>
          <rect x={120 + ox} y={56 + oy} width="80" height="48" rx="8" fill="#dc2626" className="knm-sd-pulse" />
          <text x={138 + ox} y={88 + oy} fontSize="20" fill="#fff" fontWeight="bold">
            112
          </text>
        </>
      )
    case 'gp':
    case 'hap':
    case 'referral':
    case 'dentist':
      return (
        <>
          <rect x={100 + ox} y={48 + oy} width="120" height="80" rx="10" fill="#fff" stroke="#22c55e" strokeWidth="3" />
          <path d={`M${160 + ox} ${68 + oy}v32M${144 + ox} ${84 + oy}h32`} stroke="#22c55e" strokeWidth="6" className={anim} />
        </>
      )
    case 'pharmacy':
    case 'vaccine':
    case 'ggd':
      return (
        <>
          <rect x={108 + ox} y={44 + oy} width="104" height="88" rx="8" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" />
          <text x={128 + ox} y={96 + oy} fontSize="11" fill="#166534" fontWeight="bold">
            {topic === 'pharmacy' ? 'APOTHEEK' : topic === 'ggd' ? 'GGD' : 'VACCIN'}
          </text>
        </>
      )
    case 'school':
    case 'primary':
    case 'mbo':
    case 'homework':
    case 'diploma':
      return (
        <>
          <rect x={96 + ox} y={40 + oy} width="128" height="72" rx="6" fill="#fff" stroke={accent} strokeWidth="2" />
          <text x={130 + ox} y={72 + oy} fontSize="13" fill={accent} fontWeight="bold">
            SCHOOL
          </text>
          <rect x={112 + ox} y={84 + oy} width="96" height="20" rx="3" fill="#e0e7ff" className={anim} />
        </>
      )
    case 'tweede_kamer':
    case 'eerste_kamer':
    case 'cabinet':
    case 'democracy':
      return (
        <>
          <rect x={64 + ox} y={56 + oy} width="192" height="64" rx="6" fill={accent} opacity=".85" />
          <text x={topic === 'tweede_kamer' ? 108 : topic === 'eerste_kamer' ? 112 : 124} y={94 + oy} fontSize="10" fill="#fff" fontWeight="bold">
            {topic === 'tweede_kamer' ? 'TWEEDE KAMER' : topic === 'eerste_kamer' ? 'EERSTE KAMER' : topic === 'cabinet' ? 'KABINET' : 'DEMOCRATIE'}
          </text>
        </>
      )
    case 'king':
    case 'pm':
      return (
        <>
          <circle cx={160 + ox} cy={72 + oy} r="32" fill="#fbbf24" className={anim} />
          <rect x={132 + ox} y={104 + oy} width="56" height="32" rx="6" fill={accent} opacity=".8" />
          <text x={148 + ox} y={124 + oy} fontSize="9" fill="#fff">
            {topic === 'king' ? 'KONING' : 'MP'}
          </text>
        </>
      )
    case 'polling':
    case 'vote_age':
      return (
        <>
          <rect x={88 + ox} y={52 + oy} width="144" height="80" rx="8" fill="#fff" stroke={accent} strokeWidth="2" />
          <rect x={108 + ox} y={72 + oy} width="104" height="40" rx="4" fill="#e0e7ff" className={anim} />
          <text x={132 + ox} y={98 + oy} fontSize="10" fill={accent}>
            STEM
          </text>
        </>
      )
    case 'windmill':
      return (
        <>
          <rect x={140 + ox} y={100 + oy} width="8" height="40" fill="#78716c" />
          <g className="knm-sd-spin" style={{ transformOrigin: `${160 + ox}px ${88 + oy}px` }}>
            <path d={`M${160 + ox} ${88 + oy} L${200 + ox} ${72 + oy} L${160 + ox} ${88 + oy} L${120 + ox} ${72 + oy} Z`} fill={accent} opacity=".9" />
            <path d={`M${160 + ox} ${88 + oy} L${200 + ox} ${104 + oy} L${160 + ox} ${88 + oy} L${120 + ox} ${104 + oy} Z`} fill={accent} opacity=".7" />
          </g>
        </>
      )
    case 'flevoland':
    case 'randstad':
    case 'capital':
    case 'borders':
    case 'limburg':
    case 'provinces':
      return (
        <>
          <path d={`M${48 + ox} ${100 + oy} L${120 + ox} ${60 + oy} L${200 + ox} ${80 + oy} L${272 + ox} ${110 + oy} Z`} fill="#86efac" opacity=".6" stroke={accent} strokeWidth="2" />
          <circle cx={160 + ox} cy={88 + oy} r="8" fill={accent} className="knm-sd-pulse" />
          <text x={130 + ox} y={130 + oy} fontSize="10" fill="#334155">
            NL
          </text>
        </>
      )
    case 'anne':
    case 'ww2':
    case 'voc':
    case 'museum':
      return (
        <>
          <rect x={100 + ox} y={48 + oy} width="120" height="88" rx="4" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
          <text x={118 + ox} y={100 + oy} fontSize="11" fill="#92400e" fontWeight="bold">
            {topic === 'anne'
              ? 'ANNE FRANK'
              : topic === 'voc'
                ? 'VOC'
                : topic === 'museum'
                  ? 'MUSEUM'
                  : '1945'}
          </text>
        </>
      )
    case 'waste':
      return (
        <>
          <rect x={72 + ox} y={72 + oy} width="40" height="48" rx="4" fill="#22c55e" className={anim} />
          <rect x={128 + ox} y={72 + oy} width="40" height="48" rx="4" fill="#3b82f6" />
          <rect x={184 + ox} y={72 + oy} width="40" height="48" rx="4" fill="#64748b" />
        </>
      )
    case 'eu':
      return (
        <>
          <circle cx={160 + ox} cy={84 + oy} r="40" fill="#2563eb" opacity=".85" className={anim} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <circle
                key={i}
                cx={160 + ox + Math.cos(a) * 28}
                cy={84 + oy + Math.sin(a) * 28}
                r="3"
                fill="#fbbf24"
              />
            )
          })}
        </>
      )
    case 'digid':
      return (
        <>
          <rect x={100 + ox} y={52 + oy} width="120" height="72" rx="10" fill="#fff" stroke={accent} strokeWidth="2" />
          <text x={128 + ox} y={96 + oy} fontSize="14" fill={accent} fontWeight="bold">
            DigiD
          </text>
          <circle cx={220 + ox} cy={68 + oy} r="10" fill="#22c55e" className="knm-sd-pulse" />
        </>
      )
    case 'police':
    case 'domestic':
      return (
        <>
          <rect x={108 + ox} y={48 + oy} width="104" height="88" rx="8" fill={accent} opacity=".9" />
          <text x={132 + ox} y={100 + oy} fontSize="12" fill="#fff" fontWeight="bold">
            POLITIE
          </text>
        </>
      )
    case 'tax':
    case 'tax_return':
    case 'allowance':
      return (
        <>
          <rect x={88 + ox} y={44 + oy} width="144" height="96" rx="8" fill="#1e3a8a" className={anim} />
          <text x={108 + ox} y={100 + oy} fontSize="11" fill="#fff" fontWeight="bold">
            BELASTINGDIENST
          </text>
        </>
      )
    case 'car_ins':
    case 'liability':
    case 'contents':
    case 'insurance':
    case 'deductible':
      return (
        <>
          <rect x={96 + ox} y={56 + oy} width="128" height="72" rx="8" fill="#fff" stroke={accent} strokeWidth="2" />
          <text x={120 + ox} y={100 + oy} fontSize="12" fill={accent} fontWeight="bold">
            VERZEKERING
          </text>
          <text x={200 + ox} y={76 + oy} fontSize="16" fill={accent}>
            €
          </text>
        </>
      )
    case 'stolen_card':
      return (
        <>
          <rect x={120 + ox} y={64 + oy} width="80" height="52" rx="6" fill="#fecaca" stroke="#ef4444" strokeWidth="2" className="knm-sd-pulse" />
          <text x={140 + ox} y={96 + oy} fontSize="10" fill="#991b1b">
            BLOKKEER
          </text>
        </>
      )
    case 'judge':
    case 'legal':
      return (
        <>
          <rect x={120 + ox} y={40 + oy} width="80" height="100" rx="4" fill="#64748b" />
          <rect x={100 + ox} y={56 + oy} width="120" height="8" rx="2" fill={accent} />
          <text x={132 + ox} y={120 + oy} fontSize="10" fill="#fff">
            RECHT
          </text>
        </>
      )
    case 'handshake':
    case 'friends':
    case 'volunteer':
    case 'direct':
    case 'equality':
    case 'respect':
    case 'language':
    case 'anthem':
      return (
        <>
          <circle cx={120 + ox} cy={88 + oy} r="24" fill="#fde68a" className={anim} />
          <circle cx={200 + ox} cy={88 + oy} r="24" fill="#bfdbfe" className={anim} />
          <path d={`M${132 + ox} ${96 + oy} Q${160 + ox} ${72 + oy} ${188 + ox} ${96 + oy}`} stroke={accent} strokeWidth="3" fill="none" />
        </>
      )
    default:
      return (
        <>
          <circle cx={160 + ox} cy={84 + oy} r="36" fill={accent} opacity=".25" className={anim} />
          <rect x={120 + ox} y={64 + oy} width="80" height="48" rx="8" fill="#fff" stroke={accent} strokeWidth="2" />
        </>
      )
  }
}

export function KnmSlideDeckIllustrationScene(props: { illustrationId: string; className?: string }) {
  const config = getSlideDeckIllustrationConfig(props.illustrationId)
  if (!config) return null
  const accent = CATEGORY_ACCENT[config.category]
  return (
    <div className={props.className}>
      <Frame label={config.label} accent={accent} variant={config.variant}>
        <TopicArt topic={config.topic} accent={accent} variant={config.variant} />
      </Frame>
    </div>
  )
}
