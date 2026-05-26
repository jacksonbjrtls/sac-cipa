import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Calendar, UserCheck, MapPin, 
  HelpCircle, Clipboard, Send, ChevronRight, 
  ChevronLeft, ArrowRight, AlertTriangle, Lightbulb, 
  Megaphone, Heart, HelpCircle as QuestionMark, Sparkles, CheckCircle2
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { AREAS_LIST } from '../areas';
import { OperationType } from '../types';
import { use } from 'react';

interface FormWizardProps {
  onSuccess: (protocolId: string) => void;
}

export default function FormWizard({ onSuccess }: FormWizardProps) {
  // Step tracker
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Gratitude / Disagreement display overlay state
  const [showDisagreementThanks, setShowDisagreementThanks] = useState<boolean>(false);

  // Dynamic set of operating areas in real-time
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

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
    info: '',
  });

  // Autocomplete state for Area selection
  const [areaSearch, setAreaSearch] = useState<string>('');
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState<boolean>(false);

  // Filtered areas for autocomplete list
  const filteredAreas = availableAreas.filter(area => 
    area.toLowerCase().includes(areaSearch.toLowerCase())
  );

  // Auto-format date observation while typing
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // strip non-digits
    if (value.length > 8) value = value.slice(0, 8);
    
    // Auto-insert slashes
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

  // Helper to validate the active step before advancing
  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.agreedToShare === true; // Must agree to proceed
      case 2:
        // DD/MM/YYYY format check
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(19|20)\d\d$/;
        return dateRegex.test(formData.dateObservation);
      case 3:
        if (formData.isIdentified === null) return false;
        if (formData.isIdentified === true) {
          // Name and contact must be filled
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
    if (isStepValid()) {
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
      setStep(prev => prev + 1 - 2); // Avoid simple step operators so standard React rules look clean
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
      info: ''
    }));
    setStep(1);
    setFormError(null);

    // Dynamic self-discharging redirect timer after 4.5 seconds
    const timer = setTimeout(() => {
      setShowDisagreementThanks(false);
    }, 4500);

    return timer;
  };

  // Submission handler
  const handleSubmit = async () => {
    if (!isStepValid()) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Build clean payload
      const payload: any = {
        agreedToShare: formData.agreedToShare,
        dateObservation: formData.dateObservation,
        isIdentified: formData.isIdentified,
        area: formData.area,
        category: formData.category,
        info: formData.info.trim(),
        status: 'pendente',
        createdAt: serverTimestamp(),
      };

      if (formData.isIdentified) {
        payload.name = formData.name.trim();
        payload.email = formData.email.trim();
        payload.phone = formData.phone.trim();
      }

      // Add to Firestore
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

  // Visual cards for Categories
  const categories = [
    {
      id: '💡Sugestão',
      label: '💡 Sugestão',
      desc: 'Ideias de melhoria para o ambiente de trabalho, processos industriais ou rotinas administrativas coletivas.',
      icon: Lightbulb,
      color: 'border-yellow-200 hover:border-yellow-400 text-yellow-800 bg-yellow-50/50'
    },
    {
      id: '📢 Crítica/Reclamação',
      label: '📢 Crítica ou Reclamação',
      desc: 'Manifestações de descontentamento com serviços, dinâmicas de equipe ou problemas de convívio.',
      icon: Megaphone,
      color: 'border-red-200 hover:border-red-400 text-red-800 bg-red-50/50'
    },
    {
      id: '❓Dúvida',
      label: '❓ Dúvida de Segurança',
      desc: 'Questões gerais sobre o uso e distribuição de EPIs, treinamentos formais, procedimentos internos ou SIPATAMA.',
      icon: QuestionMark,
      color: 'border-sky-200 hover:border-sky-400 text-sky-805 bg-sky-50/50'
    },
    {
      id: '⚠️Relato de Condição Insegura',
      label: '⚠️ Condição Insegura',
      desc: 'Relato de risco grave, quebra de máquinas, ausência de isolamento, vazamentos, risco de incêndio ou quase-acidentes.',
      icon: AlertTriangle,
      color: 'border-amber-200 hover:border-amber-400 text-amber-800 bg-amber-50/50'
    },
    {
      id: '👏Elogio',
      label: '👏 Elogio',
      desc: 'Reconhecimento aberto de colegas, equipes, ou iniciativas individuais que ilustraram ótimas práticas de SSO.',
      icon: Heart,
      color: 'border-emerald-200 hover:border-emerald-400 text-emerald-800 bg-emerald-50/50'
    },
    {
      id: 'Assuntos Relacionados ao Meio Ambiente',
      label: '♻️ Assunto Ambiental',
      desc: 'Relações de descarte de resíduos, efluentes, sustentabilidade fabril ou outros recursos ecologicos.',
      icon: Sparkles,
      color: 'border-teal-200 hover:border-teal-400 text-teal-800 bg-teal-50/50'
    }
  ];

  return (
    <div id="registration-wizard" className="w-full font-sans">
      {/* CIPA Header Banner */}
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 sm:p-8 border border-blue-500/15 shadow-sm">
        <h1 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
          SAC CIPA - Canal de Comunicação Ativo
        </h1>
        <p className="text-blue-50 text-sm leading-relaxed max-w-2xl">
          Use este formulário para enviar dúvidas, sugestões, críticas ou apontamentos de riscos diretamente para a Mesa Diretora da CIPA. Seu relato será apreciado com total zelo.
        </p>
      </div>

      {/* Progress indicators */}
      {!showDisagreementThanks && (
        <div className="mb-8 flex items-center justify-between px-2 text-xs font-mono text-slate-400">
          <div className="flex gap-1.5 items-center">
            <span className="text-blue-600 font-bold">Passo {step} de 6</span>
            <span className="text-slate-300">|</span>
            <span className="truncate max-w-[150px] sm:max-w-[280px] font-medium text-slate-650">
              {step === 1 && 'Consentimento do Comitê'}
              {step === 2 && 'Data de Observação'}
              {step === 3 && 'Identificação do Usuário'}
              {step === 4 && 'Área e Setor'}
              {step === 5 && 'Tipo de Registro'}
              {step === 6 && 'Descrição do Relato'}
            </span>
          </div>
          <div className="flex gap-1.5 font-mono">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                  i + 1 <= step ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {formError && !showDisagreementThanks && (
        <div className="mb-6 flex gap-3 items-start rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-800 shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p>{formError}</p>
        </div>
      )}

      {/* Step Container Cards */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative min-h-[300px]">
        <AnimatePresence mode="wait">
          {showDisagreementThanks ? (
            <motion.div
              key="disagreementThanks"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-10 text-center space-y-6"
            >
              <div className="bg-blue-50 p-4 rounded-full text-blue-600 animate-bounce">
                <Heart className="h-10 w-10 fill-blue-600/10 text-blue-500" />
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
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
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
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-sans text-lg font-bold text-slate-800">Comitê de Transparência CIPA</h3>
              </div>
              
              <div className="border-l-4 border-blue-500 bg-blue-50/40 p-5 rounded-r-2xl space-y-4">
                <p className="text-[13px] sm:text-sm text-slate-700 font-bold tracking-wide leading-relaxed">
                  Aviso de Segurança e Compartilhamento:
                </p>
                <p className="text-xs sm:text-[13px] text-amber-700 font-semibold leading-relaxed">
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
                      ? 'border-blue-500 bg-blue-50/70 text-blue-800 ring-2 ring-blue-500/10'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <span className="text-lg font-bold">CONCORDA</span>
                  <span className="text-xs mt-1 opacity-80">Autorizar envio ao comitê da CIPA</span>
                </button>

                <button
                  type="button"
                  id="agree-share-no"
                  onClick={handleDisagreement}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all cursor-pointer border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-800"
                >
                  <span className="text-lg font-bold">NÃO CONCORDA</span>
                  <span className="text-xs mt-1 opacity-80">A mesa diretiva não receberá o relato</span>
                </button>
              </div>
            </motion.div>
          ) : null}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="font-sans text-lg font-bold text-slate-800">Informe a Data da Observação</h3>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Insira a data do ocorrido ou da constatação (dd/MM/yyyy)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="text"
                    id="date-observation-input"
                    value={formData.dateObservation}
                    onChange={handleDateChange}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-mono text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                  <span className="absolute right-3.5 top-3.5 text-slate-400">
                    <Calendar className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Exemplo: {new Date().toLocaleDateString('pt-BR')} (A data do registro atual é usada por padrão).
                </p>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                  <UserCheck className="h-6 w-6" />
                </div>
                <h3 className="font-sans text-lg font-bold text-slate-800">Deseja se Identificar?</h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Você pode optar por enviar seu relato anonimamente ou anexar seus dados de contato caso queira receber um feedback personalizado por e-mail ou telefone.
              </p>

              <div className="grid grid-cols-2 gap-4 pb-4">
                <button
                  type="button"
                  id="identity-yes"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, isIdentified: true }));
                    setFormError(null);
                  }}
                  className={`py-3.5 px-4 rounded-xl border text-center font-bold tracking-wider transition-all cursor-pointer ${
                    formData.isIdentified === true
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  SIM
                </button>

                <button
                  type="button"
                  id="identity-no"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, isIdentified: false, name: '', email: '', phone: '' }));
                    setFormError(null);
                  }}
                  className={`py-3.5 px-4 rounded-xl border text-center font-bold tracking-wider transition-all cursor-pointer ${
                    formData.isIdentified === false
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  NÃO
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
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-505 mb-1.5">
                        Informe o seu Nome de Colaborador
                      </label>
                      <input
                        type="text"
                        id="user-name-input"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome completo"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-805 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/10"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-505 mb-1.5">
                          Informe seu E-mail de Contato
                        </label>
                        <input
                          type="email"
                          id="user-email-input"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="exemplo@empresa.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-805 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/10"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-505 mb-1.5">
                          Informe seu Telefone de Contato
                        </label>
                        <input
                          type="text"
                          id="user-phone-input"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(99) 99999-9999"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-805 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="font-sans text-lg font-bold text-slate-800">Qual é Sua Área?</h3>
              </div>

              <div className="relative space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-505">
                  Filtre e selecione seu setor produtivo ou administrativo
                </label>
                
                {/* Search / Autocomplete input */}
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
                    placeholder="Digite no teclado para buscar..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-805 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                  {formData.area && (
                    <span className="absolute right-3.5 top-3.5 flex h-5 items-center justify-center rounded-full bg-blue-50 border border-blue-200 px-2 text-[10px] font-bold text-blue-600">
                      Selecionado
                    </span>
                  )}
                </div>

                {isAreaDropdownOpen && (
                  <div className="absolute z-10 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white mt-1 shadow-md divide-y divide-slate-100">
                    {filteredAreas.length > 0 ? (
                      filteredAreas.map((area, idx) => (
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
                          className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 hover:text-blue-600 text-slate-700 transition-colors cursor-pointer"
                        >
                          {area}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400 font-mono">
                        Nenhuma área localizada. Tente outro termo ou limpe a busca.
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-slate-400 italic">
                  * Há mais de 50 áreas operacionais catalogadas para cobrir toda a planta.
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                  <Clipboard className="h-6 w-6" />
                </div>
                <h3 className="font-sans text-lg font-bold text-slate-800">O que deseja Registrar?</h3>
              </div>

              <div id="category-picker-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const IconComponent = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      id={`cat-btn-${cat.id.replace(/\s+/g, '-')}`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, category: cat.id }));
                        setFormError(null);
                      }}
                      className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${cat.color} ${
                        formData.category === cat.id
                          ? 'ring-2 ring-blue-500 scale-[1.01] shadow-md bg-white border-blue-400'
                          : 'shadow-sm border-slate-200 bg-white'
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
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                  <Send className="h-6 w-6" />
                </div>
                <h3 className="font-sans text-lg font-bold text-slate-800">Descreva seu Relato</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Detalhes e Informações Adicionais (Mínimo de 10 caracteres)
                  </label>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-405">
                    {formData.info.trim().length} caracteres
                  </span>
                </div>

                <textarea
                  id="info-description-input"
                  rows={6}
                  value={formData.info}
                  onChange={(e) => setFormData(prev => ({ ...prev, info: e.target.value }))}
                  placeholder="Por favor, forneça o maior volume de detalhes possíveis (localizações exatas, números de máquinas envolvidas, horários, comportamento seguro ou vulnerabilidades vistas)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                />

                <div className="rounded-xl bg-blue-50/50 border border-blue-105 p-4 text-xs text-blue-800 flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Seu relatório será registrado nos canais da CIPA e passará por análise sigilosa e técnica dos membros eleitos.</span>
                </div>
              </div>
            </motion.div>
          )}
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
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-sm shadow-blue-100"
              >
                <span>Continuar</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                id="wizard-submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || !isStepValid()}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-blue-100"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>Registrar</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
