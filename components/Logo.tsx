import React from 'react';

export const Logo = ({ className, showText = false }: { className?: string, showText?: boolean }) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-xl"
    >
      <defs>
        <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#22c55e" />
          <stop offset="1" stopColor="#14532d" />
        </linearGradient>
        <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.3)"/>
        </filter>
        <clipPath id="roundedBox">
            <rect width="200" height="200" rx="35" />
        </clipPath>
      </defs>

      {/* App Icon Container */}
      <g clipPath="url(#roundedBox)">
          {/* Background Map */}
          <rect width="200" height="200" fill="#f3f4f6" />
          
          {/* Map Grid Lines (Streets) */}
          <g stroke="white" strokeWidth="6">
            <path d="M50 0 V200" />
            <path d="M100 0 V200" />
            <path d="M150 0 V200" />
            <path d="M0 50 H200" />
            <path d="M0 100 H200" />
            <path d="M0 150 H200" />
          </g>
          
          {/* Route Path (Blue) */}
          <path 
            d="M50 160 Q 90 160 100 120 T 150 70" 
            stroke="#2563eb" 
            strokeWidth="16" 
            strokeLinecap="round" 
            fill="none" 
            strokeLinejoin="round"
            filter="url(#shadow)"
          />
          {/* Route Highlight */}
          <path 
            d="M50 160 Q 90 160 100 120 T 150 70" 
            stroke="#60a5fa" 
            strokeWidth="4" 
            strokeLinecap="round" 
            fill="none" 
            strokeLinejoin="round"
            opacity="0.6"
          />

          {/* Start Pin (Green) - Bottom Left */}
          <g transform="translate(50, 160)" filter="url(#shadow)">
             <path d="M0 0 L-12 -28 A 12 12 0 1 1 12 -28 Z" fill="url(#greenGrad)" stroke="white" strokeWidth="1"/>
             <circle cx="0" cy="-28" r="5" fill="white" />
          </g>

          {/* End Pin (Red) - Top Right */}
          <g transform="translate(150, 70)" filter="url(#shadow)">
             {/* Ripple Effect base */}
             <circle cx="0" cy="0" r="30" fill="#ef4444" opacity="0.15" />
             <circle cx="0" cy="0" r="20" fill="#ef4444" opacity="0.25" />
             {/* Pin Body */}
             <path d="M0 0 L-18 -45 A 18 18 0 1 1 18 -45 Z" fill="url(#redGrad)" stroke="white" strokeWidth="1" />
             <circle cx="0" cy="-45" r="7" fill="white" />
          </g>

          {/* Car (Yellow) - Middle */}
          <g transform="translate(100, 115) rotate(-15)" filter="url(#shadow)">
             {/* Body */}
             <path d="M-22 0 L22 0 L22 -12 L10 -20 L-12 -20 L-22 -12 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1"/>
             <rect x="-22" y="0" width="44" height="8" fill="#eab308" />
             {/* Windows */}
             <path d="M-10 -18 L8 -18 L16 -12 L-16 -12 Z" fill="#1e293b" />
             {/* Wheels */}
             <circle cx="-14" cy="8" r="6" fill="#1f2937" stroke="#9ca3af" strokeWidth="2"/>
             <circle cx="14" cy="8" r="6" fill="#1f2937" stroke="#9ca3af" strokeWidth="2"/>
          </g>

          {/* Microphone Icon (Top Left) */}
          <g transform="translate(40, 40)" filter="url(#shadow)">
             <circle r="26" fill="url(#blueGrad)" stroke="white" strokeWidth="2"/>
             <rect x="-6" y="-10" width="12" height="16" rx="6" fill="white" />
             <path d="M-10 6 Q0 16 10 6" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
             <line x1="0" y1="16" x2="0" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round" />
             <line x1="-6" y1="22" x2="6" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round" />
             {/* Signal waves */}
             <path d="M-16 -6 Q-22 0 -16 6" stroke="white" strokeWidth="2" fill="none" opacity="0.7"/>
             <path d="M16 -6 Q22 0 16 6" stroke="white" strokeWidth="2" fill="none" opacity="0.7"/>
          </g>

          {/* GPS Text (Bottom Right) */}
          <g transform="translate(160, 185) rotate(-5)">
             <text textAnchor="middle" fontSize="38" fontWeight="900" fill="white" stroke="#2563eb" strokeWidth="6" strokeLinejoin="round" style={{fontFamily: 'Arial Black, sans-serif', letterSpacing: '-2px'}}>GPS</text>
             <text textAnchor="middle" fontSize="38" fontWeight="900" fill="white" style={{fontFamily: 'Arial Black, sans-serif', letterSpacing: '-2px'}}>GPS</text>
          </g>
      </g>
    </svg>
    
    {showText && (
      <div className="text-center mt-2">
        <h1 className="text-2xl font-black tracking-tighter uppercase leading-none flex items-center justify-center gap-px">
          <span style={{ color: '#2563eb' }}>FROTA</span>
          <span style={{ color: '#ef4444' }}>PRO</span>
        </h1>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Navegação Inteligente</p>
      </div>
    )}
  </div>
);