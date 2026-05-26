import React from 'react';
import { ShieldCheck, LayoutDashboard, Search, FileText, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';
import CipaLogo from './CipaLogo';

interface HeaderProps {
  currentView: 'form' | 'tracker' | 'admin';
  setView: (view: 'form' | 'tracker' | 'admin') => void;
  user: User | null;
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
  customLogo?: string | null;
}

export default function Header({ 
  currentView, setView, user, isAdmin, onLogin, onLogout, customLogo 
}: HeaderProps) {
  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2 sm:px-6 lg:px-8 font-sans">
        <div id="logo-section" className="flex items-center space-x-1 sm:space-x-3 cursor-pointer select-none shrink-0" onClick={() => setView('form')}>
          <CipaLogo customLogo={customLogo} size={34} className="shrink-0" />
          <div className="flex flex-col">
            <span className="block sm:hidden font-sans text-xs font-black tracking-wider text-slate-800 leading-none">
              SAC <span className="text-emerald-700">CIPA</span>
            </span>
            <span className="hidden sm:block font-sans text-xs sm:text-sm md:text-base font-extrabold tracking-tight text-slate-800 leading-snug">
              Sistema de Atendimento ao Colaborador
            </span>
            <span className="hidden sm:inline-block mt-0.5 text-[9px] font-mono text-slate-400 self-start">
              Canal Oficial de Dúvidas & Relatos
            </span>
          </div>
        </div>

        <nav id="nav-menu" className="flex items-center space-x-1 sm:space-x-2 shrink-0 min-w-0">
          <button
            id="nav-btn-form"
            onClick={() => setView('form')}
            className={`flex items-center space-x-1 sm:space-x-1.5 rounded-lg p-2 sm:px-3 sm:py-2 text-sm font-medium transition-all cursor-pointer ${
              currentView === 'form'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-50'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            title="Registrar Relato"
          >
            <FileText className="h-4.5 w-4.5" />
            <span className="hidden md:inline">Registrar</span>
          </button>

          <button
            id="nav-btn-tracker"
            onClick={() => setView('tracker')}
            className={`flex items-center space-x-1 sm:space-x-1.5 rounded-lg p-2 sm:px-3 sm:py-2 text-sm font-medium transition-all cursor-pointer ${
              currentView === 'tracker'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-50'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            title="Consultar Protocolo"
          >
            <Search className="h-4.5 w-4.5" />
            <span className="hidden md:inline">Consultar</span>
          </button>

          {isAdmin && (
            <button
               id="nav-btn-admin"
               onClick={() => setView('admin')}
               className={`flex items-center space-x-1 sm:space-x-1.5 rounded-lg p-2 sm:px-3 sm:py-2 text-sm font-medium transition-all cursor-pointer shrink-0 ${
                 currentView === 'admin'
                   ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100'
                   : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
               }`}
               title="Escritório Digital"
             >
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span className="hidden md:inline">Painel Geral</span>
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 mx-0.5 sm:mx-1 md:mx-2 shrink-0" />

          {user ? (
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              <div className="hidden lg:flex flex-col items-end text-right shrink-0">
                <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">{user.displayName || user.email}</span>
                <span className="text-[10px] text-emerald-700 font-mono font-medium">
                  {isAdmin ? 'Administrador' : 'Colaborador'}
                </span>
              </div>
              
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  alt={user.displayName || 'Avatar'}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-slate-200 object-cover shadow-inner shrink-0"
                />
              ) : (
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-550 text-xs sm:text-sm border border-slate-200 uppercase shrink-0">
                  {(user.email || 'A')[0].toUpperCase()}
                </div>
              )}

              <button
                id="btn-logout"
                onClick={onLogout}
                title="Sair"
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-650 transition-all cursor-pointer border border-transparent hover:border-red-105 shrink-0"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login-header"
              onClick={onLogin}
              className="rounded-lg bg-slate-50 border border-slate-200 text-slate-700 px-2 sm:px-3.5 py-1.5 text-xs font-bold hover:border-slate-350 hover:bg-slate-100 transition-all text-center cursor-pointer shrink-0"
            >
              Login Admin
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
