import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Calendar, UserCheck, MapPin, 
  Clipboard, Send, ChevronRight, 
  ChevronLeft, ArrowRight, AlertTriangle, Lightbulb, 
  Megaphone, Heart, HelpCircle as QuestionMark, Sparkles, CheckCircle2,
  Camera, Image as ImageIcon, X, ZoomIn, Check, Edit3, Flame, AlertCircle, RefreshCw
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { AREAS_LIST, SECTOR_GROUPS, getSectorGroup } from '../areas';
import { OperationType } from '../types';

interface FormWizardProps {
  onSuccess: (protocolId: string) => void;
}

export default function FormWizard({ onSuccess }: FormWizardProps) {
  // Step tracker (1 to 6)
  const [step, setStep] = useState<number>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Gratitude / Disagreement display overlay state
  const [showDisagreementThanks, setShowDisagreementThanks] = useState<boolean>(false);

  // Dynamic set of operating areas in real-time
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  // Filter chips for sector selection
  const [selectedSectorGroup, setSelectedSectorGroup] = useState<string>('Todas');
  const sectorGroupKeys = ['Todas', 'Produção & Processo', 'Manutenção & Oficinas', 'Qualidade & Engenharia', 'Logística & Suprimentos', 'SST & Meio Ambiente', 'Administrativo & Apoio'];

  // Photo attachment states
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);
  const [photoFileSize, setPhotoFileSize] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [photoModalOpen, setPhotoModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review / Summary expansion toggle
  const [showLiveSummary, setShowLiveSummary] = useState<boolean>(true);

  // Monitor the areas dynamically in Real-Time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'areas'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: string[] = [];
        snapshot.forEach((doc) => {
          const name = doc.data().name;
          if (name) {
            loaded.push(name);
          }
        });
        loaded.sort((a, b) => a.localeCompare(b));
        setAvailableAreas(loaded);
      } else {
        setAvailableAreas(AREAS_LIST);
      }
    }, (err) => {
      console.warn("Could not synchronize areas collection, using defaults:", err);
      setAvailableAreas(AREAS_LIST);
    });

    return () => unsubscribe();
  }, []);

  // Form states
  const [formData, setFormData] = useState({
    agreedToShare: null as boolean | null,
    dateObservation: (() => {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    })(),
    isIdentified: null as boolean | null,
    name: '',
    email: '',
    phone: '',
    area: '',
    category: '',
    urgency: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    info: '',
  });

  // Track max step reached to allow direct jumping
  useEffect(() => {
    if (step > maxReachedStep) {
      setMaxReachedStep(step);
    }
  }, [step, maxReachedStep]);

  // Autocomplete state for Area selection
  const [areaSearch, setAreaSearch] = useState<string>('');
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState<boolean>(false);

  // Filtered areas for autocomplete list by group and search query
  const filteredAreas = availableAreas.filter(area => {
    const matchesQuery = area.toLowerCase().includes(areaSearch.toLowerCase());
    if (selectedSectorGroup === 'Todas') return matchesQuery;
    const group = getSectorGroup(area);
    return matchesQuery && group === selectedSectorGroup;
  });

  // Client-side image compression using canvas
  const compressImage = (file: File): Promise<{ dataUrl: string; sizeKb: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          const approxBytes = Math.round((dataUrl.length * 3) / 4);
          const sizeKb = Math.round(approxBytes / 1024);
          resolve({ dataUrl, sizeKb });
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Por favor selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    setIsCompressingPhoto(true);
    setFormError(null);

    try {
      const { dataUrl, sizeKb } = await compressImage(file);
      setPhotoData(dataUrl);
      setPhotoFileName(file.name);
      setPhotoFileSize(`${sizeKb} KB`);
    } catch (err) {
      console.error('Erro na compressão da imagem:', err);
      setFormError('Não foi possível processar a imagem selecionada. Tente outra foto.');
    } finally {
      setIsCompressingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoData(null);
    setPhotoFileName(null);
    setPhotoFileSize(null);
  };

  // Auto-format date observation while typing
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    let formatted = '';
    if (value.length > 0) {
      formatted += value.slice(0, 2);
    }
    if (value.length > 2) {
      formatted += '/' + value.slice(2, 4);
    }
    if (value.length > 4) {
      formatted += '/' + value.slice(4, 8);
    }
    setFormData(prev => ({ ...prev, dateObservation: formatted }));
  };

  // Auto-format Brazilian phone format dynamic mask (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    let formatted = '';
    if (value.length > 0) {
      formatted += `(${value.slice(0, 2)}`;
    }
    if (value.length > 2) {
      formatted += `) ${value.slice(2, 7)}`;
    }
    if (value.length > 7) {
      if (value.length > 10) {
        formatted += `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
      } else {
        formatted += `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6, 10)}`;
      }
    }
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  // Helper to validate the active step before advancing
  const isStepValid = (stepNum: number = step) => {
    switch (stepNum) {
      case 1:
        return formData.agreedToShare === true;
      case 2:
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(19|20)\d\d$/;
        return dateRegex.test(formData.dateObservation);
      case 3:
        if (formData.isIdentified === null) return false;
        if (formData.isIdentified === true) {
          return formData.name.trim().length > 2 && 
                 (formData.email.trim().length > 4 || formData.phone.trim().length > 6);
        }
        return true;
      case 4:
        return availableAreas.includes(formData.area);
      case 5:
        return formData.category !== '';
      case 6:
        return formData.info.trim().length >= 10;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid(step)) {
      setFormError(null);
      setStep(prev => prev + 1);
    } else {
      if (step === 1) {
        setFormError("Você precisa concordar em compartilhar as informações com o comitê da CIPA para registrar seu relato.");
      } else if (step === 2) {
        setFormError("Informe uma data de observação válida no formato DD/MM/AAAA.");
      } else if (step === 3) {
        setFormError("Por favor, preencha seu nome e pelo menos um meio de contato (E-mail ou Telefone).");
      } else if (step === 4) {
        setFormError("Por favor, escolha uma das áreas constantes na lista oficial da empresa.");
      } else if (step === 5) {
        setFormError("Selecione uma categoria de registro para prosseguir.");
      } else if (step === 6) {
        setFormError("Por favor, descreva detalhadamente sua informação (mínimo de 10 caracteres).");
      }
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setFormError(null);
      setStep(prev => prev - 1);
    }
  };

  const jumpToStep = (targetStep: number) => {
    if (targetStep <= maxReachedStep || isStepValid(step)) {
      setFormError(null);
      setStep(targetStep);
    }
  };

  // Handles disagreement trigger
  const handleDisagreement = () => {
    setShowDisagreementThanks(true);
    setFormData(prev => ({
      ...prev,
      agreedToShare: null,
      area: '',
      category: '',
      urgency: 'media',
      info: ''
    }));
    setPhotoData(null);
    setPhotoFileName(null);
    setStep(1);
    setMaxReachedStep(1);
    setFormError(null);

    const timer = setTimeout(() => {
      setShowDisagreementThanks(false);
    }, 4500);

    return timer;
  };

  // Submission handler
  const handleSubmit = async () => {
    if (!isStepValid(6)) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: any = {
        agreedToShare: formData.agreedToShare,
        dateObservation: formData.dateObservation,
        isIdentified: formData.isIdentified,
        area: formData.area,
        category: formData.category,
        urgency: formData.urgency || 'media',
        info: formData.info.trim(),
        status: 'pendente',
        createdAt: serverTimestamp(),
      };

      if (photoData) {
        payload.photoData = photoData;
      }

      if (formData.isIdentified) {
        payload.name = formData.name.trim();
        payload.email = formData.email.trim();
        payload.phone = formData.phone.trim();
      }

      const docRef = await addDoc(collection(db, 'registrations'), payload);
      setIsSubmitting(false);
      onSuccess(docRef.id);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'registrations');
      } catch (finalError: any) {
        setFormError(`Erro ao enviar registro para o banco de dados da CIPA: ${finalError.message}`);
      }
    }
  };

  // Visual cards for Categories with automatic default urgency recommendation
  const categories = [
    {
      id: '💡Sugestão',
      label: '💡 Sugestão',
      desc: 'Ideias de melhoria para o ambiente de trabalho, processos industriais ou rotinas administrativas coletivas.',
      icon: Lightbulb,
      defaultUrgency: 'baixa' as const,
      color: 'border-yellow-200 hover:border-yellow-400 text-yellow-800 bg-yellow-50/40'
    },
    {
      id: '📢 Crítica/Reclamação',
      label: '📢 Crítica ou Reclamação',
      desc: 'Manifestações de descontentamento com serviços, dinâmicas de equipe ou problemas de convívio.',
      icon: Megaphone,
      defaultUrgency: 'media' as const,
      color: 'border-red-200 hover:border-red-400 text-red-800 bg-red-50/40'
    },
    {
      id: '❓Dúvida',
      label: '❓ Dúvida de Segurança',
      desc: 'Questões gerais sobre o uso e distribuição de EPIs, treinamentos formais, procedimentos internos ou SIPATAMA.',
      icon: QuestionMark,
      defaultUrgency: 'baixa' as const,
      color: 'border-sky-200 hover:border-sky-400 text-sky-800 bg-sky-50/40'
    },
    {
      id: '⚠️Relato de Condição Insegura',
      label: '⚠️ Condição Insegura',
      desc: 'Relato de risco iminente, quebra de máquinas, ausência de isolamento, vazamentos, risco de incêndio ou quase-acidentes.',
      icon: AlertTriangle,
      defaultUrgency: 'alta' as const,
      color: 'border-amber-200 hover:border-amber-400 text-amber-850 bg-amber-50/40'
    },
    {
      id: '👏Elogio',
      label: '👏 Elogio / Reconhecimento',
      desc: 'Reconhecimento aberto de colegas, equipes, ou iniciativas individuais que ilustraram ótimas práticas de SSO.',
      icon: Heart,
      defaultUrgency: 'baixa' as const,
      color: 'border-emerald-200 hover:border-emerald-400 text-emerald-800 bg-emerald-50/40'
    },
    {
      id: 'Assuntos Relacionados ao Meio Ambiente',
      label: '♻️ Assunto Ambiental',
      desc: 'Relações de descarte de resíduos, efluentes, sustentabilidade fabril ou outros recursos ecológicos.',
      icon: Sparkles,
      defaultUrgency: 'media' as const,
      color: 'border-teal-200 hover:border-teal-400 text-teal-800 bg-teal-50/40'
    }
  ];

  const stepsMeta = [
    { num: 1, label: 'Consentimento' },
    { num: 2, label: 'Data Fato' },
    { num: 3, label: 'Identificação' },
    { num: 4, label: 'Área & Setor' },
    { num: 5, label: 'Classificação' },
    { num: 6, label: 'Relato & Evidência' },
  ];

  return (
    <div id="registration-wizard" className="w-full font-sans">
      {/* CIPA Header Banner */}
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-800 p-6 sm:p-8 border border-emerald-600/15 shadow-sm text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-mono uppercase tracking-wider mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Canal Oficial de Escuta & Prevenção</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              Serviço de Atendimento ao Colaborador
            </h1>
            <p className="text-emerald-50 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Registre dúvidas, sugestões, elogios ou aponte condições de risco diretamente para os cipeiros eleitos. Sua voz constrói um ambiente seguro para todos.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto bg-emerald-800/60 border border-emerald-600/40 px-3.5 py-2 rounded-2xl text-xs font-mono text-emerald-100">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sigilo & Cuidado Garantidos</span>
          </div>
        </div>
      </div>

      {/* Interactive, Clickable Stepper Navigation */}
      {!showDisagreementThanks && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-6 gap-1 sm:gap-2">
            {stepsMeta.map((s) => {
              const isCurrent = step === s.num;
              const isCompleted = isStepValid(s.num) && s.num < step;
              const canClick = s.num <= maxReachedStep;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => jumpToStep(s.num)}
                  disabled={!canClick}
                  className={`group flex flex-col items-center justify-center p-2 rounded-xl transition-all text-center select-none ${
                    isCurrent
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs'
                      : isCompleted
                        ? 'hover:bg-slate-50 text-slate-700 cursor-pointer'
                        : canClick
                          ? 'hover:bg-slate-50 text-slate-400 cursor-pointer'
                          : 'text-slate-300 opacity-60 cursor-not-allowed'
                  }`}
                  title={canClick ? `Ir para o Passo ${s.num}: ${s.label}` : `Complete os passos anteriores`}
                >
                  <div className="flex items-center justify-center">
                    <div className={`h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-mono font-bold transition-transform ${
                      isCurrent
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/40 scale-105'
                        : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.num}
                    </div>
                  </div>
                  <span className={`hidden md:block text-[11px] font-medium mt-1 truncate max-w-full ${
                    isCurrent ? 'font-bold text-emerald-900' : 'text-slate-500'
                  }`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-mono text-[11px]">
              Etapa <strong className="text-emerald-700 font-bold">{step}</strong> de 6: {stepsMeta[step - 1]?.label}
            </span>
            <span className="text-[11px] text-slate-400">
              * Clique em etapas anteriores para revisar dados a qualquer momento
            </span>
          </div>
        </div>
      )}

      {formError && !showDisagreementThanks && (
        <div className="mb-6 flex gap-3 items-start rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-800 shadow-sm animate-shake">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p>{formError}</p>
        </div>
      )}

      {/* Step Container Cards */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative min-h-[340px]">
        <AnimatePresence mode="wait">
          {showDisagreementThanks ? (
            <motion.div
              key="disagreementThanks"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-10 text-center space-y-6"
            >
              <div className="bg-emerald-50 p-4 rounded-full text-emerald-600 animate-bounce">
                <Heart className="h-10 w-10 fill-emerald-600/10 text-emerald-500" />
              </div>
              <div className="space-y-3 max-w-md">
                <h3 className="text-xl font-extrabold text-slate-800">Agradecemos de coração!</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                  Sua privacidade e opinião são de suma importância para nós. Entendemos e respeitamos sua escolha de não prosseguir com o compartilhamento neste momento.
                </p>
                <p className="text-xs text-slate-400">
                  A Segurança Ocupacional e o bem-estar coletivo começam com cada colaborador. Esperamos contar com você em uma próxima oportunidade!
                </p>
              </div>

              <div className="pt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  id="btn-manual-reset-thanks"
                  onClick={() => setShowDisagreementThanks(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Voltar ao Início
                </button>
                <span className="text-[10px] text-slate-400 font-mono mt-1">Sendo redirecionado automaticamente...</span>
              </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-800">Comitê de Transparência & Sigilo CIPA</h3>
                  <p className="text-xs text-slate-400">Passo 1: Autorização de averiguação com o comitê oficial</p>
                </div>
              </div>
              
              <div className="border-l-4 border-emerald-500 bg-emerald-50/40 p-5 rounded-r-2xl space-y-3">
                <p className="text-[13px] sm:text-sm text-slate-800 font-bold tracking-wide leading-relaxed">
                  Aviso de Segurança e Compartilhamento:
                </p>
                <p className="text-xs sm:text-[13px] text-amber-800 font-semibold leading-relaxed bg-amber-50/80 p-3 rounded-xl border border-amber-200">
                  ESTE CANAL DE COMUNICAÇÃO NÃO SUBSTITUI OS CANAIS OFICIAIS DA EMPRESA COMO: OBSERVAÇÃO DE SEGURANÇA, FCRI, LINHA ÉTICA.
                </p>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Você está de acordo em compartilhar sua informação com o comitê oficial da CIPA para fins de averiguação e resolução de pendências?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  id="agree-share-yes"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, agreedToShare: true }));
                    setFormError(null);
                  }}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all cursor-pointer ${
                    formData.agreedToShare === true
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-5 w-5 ${formData.agreedToShare === true ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-lg font-bold">CONCORDO</span>
                  </div>
                  <span className="text-xs mt-1 opacity-80">Autorizo o envio ao comitê da CIPA</span>
                </button>

                <button
                  type="button"
                  id="agree-share-no"
                  onClick={handleDisagreement}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all cursor-pointer border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-slate-400" />
                    <span className="text-lg font-bold">NÃO CONCORDO</span>
                  </div>
                  <span className="text-xs mt-1 opacity-80">A mesa diretiva não receberá o relato</span>
                </button>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-800">Informe a Data da Observação</h3>
                  <p className="text-xs text-slate-400">Passo 2: Dia em que o fato ou a situação foi constatada</p>
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Data do Ocorrido ou Constatação (dd/MM/yyyy)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="date-observation-input"
                    value={formData.dateObservation}
                    onChange={handleDateChange}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-mono text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                  <span className="absolute right-3.5 top-3.5 text-slate-400">
                    <Calendar className="h-5 w-5" />
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const dd = String(today.getDate()).padStart(2, '0');
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      const yyyy = today.getFullYear();
                      setFormData(prev => ({ ...prev, dateObservation: `${dd}/${mm}/${yyyy}` }));
                    }}
                    className="text-emerald-700 hover:underline font-bold"
                  >
                    Usar data de hoje ({new Date().toLocaleDateString('pt-BR')})
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 3 ? (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-800">Deseja se Identificar?</h3>
                  <p className="text-xs text-slate-400">Passo 3: A identificação é 100% facultativa</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Você pode optar por enviar seu relato <strong>anonimamente</strong> ou anexar seus dados caso queira receber um retorno nominal da equipe CIPA por e-mail ou telefone.
              </p>

              <div className="grid grid-cols-2 gap-4 pb-2">
                <button
                  type="button"
                  id="identity-yes"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, isIdentified: true }));
                    setFormError(null);
                  }}
                  className={`py-4 px-4 rounded-2xl border text-center font-bold tracking-wider transition-all cursor-pointer ${
                    formData.isIdentified === true
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="block text-base">SIM</span>
                  <span className="block text-[11px] font-normal text-slate-500 mt-0.5">Quero fornecer meu contato</span>
                </button>

                <button
                  type="button"
                  id="identity-no"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, isIdentified: false, name: '', email: '', phone: '' }));
                    setFormError(null);
                  }}
                  className={`py-4 px-4 rounded-2xl border text-center font-bold tracking-wider transition-all cursor-pointer ${
                    formData.isIdentified === false
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="block text-base">NÃO</span>
                  <span className="block text-[11px] font-normal text-slate-500 mt-0.5">Manter relato 100% anônimo</span>
                </button>
              </div>

              {/* Sub-form for details if identified */}
              <AnimatePresence>
                {formData.isIdentified === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden border-t border-slate-100 pt-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Nome do Colaborador *
                      </label>
                      <input
                        type="text"
                        id="user-name-input"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome completo"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/10"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                          E-mail Corporativo ou Pessoal
                        </label>
                        <input
                          type="email"
                          id="user-email-input"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="exemplo@empresa.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                          Telefone / Ramal
                        </label>
                        <input
                          type="text"
                          id="user-phone-input"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="(99) 99999-9999"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/10"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : step === 4 ? (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-800">Qual é a Área ou Setor?</h3>
                  <p className="text-xs text-slate-400">Passo 4: Localize o setor fabril ou corporativo envolvido</p>
                </div>
              </div>

              {/* Group filter chips */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Filtrar por Grande Grupo:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sectorGroupKeys.map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setSelectedSectorGroup(grp)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        selectedSectorGroup === grp
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search / Autocomplete input */}
              <div className="relative space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Selecione o Setor Específico:
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    id="area-search-input"
                    value={formData.area || areaSearch}
                    onFocus={() => {
                      setIsAreaDropdownOpen(true);
                      if (formData.area) {
                        setAreaSearch(formData.area);
                        setFormData(prev => ({ ...prev, area: '' }));
                      }
                    }}
                    onChange={(e) => {
                      setAreaSearch(e.target.value);
                      setIsAreaDropdownOpen(true);
                    }}
                    placeholder="Digite para buscar ou selecione abaixo..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                  {formData.area ? (
                    <span className="absolute right-3.5 top-3 flex items-center gap-1.5 rounded-lg bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      <Check className="h-3 w-3 text-emerald-700" />
                      <span>Selecionado</span>
                    </span>
                  ) : null}
                </div>

                {/* Dropdown list */}
                <div className="w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white mt-1 shadow-sm divide-y divide-slate-100">
                  {filteredAreas.length > 0 ? (
                    filteredAreas.map((area, idx) => {
                      const isSelected = formData.area === area;
                      const grp = getSectorGroup(area);
                      return (
                        <button
                          key={idx}
                          type="button"
                          id={`area-item-${idx}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, area }));
                            setAreaSearch(area);
                            setIsAreaDropdownOpen(false);
                            setFormError(null);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-800 font-bold'
                              : 'hover:bg-slate-50 hover:text-emerald-700 text-slate-700'
                          }`}
                        >
                          <span>{area}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {grp}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 font-mono text-center">
                      Nenhuma área localizada no filtro atual. Limpe a busca ou mude de grupo.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : step === 5 ? (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                  <Clipboard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-800">Categoria e Grau de Urgência</h3>
                  <p className="text-xs text-slate-400">Passo 5: Defina o teor do relato e o impacto percebido</p>
                </div>
              </div>

              {/* Category picker grid */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                  1. O que deseja registrar? *
                </span>
                <div id="category-picker-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const IconComponent = cat.icon;
                    const isSelected = formData.category === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        id={`cat-btn-${cat.id.replace(/\s+/g, '-')}`}
                        onClick={() => {
                          setFormData(prev => ({ 
                            ...prev, 
                            category: cat.id,
                            urgency: cat.defaultUrgency 
                          }));
                          setFormError(null);
                        }}
                        className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${cat.color} ${
                          isSelected
                            ? 'ring-2 ring-emerald-600 scale-[1.01] shadow-md bg-white border-emerald-500'
                            : 'shadow-2xs border-slate-200 bg-white hover:border-slate-350'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 w-full">
                          <span className="font-bold text-sm text-slate-800">{cat.label}</span>
                          <IconComponent className="h-5 w-5 opacity-90 text-slate-600" />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal line-clamp-3">
                          {cat.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Urgency Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                  2. Nível de Impacto / Urgência:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, urgency: 'baixa' }))}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.urgency === 'baixa'
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">Rotina / Baixa</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1 leading-normal">
                      Sugestões de melhoria contínua, dúvidas procedimentais ou elogios.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, urgency: 'media' }))}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.urgency === 'media'
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">Atenção / Média</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1 leading-normal">
                      Desvios observados que necessitam de intervenção ou acompanhamento planejado.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, urgency: 'alta' }))}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.urgency === 'alta' || formData.urgency === 'urgente'
                        ? 'bg-red-50/80 border-red-500 ring-2 ring-red-500/20 text-red-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider text-red-700">Crítica / Alta</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1 leading-normal">
                      Risco iminente de acidente, falta de proteção essencial ou quase-acidente grave.
                    </p>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 6 ? (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                  <Send className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-800">Descrição do Relato & Evidência</h3>
                  <p className="text-xs text-slate-400">Passo 6: Conte os detalhes e anexe foto se desejar</p>
                </div>
              </div>

              {/* Description textarea */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Detalhes do Relato (Mínimo de 10 caracteres) *
                  </label>
                  <span className={`text-[11px] font-mono ${
                    formData.info.trim().length >= 10 ? 'text-emerald-700 font-bold' : 'text-slate-400'
                  }`}>
                    {formData.info.trim().length} caracteres {formData.info.trim().length >= 10 ? '✓' : '(mínimo 10)'}
                  </span>
                </div>

                <textarea
                  id="info-description-input"
                  rows={5}
                  value={formData.info}
                  onChange={(e) => setFormData(prev => ({ ...prev, info: e.target.value }))}
                  placeholder="Descreva o que ocorreu ou o que foi observado com o maior número de detalhes (local exato, máquinas envolvidas, horário, comportamento, vulnerabilidades)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 leading-relaxed"
                />
              </div>

              {/* Photo Evidence Attachment Box */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  📷 Anexar Foto / Evidência Visual (Opcional):
                </label>

                {photoData ? (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div 
                      onClick={() => setPhotoModalOpen(true)}
                      className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group shrink-0"
                    >
                      <img 
                        src={photoData} 
                        alt="Evidência anexada" 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform" 
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="h-5 w-5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{photoFileName || 'Foto da Evidência'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{photoFileSize || 'Imagem otimizada'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setPhotoModalOpen(true)}
                          className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ZoomIn className="h-3 w-3" />
                          <span>Ampliar</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="text-red-600 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="photo-upload-input"
                    />
                    <label
                      htmlFor="photo-upload-input"
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-center gap-3 cursor-pointer transition-all text-center sm:text-left"
                    >
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-emerald-700 shadow-2xs">
                        <Camera className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">
                          Clique para Tirar Foto ou Escolher Imagem
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Formatos JPG, PNG ou WebP. Compactada automaticamente para envio rápido.
                        </span>
                      </div>
                      {isCompressingPhoto && (
                        <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Otimizando imagem...</span>
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </div>

              {/* Real-time Live Summary / Preview Card */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Revisão do Relato antes do Envio:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLiveSummary(!showLiveSummary)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline font-mono"
                  >
                    {showLiveSummary ? 'Ocultar resumo' : 'Ver resumo'}
                  </button>
                </div>

                {showLiveSummary && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Categoria & Urgência:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{formData.category || 'Não definida'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          formData.urgency === 'alta' ? 'bg-red-100 text-red-800' :
                          formData.urgency === 'media' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {formData.urgency}
                        </span>
                        <button type="button" onClick={() => jumpToStep(5)} className="text-emerald-700 hover:underline">
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Área / Setor:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{formData.area || 'Não definida'}</span>
                        <button type="button" onClick={() => jumpToStep(4)} className="text-emerald-700 hover:underline">
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Data do Fato:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-800">{formData.dateObservation}</span>
                        <button type="button" onClick={() => jumpToStep(2)} className="text-emerald-700 hover:underline">
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Identificação:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-800 font-medium">
                          {formData.isIdentified ? `Identificado (${formData.name})` : 'Anônimo'}
                        </span>
                        <button type="button" onClick={() => jumpToStep(3)} className="text-emerald-700 hover:underline">
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {photoData && (
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                        <span className="text-slate-500 font-medium">Evidência:</span>
                        <span className="text-emerald-700 font-bold">1 Foto Anexada ({photoFileSize})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Buttons Controls */}
        {!showDisagreementThanks && (
          <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
            {step > 1 ? (
              <button
                 type="button"
                 id="wizard-prev-btn"
                 onClick={handlePrev}
                 disabled={isSubmitting}
                 className="flex items-center space-x-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                id="wizard-next-btn"
                onClick={handleNext}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-sm shadow-emerald-100"
              >
                <span>Continuar</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                id="wizard-submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || !isStepValid(6)}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-100"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Enviando Relato...</span>
                  </>
                ) : (
                  <>
                    <span>Concluir & Enviar à CIPA</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* High-Resolution Zoom Lightbox Modal */}
      {photoModalOpen && photoData && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPhotoModalOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPhotoModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img 
              src={photoData} 
              alt="Evidência ampliada" 
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
            <div className="p-3 text-center text-xs text-slate-600 font-mono">
              {photoFileName} · {photoFileSize}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
