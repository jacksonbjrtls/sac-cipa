import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Calendar, Tag, MapPin, 
  Clock, AlertCircle, FileText, MessageSquare
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Registration, OperationType } from '../types';

interface ProtocolTrackerProps {
  initialProtocolId?: string;
}

export default function ProtocolTracker({ initialProtocolId = '' }: ProtocolTrackerProps) {
  const [searchId, setSearchId] = useState<string>(initialProtocolId);
  const [loading, setLoading] = useState<boolean>(false);
  const [record, setRecord] = useState<Registration | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialProtocolId) {
      handleSearch(initialProtocolId);
    }
  }, [initialProtocolId]);

  const handleSearch = async (targetId: string = searchId) => {
    const cleanId = targetId.replace(/#|CIPA-/g, '').trim();
    if (!cleanId) {
      setErrorMsg("Insira o código identificador do protocolo.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setRecord(null);

    try {
      const docRef = doc(db, 'registrations', cleanId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecord({
          id: docSnap.id,
          ...data
        } as Registration);
      } else {
        setErrorMsg("Relato não localizado. Verifique se o código correspondente está correto.");
      }
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.GET, `registrations/${cleanId}`);
      } catch (finalError: any) {
        setErrorMsg(`Erro ao acessar banco de dados da CIPA: ${finalError.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status: Registration['status']) => {
    switch (status) {
      case 'pendente':
        return { text: 'Pendente', color: 'bg-yellow-50 text-yellow-800 border border-yellow-250' };
      case 'em_analise':
        return { text: 'Em Análise', color: 'bg-emerald-50 text-emerald-800 border border-emerald-200' };
      case 'resolvido':
        return { text: 'Resolvido', color: 'bg-emerald-50 text-emerald-800 border border-emerald-250' };
      case 'arquivado':
        return { text: 'Arquivado', color: 'bg-slate-100 text-slate-600 border border-slate-200' };
      default:
        return { text: status, color: 'bg-slate-100 text-slate-655' };
    }
  };

  return (
    <div id="protocol-tracker-section" className="w-full space-y-6 font-sans">
      {/* Title block */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-800 p-6 border border-emerald-500/15 shadow-sm text-white">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2 flex items-center gap-2">
          <Search className="h-6 w-6 text-white" />
          <span>Consultar Status de Protocolo</span>
        </h2>
        <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed max-w-2xl">
          Submeteu um relato anteriormente? Cole o ID gerado abaixo para verificar em tempo real qual é o status de andamento e ler as respostas ou observações anotadas pela CIPA.
        </p>
      </div>

      {/* Input container */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            id="protocol-search-input"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Cole o código do protocolo (Ex: 8dFasfA8fhSks9WjaoK2)"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/10"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={loading}
          id="protocol-search-btn"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm shadow-emerald-100"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Verificar</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="flex gap-3 items-start rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-850 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Record info block */}
      {record && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-slate-800"
        >
          {/* Header info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs text-slate-400 font-bold">PROTOCOLO</span>
                <span className="font-mono text-sm font-bold text-emerald-700">#CIPA-{record.id}</span>
              </div>
              <p className="text-[11px] text-slate-405 mt-1 font-medium bg-slate-50 border border-slate-100 inline-block px-1.5 py-0.5 rounded">
                Registrado em: {record.createdAt?.seconds ? new Date(record.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Agora mesmo'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${statusLabel(record.status).color}`}>
                Status: {statusLabel(record.status).text}
              </span>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Olá! Registrei um relato na CIPA da Eldorado Brasil e salvei meu protocolo para acompanhar futuramente.\n\nCódigo do Protocolo: #CIPA-${record.id}\nStatus Atual: ${statusLabel(record.status).text}\n\nPara consultar o andamento e o parecer da comissão, acesse:\n${typeof window !== 'undefined' ? window.location.href : 'https://cipa.eldorado.com.br'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wide px-3 py-1.5 rounded-full transition-all shadow-xs cursor-pointer select-none"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current text-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.004 2C6.48 2 2 6.48 2 12c0 1.76.46 3.41 1.27 4.88L2 22l5.3-1.28c1.41.77 3.01 1.28 4.7 1.28 5.52 0 10-4.48 10-10S17.524 2 12.004 2zm5.72 13.91c-.24.68-1.19 1.23-1.63 1.27-.4.04-.91.06-1.46-.11l-.19-.05c-1.39-.42-2.73-1.44-3.83-2.54-1.11-1.1-2.12-2.45-2.55-3.83-.17-.55-.15-1.06-.11-1.46.04-.44.59-1.39 1.27-1.63.15-.05.29-.07.41-.07.13 0 .25.01.35.25.13.31.54 1.32.59 1.42.05.1.06.21.01.32-.05.11-.11.23-.17.3l-.33.32c-.09.09-.19.19-.09.36.17.3.56.91 1.05 1.4 1 .99 1.84 1.3 2.1 1.42.17.08.27.06.36-.03.11-.11.47-.55.59-.74.12-.19.24-.16.4-.1s1.08.51 1.26.6c.19.09.31.14.36.21.05.08.05.47-.19 1.15z"/>
                </svg>
                <span>Salvar no WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Quick specs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50/50 border border-slate-100">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Obs.: Data</p>
                <p className="text-xs font-bold text-slate-707">{record.dateObservation}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50/50 border border-slate-100">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unidade/Setor</p>
                <p className="text-xs font-bold text-slate-705 truncate" title={record.area}>{record.area}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50/50 border border-slate-100">
              <Tag className="h-5 w-5 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Categoria</p>
                <p className="text-xs font-bold text-slate-705 truncate" title={record.category}>{record.category}</p>
              </div>
            </div>
          </div>

          {/* Content details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs select-none">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>DETALHES DO RELATO</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 overflow-hidden leading-relaxed text-sm text-slate-700 font-mono whitespace-pre-wrap">
              {record.info}
            </div>
          </div>

          {/* Contact and Identity tracker */}
          <div className="text-xs text-slate-500 border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between gap-3 font-medium">
            <div>
              <span className="font-bold text-slate-400 mr-2">Identidade do Autor:</span>
              <span className={record.isIdentified ? 'text-emerald-700 font-extrabold' : 'text-slate-500'}>
                {record.isIdentified ? `IDENTIFICADO` : `ANÔNIMO (Confidencial)`}
              </span>
            </div>
            {record.isIdentified && record.name && (
              <div className="sm:text-right bg-slate-50 border border-slate-100 py-1 px-3 rounded-lg">
                <p className="font-bold text-slate-700">{record.name}</p>
                <p className="text-[10px] text-slate-405 font-mono">{record.email || record.phone || 'Sem contato cadastrado'}</p>
              </div>
            )}
          </div>

          {/* Response text block */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wide">
              <MessageSquare className="h-4.5 w-4.5 text-emerald-600" />
              <span>PARECER / RETORNO DA CIPA</span>
            </div>

            {record.adminNotes ? (
              <div className="bg-emerald-50/50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl leading-relaxed text-sm shadow-sm">
                <p className="font-mono text-[10px] text-emerald-700/80 mb-2 border-b border-emerald-100 pb-1.5 flex items-center justify-between font-bold">
                  <span>RESPOSTA DO COMITÊ</span>
                  {record.respondedAt && (
                    <span>
                      {new Date(record.respondedAt?.seconds * 1000).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </p>
                <p className="text-slate-800 leading-relaxed font-sans font-medium">{record.adminNotes}</p>
              </div>
            ) : (
              <div className="p-4 border border-slate-200 bg-slate-50/50 text-slate-500 rounded-xl leading-normal text-xs font-semibold italic flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span>Nossa mesa diretora está averiguando este protocolo. O parecer será disponibilizado de forma transparente neste espaço assim que for registrado.</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
