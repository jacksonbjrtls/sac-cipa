import React from 'react';
import { ShieldCheck, LayoutDashboard, Search, FileText, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  currentView: 'form' | 'tracker' | 'admin';
  setView: (view: 'form' | 'tracker' | 'admin') => void;
  user: User | null;
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Header({ currentView, setView, user, isAdmin, onLogin, onLogout }: HeaderProps) {
  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 font-sans">
        <div id="logo-section" className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('form')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-100">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-sans text-lg font-bold tracking-tight text-slate-800">
              Sac <span className="text-blue-600 text-bold">CIPA</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50">
              Canal de Dúvidas
            </span>
          </div>
        </div>

        <nav id="nav-menu" className="flex items-center space-x-1 sm:space-x-2">
          <button
            id="nav-btn-form"
            onClick={() => setView('form')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
              currentView === 'form'
                ? 'bg-blue-50 text-blue-600 font-bold border border-blue-50'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Registrar</span>
          </button>

          <button
            id="nav-btn-tracker"
            onClick={() => setView('tracker')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
              currentView === 'tracker'
                ? 'bg-blue-50 text-blue-600 font-bold border border-blue-50'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Consultar</span>
          </button>

          {isAdmin && (
            <button
              id="nav-btn-admin"
              onClick={() => setView('admin')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Painel Geral</span>
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 mx-1 sm:mx-2" />

          {user ? (
            <div className="flex items-center space-x-2">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">{user.displayName || user.email}</span>
                <span className="text-[10px] text-blue-600 font-mono font-medium">
                  {isAdmin ? 'Administrador' : 'Colaborador'}
                </span>
              </div>
              
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  alt={user.displayName || 'Avatar'}
                  className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-inner"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-550 text-sm border border-slate-200">
                  {(user.email || 'A')[0].toUpperCase()}
                </div>
              )}

              <button
                id="btn-logout"
                onClick={onLogout}
                title="Sair"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login-header"
              onClick={onLogin}
              className="rounded-lg bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-1.5 text-xs font-semibold hover:border-slate-350 hover:bg-slate-100 transition-all text-center cursor-pointer"
            >
              Acesso Admin
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
