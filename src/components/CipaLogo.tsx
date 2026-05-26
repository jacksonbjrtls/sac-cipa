import React from 'react';

interface CipaLogoProps {
  customLogo?: string | null; // Base64 image
  className?: string; // Styles for wrapper
  size?: number; // Diameter of logo
  showText?: boolean; // Whether the "SAC" and Subtitle text should be shown below
  imgClassName?: string; // Optional classes for the custom image element
}

export default function CipaLogo({ 
  customLogo, 
  className = "", 
  size = 40, 
  showText = false, 
  imgClassName = "" 
}: CipaLogoProps) {
  if (customLogo) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src={customLogo}
          alt="CIPA Logo"
          style={{ width: size, height: size }}
          className={`object-contain rounded-2xl ${imgClassName}`}
          referrerPolicy="no-referrer"
        />
        {showText && (
          <div className="flex flex-col items-center text-center mt-3 font-sans">
            <span id="logo-sac-title" className="text-3xl font-black tracking-wider text-emerald-700 leading-none">SAC</span>
            <span id="logo-sac-subtitle" className="text-[11px] font-bold tracking-wide uppercase text-slate-500 max-w-[200px] leading-snug mt-1">
              Sistema de Atendimento ao Colaborador
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default CIPA safety crest (Green & White vector recreation)
  return (
    <div className={`flex flex-col items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        style={{ width: size, height: size }}
        className="text-emerald-700 select-none shrink-0"
        fill="currentColor"
      >
        {/* Main Solid Green Outer Circle */}
        <circle cx="50" cy="50" r="46" />
        
        <defs>
          {/* Upper curved path for CIPA text (180deg clockwise arc, radius = 33.5) */}
          <path id="top-text-arc" d="M 16.5,50 A 33.5,33.5 0 0,1 83.5,50" fill="none" />
          {/* Lower curved path for SEGURANÇA text (180deg clockwise arc, from right-to-left along bottom) */}
          <path id="bottom-text-arc" d="M 83.5,50 A 33.5,33.5 0 0,1 16.5,50" fill="none" />
        </defs>

        {/* "CIPA" Top curved text */}
        <text 
          fill="white" 
          fontSize="13.5" 
          fontWeight="900" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          letterSpacing="1.2" 
          textAnchor="middle"
        >
          <textPath href="#top-text-arc" startOffset="50%">CIPA</textPath>
        </text>

        {/* "SEGURANÇA" Bottom curved text */}
        <text 
          fill="white" 
          fontSize="9.2" 
          fontWeight="900" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          letterSpacing="0.4" 
          textAnchor="middle"
        >
          <textPath href="#bottom-text-arc" startOffset="50%">SEGURANÇA</textPath>
        </text>

        {/* Central Bold White Cross (100% symmetric, centered at 50,50) */}
        <path 
          d="M 43,28 H 57 V 43 H 72 V 57 H 57 V 72 H 43 V 57 H 28 V 43 H 43 Z" 
          fill="white" 
        />
      </svg>

      {showText && (
        <div className="flex flex-col items-center text-center mt-3.5 font-sans">
          <span className="text-3xl font-black tracking-wider text-emerald-700 leading-none">SAC</span>
          <span className="text-[11px] font-bold tracking-wide uppercase text-slate-500 max-w-[200px] leading-snug mt-1.5">
            Sistema de Atendimento ao Colaborador
          </span>
        </div>
      )}
    </div>
  );
}
