import React from 'react';

interface CipaLogoProps {
  customLogo?: string | null; // Keep for compatibility
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
  // Always render the local /logo/logo_cipa.png for absolute speed and no overhead
  return (
    <div className={`flex flex-col items-center justify-center shrink-0 ${className}`}>
      <img
        src="/logo/logo_cipa.png"
        alt="CIPA Logo"
        style={{ width: size, height: size }}
        className={`object-contain rounded-xl ${imgClassName}`}
        referrerPolicy="no-referrer"
      />
      {showText && (
        <div className="flex flex-col items-center text-center mt-3 font-sans">
          <span id="logo-sac-title" className="text-3xl font-black tracking-wider text-emerald-700 leading-none">SAC</span>
          <span id="logo-sac-subtitle" className="text-[11px] font-bold tracking-wide uppercase text-slate-500 max-w-[200px] leading-snug mt-1">
            Serviço de Atendimento ao Colaborador
          </span>
        </div>
      )}
    </div>
  );
}
