import React from 'react';
import { ShieldAlert, LifeBuoy, HeartHandshake } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="app-footer" className="mt-auto w-full border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8 shadow-inner">
      <div className="mx-auto max-w-7xl font-sans">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-lg">
            <div className="flex items-center space-x-2 text-emerald-600 font-bold text-sm mb-2">
              <LifeBuoy className="h-4 w-4" />
              <span>CIPA - Gestão Ativa de Segurança</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              A Comissão Interna de Prevenção de Acidentes e Assédio (CIPA) é um órgão de representação dos empregados dedicada a tornar o nosso ambiente de trabalho imbativelmente seguro, saudável e acolhedor para todas as áreas.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end text-center md:text-right max-w-md">
            <div className="flex items-center space-x-2 text-amber-600 font-bold text-xs tracking-wider uppercase mb-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Aviso Importante</span>
            </div>
            <p className="text-[10px] sm:text-xs text-amber-705 leading-normal max-w-sm font-medium">
              ESTE CANAL DE COMUNICAÇÃO NÃO SUBSTITUI OS CANAIS OFICIAIS DA EMPRESA COMO: OBSERVAÇÃO DE SEGURANÇA, FCRI, LINHA ÉTICA.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-1">
            <HeartHandshake className="h-3.5 w-3.5 text-emerald-600" />
            <span>Colaboração e Confidencialidade garantidas à CIPA.</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Sistema de Atendimento ao Colaborador. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}
