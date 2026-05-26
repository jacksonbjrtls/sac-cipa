import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, ClipboardList, Shield, ShieldAlert, 
  Trash2, Send, Check, AlertCircle, RefreshCw, 
  MessageSquare, UserPlus, Filter, FileText, Calendar, Tag, MapPin, 
  Download, BarChart2, CheckCircle2, Clock, Plus, Edit3,
  Palette, UploadCloud, RotateCcw
} from 'lucide-react';
import { 
  collection, doc, onSnapshot, setDoc, 
  updateDoc, deleteDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Registration, DbAdmin, OperationType } from '../types';
import { AREAS_LIST } from '../areas';
import CipaLogo from './CipaLogo';

interface AdminPanelProps {
  currentUserEmail: string;
  isSimulated?: boolean;
  customLogo: string | null;
  setCustomLogo: (logo: string | null) => void;
}

export default function AdminPanel({ 
  currentUserEmail, 
  isSimulated = false,
  customLogo,
  setCustomLogo
}: AdminPanelProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<'registros' | 'areas' | 'admins' | 'branding'>('registros');

  // Loading states
  const [loadingRegistrations, setLoadingRegistrations] = useState<boolean>(true);
  const [loadingAdmins, setLoadingAdmins] = useState<boolean>(true);
  const [loadingAreas, setLoadingAreas] = useState<boolean>(true);

  // Firestore lists
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [adminsList, setAdminsList] = useState<DbAdmin[]>([]);
  const [areasList, setAreasList] = useState<{ id: string, name: string }[]>([]);

  // Errors / Success Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom Confirmation Dialog state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDanger = false,
    confirmText = "Confirmar",
    cancelText = "Cancelar"
  ) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        await onConfirm();
      },
      confirmText,
      cancelText,
      isDanger
    });
  };

  // Dynamic operating areas input states
  const [newAreaName, setNewAreaName] = useState<string>('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState<string>('');
  const [savingArea, setSavingArea] = useState<boolean>(false);

  // Admin nomination states
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [addingAdmin, setAddingAdmin] = useState<boolean>(false);

  // Selected registration details
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [adminNotesText, setAdminNotesText] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'em_analise' | 'resolvido' | 'arquivado'>('todos');
  const [searchText, setSearchText] = useState<string>('');

  // Auto-connect real-time queries
  useEffect(() => {
    if (isSimulated) {
      setLoadingRegistrations(true);
      setLoadingAdmins(true);
      setLoadingAreas(true);
      setErrorMsg(null);

      // Load mock registrations or seed default ones
      const storedRegs = localStorage.getItem('cipa_mock_registrations');
      let parsedRegs: Registration[] = [];
      if (storedRegs) {
        parsedRegs = JSON.parse(storedRegs);
      } else {
        parsedRegs = [
          {
            id: 'REG-2026-001',
            agreedToShare: true,
            dateObservation: '26/05/2026',
            isIdentified: true,
            name: 'Jackson Simulado',
            email: 'jacksonbjr@gmail.com',
            phone: '(11) 98765-4321',
            area: 'Linha de Montagem A',
            category: 'Risco Mecânico (Máquinas/Equipamentos)',
            info: 'Falta de proteção de segurança na polia da esteira transportadora secundária. Há risco iminente de aprisionamento de membros.',
            status: 'pendente',
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400, nanoseconds: 0 } as any
          },
          {
            id: 'REG-2026-002',
            agreedToShare: true,
            dateObservation: '25/05/2026',
            isIdentified: false,
            area: 'Refeitório Central',
            category: 'Ergonomia ou Infraestrutura',
            info: 'Vazamento constante na tubulação do ar condicionado central gerando poça d\'água constante em frente à bancada de talheres. Risco grave de quedas por escorregamento.',
            status: 'em_analise',
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 172800, nanoseconds: 0 } as any,
            adminNotes: 'Solicitado reparo imediato para equipe de Manutenção Predial através do chamado MAN-482937.',
            respondedBy: 'jacksonbjr@gmail.com',
            respondedAt: { seconds: Math.floor(Date.now() / 1000) - 120000, nanoseconds: 0 } as any
          },
          {
            id: 'REG-2026-003',
            agreedToShare: false,
            dateObservation: '20/05/2026',
            isIdentified: true,
            name: 'José da Silva - Líder Produção',
            area: 'Almoxarifado',
            category: 'EPI desatualizado ou em falta',
            info: 'Paleteira elétrica operando com ruído excessivo acima do limite regulamentar. Operadores sem o protetor auricular concha adequado para este nível de ruído.',
            status: 'resolvido',
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 518400, nanoseconds: 0 } as any,
            adminNotes: 'Equipamento lubrificado e regulado pela equipe técnica em 22/05. Entregue kits novos de protetores de inserção de silicone aos operadores do almoxarifado.',
            respondedBy: 'jacksonbjr@gmail.com',
            respondedAt: { seconds: Math.floor(Date.now() / 1000) - 345600, nanoseconds: 0 } as any
          }
        ];
        localStorage.setItem('cipa_mock_registrations', JSON.stringify(parsedRegs));
      }
      setRegistrations(parsedRegs);
      setLoadingRegistrations(false);

      // Load mock admins or seed default
      const storedAdmins = localStorage.getItem('cipa_mock_admins');
      let parsedAdmins: DbAdmin[] = [];
      if (storedAdmins) {
        parsedAdmins = JSON.parse(storedAdmins);
      } else {
        parsedAdmins = [
          {
            id: 'ana.silva@empresa.com.br',
            email: 'ana.silva@empresa.com.br',
            addedBy: 'jacksonbjr@gmail.com',
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 2592000, nanoseconds: 0 } as any
          },
          {
            id: 'marcos.souza@empresa.com.br',
            email: 'marcos.souza@empresa.com.br',
            addedBy: 'jacksonbjr@gmail.com',
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 1296000, nanoseconds: 0 } as any
          }
        ];
        localStorage.setItem('cipa_mock_admins', JSON.stringify(parsedAdmins));
      }
      setAdminsList(parsedAdmins);
      setLoadingAdmins(false);

      // Load mock areas or seed default
      const storedAreas = localStorage.getItem('cipa_mock_areas');
      let parsedAreas: { id: string, name: string }[] = [];
      if (storedAreas) {
        parsedAreas = JSON.parse(storedAreas);
      } else {
        parsedAreas = AREAS_LIST.map((name, idx) => ({
          id: `area_${idx + 1}`,
          name
        }));
        localStorage.setItem('cipa_mock_areas', JSON.stringify(parsedAreas));
      }
      setAreasList(parsedAreas);
      setLoadingAreas(false);

      return;
    }

    setLoadingRegistrations(true);
    setErrorMsg(null);

    // Setup active listeners for registrations (newest first)
    const qRegs = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));
    const unsubscribeRegs = onSnapshot(qRegs, (snapshot) => {
      const items: Registration[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Registration);
      });
      setRegistrations(items);
      setLoadingRegistrations(false);
    }, (err) => {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'registrations');
      } catch (finalError: any) {
        setErrorMsg(`Erro ao sincronizar relatos: ${finalError.message}`);
      }
      setLoadingRegistrations(false);
    });

    // Setup active listeners for CIPA authorized administrators
    setLoadingAdmins(true);
    const unsubscribeAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const staff: DbAdmin[] = [];
      snapshot.forEach((doc) => {
        const idLower = doc.id.toLowerCase().trim();
        if (idLower !== 'jacksonbjr@gmail.com') {
          staff.push({ id: doc.id, ...doc.data() } as DbAdmin);
        }
      });
      setAdminsList(staff);
      setLoadingAdmins(false);
    }, (err) => {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'admins');
      } catch (finalError: any) {
        setErrorMsg(`Erro ao sincronizar administradores: ${finalError.message}`);
      }
      setLoadingAdmins(false);
    });

    // Setup active listeners for Dynamic Operating Areas with automatic seeding if empty
    setLoadingAreas(true);
    let isSeeding = false;
    const unsubscribeAreas = onSnapshot(collection(db, 'areas'), async (snapshot) => {
      if (snapshot.empty && !isSeeding) {
        isSeeding = true;
        console.log("Banco de setores CIPA vazio na nuvem. Sincronizando setores default automaticamente para o administrador...");
        try {
          const batchPromises = AREAS_LIST.map(async (name) => {
            const areaId = doc(collection(db, 'areas')).id;
            await setDoc(doc(db, 'areas', areaId), {
              name,
              createdAt: serverTimestamp()
            });
          });
          await Promise.all(batchPromises);
          console.log("Seeding automático de setores concluído com sucesso!");
        } catch (seedErr) {
          console.error("Falha no seeding de setores padrão:", seedErr);
        } finally {
          isSeeding = false;
        }
        return;
      }

      const list: { id: string, name: string }[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, name: doc.data().name || '' });
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setAreasList(list);
      setLoadingAreas(false);
    }, (err) => {
      console.error(err);
      setLoadingAreas(false);
    });

    return () => {
      unsubscribeRegs();
      unsubscribeAdmins();
      unsubscribeAreas();
    };
  }, []);

  // Update notes or status trigger
  const handleUpdateRegistration = async (status: Registration['status'], textNotes: string) => {
    if (!selectedReg) return;
    setUpdatingStatus(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updatePayload: any = {
        status,
        adminNotes: textNotes.trim(),
        respondedBy: currentUserEmail,
        respondedAt: serverTimestamp()
      };

      if (isSimulated) {
        const stored = localStorage.getItem('cipa_mock_registrations');
        let list: Registration[] = stored ? JSON.parse(stored) : [];
        const simTime = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any;
        list = list.map(item => item.id === selectedReg.id ? { ...item, ...updatePayload, respondedAt: simTime } : item);
        localStorage.setItem('cipa_mock_registrations', JSON.stringify(list));
        setRegistrations(list);
        setSelectedReg(prev => prev ? { ...prev, ...updatePayload, respondedAt: simTime } : null);
        setSuccessMsg("Relato (Simulado) atualizado com sucesso localmente!");
      } else {
        const regRef = doc(db, 'registrations', selectedReg.id!);
        await updateDoc(regRef, updatePayload);
        setSelectedReg(prev => prev ? { ...prev, ...updatePayload } : null);
        setSuccessMsg("Relato atualizado com sucesso e notas registradas!");
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `registrations/${selectedReg.id}`);
      } catch (finalError: any) {
        setErrorMsg(`Erro ao atualizar relato: ${finalError.message}`);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete registration trigger
  const handleDeleteRegistration = (id: string) => {
    requestConfirm(
      "Excluir Relato",
      "Tem certeza absoluta de que deseja excluir permanentemente este registro da base de dados? Esta operação é irreversível.",
      async () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
          if (isSimulated) {
            const stored = localStorage.getItem('cipa_mock_registrations');
            let list: Registration[] = stored ? JSON.parse(stored) : [];
            list = list.filter(item => item.id !== id);
            localStorage.setItem('cipa_mock_registrations', JSON.stringify(list));
            setRegistrations(list);
            setSelectedReg(null);
            setSuccessMsg("Relato (Simulado) excluído permanentemente localmente.");
          } else {
            await deleteDoc(doc(db, 'registrations', id));
            setSelectedReg(null);
            setSuccessMsg("Relato excluído permanentemente com sucesso.");
          }
          setTimeout(() => setSuccessMsg(null), 3500);
        } catch (err) {
          console.error(err);
          try {
            handleFirestoreError(err, OperationType.DELETE, `registrations/${id}`);
          } catch (finalError: any) {
            setErrorMsg(`Erro ao excluir registro: ${finalError.message}`);
          }
        }
      },
      true,
      "Excluir",
      "Cancelar"
    );
  };

  // Add new admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToNominate = newAdminEmail.trim().toLowerCase();
    
    // basic validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToNominate)) {
      setErrorMsg("Por favor, insira um endereço de e-mail de administrador válido.");
      return;
    }

    setAddingAdmin(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const newAdminObj = {
        email: emailToNominate,
        addedBy: currentUserEmail,
        createdAt: serverTimestamp()
      };

      if (isSimulated) {
        const stored = localStorage.getItem('cipa_mock_admins');
        let list: DbAdmin[] = stored ? JSON.parse(stored) : [];
        if (list.some(adm => adm.email === emailToNominate)) {
          throw new Error("Este administrador simulado já está cadastrado.");
        }
        const createdAdmin = { ...newAdminObj, id: emailToNominate, createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any };
        list.push(createdAdmin);
        localStorage.setItem('cipa_mock_admins', JSON.stringify(list));
        setAdminsList(list.filter(adm => adm.id !== 'jacksonbjr@gmail.com'));
        setNewAdminEmail('');
        setSuccessMsg(`[Simulado] O endereço ${emailToNominate} foi promovido a Administrador.`);
      } else {
        // Set email address as doc ID in 'admins' collection
        await setDoc(doc(db, 'admins', emailToNominate), newAdminObj);
        setNewAdminEmail('');
        setSuccessMsg(`O endereço ${emailToNominate} foi promovido/adicionado como Administrador.`);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      if (isSimulated) {
        setErrorMsg(err.message || "Erro ao adicionar administrador simulado.");
      } else {
        try {
          handleFirestoreError(err, OperationType.CREATE, `admins/${emailToNominate}`);
        } catch (finalError: any) {
          setErrorMsg(`Provável falta de privilégios ou conexão. Detalhes: ${finalError.message}`);
        }
      }
    } finally {
      setAddingAdmin(false);
    }
  };

  // Delete nominated admin
  const handleDeleteAdmin = (email: string) => {
    if (email === 'jacksonbjr@gmail.com') {
      setErrorMsg("Acesso Negado: O e-mail Jacksonbjr@gmail.com é a conta Master e nunca poderá ser desmembrado ou excluído.");
      return;
    }

    if (email === currentUserEmail.toLowerCase()) {
      setErrorMsg("Operação bloqueada: Você não pode remover a si próprio como administrador para evitar lockouts.");
      return;
    }

    requestConfirm(
      "Revogar Administrador",
      `Deseja revogar os privilégios de administrador do email [ ${email} ]?`,
      async () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
          if (isSimulated) {
            const stored = localStorage.getItem('cipa_mock_admins');
            let list: DbAdmin[] = stored ? JSON.parse(stored) : [];
            list = list.filter(adm => adm.email !== email);
            localStorage.setItem('cipa_mock_admins', JSON.stringify(list));
            setAdminsList(list.filter(adm => adm.id !== 'jacksonbjr@gmail.com'));
            setSuccessMsg(`[Simulado] Privilégios de administrador revogados para ${email}.`);
          } else {
            await deleteDoc(doc(db, 'admins', email));
            setSuccessMsg(`Privilégios de administrador revogados para ${email}.`);
          }
          setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err) {
          console.error(err);
          if (isSimulated) {
            setErrorMsg("Erro ao revogar administrador simulado.");
          } else {
            try {
              handleFirestoreError(err, OperationType.DELETE, `admins/${email}`);
            } catch (finalError: any) {
              setErrorMsg(`Revogação recusada pelo banco: ${finalError.message}`);
            }
          }
        }
      },
      true,
      "Revogar",
      "Cancelar"
    );
  };

  // Add Dynamic Area
  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAreaName.trim();
    if (!name) return;

    if (areasList.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      setErrorMsg(`O setor "${name}" já está cadastrado.`);
      return;
    }

    setSavingArea(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSimulated) {
        const stored = localStorage.getItem('cipa_mock_areas');
        let list = stored ? JSON.parse(stored) : [];
        const newArea = { id: `area_${Date.now()}`, name };
        list.push(newArea);
        localStorage.setItem('cipa_mock_areas', JSON.stringify(list));
        setAreasList(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
        setNewAreaName('');
        setSuccessMsg(`[Simulado] Setor "${name}" cadastrado localmente!`);
      } else {
        const areaId = doc(collection(db, 'areas')).id;
        await setDoc(doc(db, 'areas', areaId), {
          name,
          createdAt: serverTimestamp()
        });
        setNewAreaName('');
        setSuccessMsg(`Setor "${name}" cadastrado com sucesso!`);
      }
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao cadastrar setor: ${err.message}`);
    } finally {
      setSavingArea(false);
    }
  };

  // Update Dynamic Area
  const handleUpdateArea = async (id: string) => {
    const name = editingAreaName.trim();
    if (!name) return;

    if (areasList.some(a => a.id !== id && a.name.toLowerCase() === name.toLowerCase())) {
      setErrorMsg("Este nome de setor já existe em outro cadastro.");
      return;
    }

    setSavingArea(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSimulated) {
        const stored = localStorage.getItem('cipa_mock_areas');
        let list = stored ? JSON.parse(stored) : [];
        list = list.map((a: any) => a.id === id ? { ...a, name } : a);
        localStorage.setItem('cipa_mock_areas', JSON.stringify(list));
        setAreasList(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
        setEditingAreaId(null);
        setEditingAreaName('');
        setSuccessMsg("[Simulado] Setor atualizado localmente!");
      } else {
        await updateDoc(doc(db, 'areas', id), {
          name
        });
        setEditingAreaId(null);
        setEditingAreaName('');
        setSuccessMsg("Setor atualizado com sucesso!");
      }
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao atualizar setor: ${err.message}`);
    } finally {
      setSavingArea(false);
    }
  };

  // Delete Dynamic Area
  const handleDeleteArea = (id: string, name: string) => {
    requestConfirm(
      "Remover Setor",
      `Tem certeza de que deseja remover permanentemente o setor "${name}"? Novos relatos não poderão selecioná-lo.`,
      async () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
          if (isSimulated) {
            const stored = localStorage.getItem('cipa_mock_areas');
            let list = stored ? JSON.parse(stored) : [];
            list = list.filter((a: any) => a.id !== id);
            localStorage.setItem('cipa_mock_areas', JSON.stringify(list));
            setAreasList(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            setSuccessMsg(`[Simulado] Setor "${name}" removido localmente.`);
          } else {
            await deleteDoc(doc(db, 'areas', id));
            setSuccessMsg(`Setor "${name}" removido com sucesso.`);
          }
          setTimeout(() => setSuccessMsg(null), 3500);
        } catch (err: any) {
          console.error(err);
          setErrorMsg(`Erro ao remover setor: ${err.message}`);
        }
      },
      true,
      "Remover",
      "Cancelar"
    );
  };

  // Seed / Import preset areas
  const handleImportPresetAreas = () => {
    requestConfirm(
      "Importar Setores Padrão",
      `Deseja carregar a lista padrão de ${AREAS_LIST.length} setores industriais e administrativos históricos?`,
      async () => {
        setSavingArea(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
          let imported = 0;
          if (isSimulated) {
            const stored = localStorage.getItem('cipa_mock_areas');
            let list = stored ? JSON.parse(stored) : [];
            for (const name of AREAS_LIST) {
              if (!list.some((a: any) => a.name.toLowerCase() === name.toLowerCase())) {
                list.push({ id: `area_${Date.now()}_${Math.random()}`, name });
                imported++;
              }
            }
            localStorage.setItem('cipa_mock_areas', JSON.stringify(list));
            setAreasList(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            setSuccessMsg(`[Simulado] Importação concluída! ${imported} setores novos inseridos localmente.`);
          } else {
            for (const name of AREAS_LIST) {
              if (!areasList.some(a => a.name.toLowerCase() === name.toLowerCase())) {
                const areaId = doc(collection(db, 'areas')).id;
                await setDoc(doc(db, 'areas', areaId), {
                  name,
                  createdAt: serverTimestamp()
                });
                imported++;
              }
            }
            setSuccessMsg(`Importação concluída! ${imported} setores novos foram inseridos no banco.`);
          }
          setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err: any) {
          console.error(err);
          setErrorMsg(`Erro ao importar presets: ${err.message}`);
        } finally {
          setSavingArea(false);
        }
      },
      false,
      "Importar",
      "Cancelar"
    );
  };

  // Logo handlers
  const compressLogoImage = (file: File, maxWidth: number = 400, maxHeight: number = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Não foi possível carregar o contexto de desenho do canvas."));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as PNG for excellent logo quality/transparency support.
          // 400x400 PNG is typically around 15KB - 40KB, which is extremely safe for Firestore's 1MB limit.
          try {
            const base64 = canvas.toDataURL('image/png');
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("Erro ao carregar a imagem no navegador para compressão."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo de imagem do disco."));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We can accept up to 8MB archives now since we compress them client-side anyway!
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("O arquivo é grande demais. O tamanho máximo permitido para o arquivo original é de 8MB.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Compress the image before storing it
      const compressedBase64 = await compressLogoImage(file);

      if (isSimulated) {
        localStorage.setItem('cipa_custom_logo', compressedBase64);
        setCustomLogo(compressedBase64);
        setSuccessMsg("Identidade visual personalizada aplicada localmente com sucesso! (Simulado)");
      } else {
        await setDoc(doc(db, 'settings', 'logo'), {
          logoBase64: compressedBase64,
          updatedAt: serverTimestamp(),
          updatedBy: currentUserEmail
        });
        setCustomLogo(compressedBase64);
        setSuccessMsg("Logotipo oficial otimizado, atualizado no banco e sincronizado dinamicamente!");
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Erro ao salvar logotipo:", err);
      setErrorMsg(`Não foi possível salvar o logotipo: ${err.message || err}`);
    }
  };

  const handleResetLogo = () => {
    requestConfirm(
      "Redefinir Logotipo",
      "Deseja remover o logotipo atual e voltar a utilizar o logotipo padrão da CIPA?",
      async () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
          if (isSimulated) {
            localStorage.removeItem('cipa_custom_logo');
            setCustomLogo(null);
            setSuccessMsg("Logotipo redefinido para o padrão local.");
          } else {
            await setDoc(doc(db, 'settings', 'logo'), {
              logoBase64: null,
              updatedAt: serverTimestamp(),
              updatedBy: currentUserEmail
            });
            setCustomLogo(null);
            setSuccessMsg("Logotipo redefinido para o padrão no banco.");
          }
          setTimeout(() => setSuccessMsg(null), 3500);
        } catch (err: any) {
          console.error("Erro ao redefinir logotipo:", err);
          setErrorMsg(`Erro ao redefinir: ${err.message}`);
        }
      },
      false,
      "Redefinir",
      "Cancelar"
    );
  };

  // Filter conditions
  const filteredRegs = registrations.filter(reg => {
    // 1. Status Filter
    if (statusFilter !== 'todos' && reg.status !== statusFilter) return false;

    // 2. Keyword query Search (Matches area, info details, name, or id)
    if (searchText.trim()) {
      const queryStr = searchText.toLowerCase();
      const matchId = reg.id?.toLowerCase().includes(queryStr);
      const matchArea = reg.area.toLowerCase().includes(queryStr);
      const matchCategory = reg.category.toLowerCase().includes(queryStr);
      const matchInfo = reg.info.toLowerCase().includes(queryStr);
      const matchName = reg.name?.toLowerCase().includes(queryStr) || false;
      return matchId || matchArea || matchCategory || matchInfo || matchName;
    }

    return true;
  });

  // Calculate stats
  const totalCount = registrations.length;
  const pendingCount = registrations.filter(r => r.status === 'pendente').length;
  const analysisCount = registrations.filter(r => r.status === 'em_analise').length;
  const resolvedCount = registrations.filter(r => r.status === 'resolvido').length;

  const statusTags = (status: Registration['status']) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-50 text-yellow-850 border border-yellow-200 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full';
      case 'em_analise': return 'bg-blue-50 text-blue-750 border border-blue-200 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full';
      case 'resolvido': return 'bg-emerald-50 text-emerald-850 border border-emerald-200 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full';
      case 'arquivado': return 'bg-slate-100 text-slate-655 border border-slate-200 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full';
    }
  };

  return (
    <div id="admin-panel" className="w-full space-y-6 font-sans">
      {/* Upper info row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-emerald-700" />
            <span>Escritório Digital CIPA</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Logado como: <span className="text-emerald-700 font-extrabold font-mono">{currentUserEmail}</span>
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-slate-100/80 justify-evenly items-center p-1 rounded-2xl w-full sm:w-auto border border-slate-205 flex-wrap gap-1 sm:gap-0">
          <button
            onClick={() => { setActiveTab('registros'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3.5 sm:px-4.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'registros'
                ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Relatos ({registrations.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('areas'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3.5 sm:px-4.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'areas'
                ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Setores / Áreas ({areasList.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('admins'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3.5 sm:px-4.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'admins'
                ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-205/50'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Gestão Admins ({adminsList.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('branding'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3.5 sm:px-4.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'branding'
                ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-205/50'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Visual & Logo</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex gap-3 items-start rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-850 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex gap-3 items-start rounded-xl border border-emerald-250 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-850 shadow-sm">
          <Check className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Main panel displays */}
      <AnimatePresence mode="wait">
        {activeTab === 'registros' && (
          <motion.div
            key="feedbacksTab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Core Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-bold font-mono uppercase text-slate-400">TOTAL RECEBIDO</p>
                <p className="text-2xl font-extrabold text-slate-850">{totalCount}</p>
              </div>
              <div className="bg-white p-4.5 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-bold font-mono uppercase text-yellow-600">PENDENTES</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-extrabold text-yellow-600">{pendingCount}</span>
                  <span className="text-slate-400 text-xs font-semibold">/ {totalCount > 0 ? Math.round((pendingCount/totalCount)*100) : 0}%</span>
                </div>
              </div>
              <div className="bg-white p-4.5 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-bold font-mono uppercase text-blue-600">EM INVESTIGAÇÃO</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-extrabold text-blue-600">{analysisCount}</span>
                  <span className="text-slate-400 text-xs font-semibold">/ {totalCount > 0 ? Math.round((analysisCount/totalCount)*100) : 0}%</span>
                </div>
              </div>
              <div className="bg-white p-4.5 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-bold font-mono uppercase text-emerald-600">CONCLUÍDO / RESOLVIDO</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-extrabold text-emerald-600">{resolvedCount}</span>
                  <span className="text-slate-400 text-xs font-semibold">/ {totalCount > 0 ? Math.round((resolvedCount/totalCount)*100) : 0}%</span>
                </div>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start">
                <span className="text-xs text-slate-450 font-bold flex items-center gap-1 mr-1">
                  <Filter className="h-4 w-4 text-blue-600" /> Filtrar por:
                </span>
                
                {/* Status Toggle tags */}
                {['todos', 'pendente', 'em_analise', 'resolvido', 'arquivado'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st as any)}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold cursor-pointer transition-all border ${
                      statusFilter === st
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                        : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200'
                    }`}
                  >
                    {st === 'todos' && 'Todos relatos'}
                    {st === 'pendente' && '📋 Pendentes'}
                    {st === 'em_analise' && '⚙️ Em Análise'}
                    {st === 'resolvido' && '✅ Resolvidos'}
                    {st === 'arquivado' && '📦 Arquivados'}
                  </button>
                ))}
              </div>

              {/* In-app Text Search */}
              <div className="w-full lg:w-auto">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Pesquisar relato por termo..."
                  className="bg-slate-50 border border-slate-200 text-xs px-4 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 w-full lg:min-w-[240px]"
                />
              </div>
            </div>

            {/* List and Grid view of submissions */}
            {loadingRegistrations ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4 border border-slate-200 rounded-3xl bg-white shadow-sm">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Carregando relatos registrados...</span>
              </div>
            ) : filteredRegs.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Reports Master list */}
                <div className="lg:col-span-1 space-y-3.5 max-h-[650px] overflow-y-auto pr-2">
                  {filteredRegs.map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => {
                        setSelectedReg(reg);
                        setAdminNotesText(reg.adminNotes || '');
                      }}
                      className={`w-full p-4.5 rounded-2xl border transition-all cursor-pointer text-left block space-y-3 ${
                        selectedReg?.id === reg.id
                          ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">#CIPA-{reg.id?.substring(0, 8)}...</span>
                        <span className={statusTags(reg.status)}>
                          {reg.status === 'pendente' && '📋 Pendente'}
                          {reg.status === 'em_analise' && '⚙️ Em Análise'}
                          {reg.status === 'resolvido' && '✅ Resolvido'}
                          {reg.status === 'arquivado' && '📦 Arquivado'}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{reg.area}</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">{reg.category}</p>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {reg.info}
                      </p>

                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-[9px] font-mono font-medium text-slate-400">
                        <span>DATA: {reg.dateObservation}</span>
                        <span>{reg.isIdentified ? 'Identificado' : 'Anônimo'}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Details / Action Workspace view */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative self-start">
                  {selectedReg ? (
                    <div className="space-y-6">
                      
                      {/* Workheader */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-400 font-bold uppercase">ACOMPANHAMENTO DOS MEMBROS</span>
                            <span className="font-mono text-sm font-extrabold text-blue-605">#CIPA-{selectedReg.id}</span>
                          </div>
                          <p className="text-[10px] text-slate-405 mt-1 font-semibold">
                            Cadastrado em: {selectedReg.createdAt?.seconds ? new Date(selectedReg.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Agora'}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteRegistration(selectedReg.id!)}
                            id="delete-record-btn"
                            className="bg-red-50 hover:bg-red-105 border border-red-200 text-red-655 p-2 rounded-xl transition-all cursor-pointer"
                            title="Deletar este registro permanentemente"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info grid detail cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-600" /> Setor Declarado
                          </p>
                          <p className="text-xs font-bold text-slate-700 mt-1">{selectedReg.area}</p>
                        </div>
                        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Tag className="h-3 w-3 text-blue-600" /> Categoria
                          </p>
                          <p className="text-xs font-bold text-slate-700 mt-1">{selectedReg.category}</p>
                        </div>
                        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-blue-600" /> Data Fato
                          </p>
                          <p className="text-xs font-bold text-slate-700 mt-1">{selectedReg.dateObservation}</p>
                        </div>
                      </div>

                      {/* Original description */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-450 uppercase tracking-widest block flex items-center gap-1 select-none">
                          <FileText className="h-3.5 w-3.5 text-blue-600" /> Relato do Colaborador:
                        </label>
                        <div className="bg-slate-50 p-4 border border-slate-205 rounded-xl leading-relaxed text-sm text-slate-700 font-mono whitespace-pre-wrap max-h-[190px] overflow-y-auto">
                          {selectedReg.info}
                        </div>
                      </div>

                      {/* Contact metadata */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <p className="font-bold text-slate-550">Identificação e Contato:</p>
                        {selectedReg.isIdentified ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700 font-mono text-[11px] pt-1 border-t border-slate-200/50">
                            <div><span className="text-slate-400 font-bold font-sans">NOME:</span> {selectedReg.name}</div>
                            <div><span className="text-slate-400 font-bold font-sans">EMAIL:</span> {selectedReg.email || 'Não informado'}</div>
                            <div><span className="text-slate-400 font-bold font-sans">TELEFONE:</span> {selectedReg.phone || 'Não informado'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium italic">Este relato foi enviado de forma estritamente anônima e confidencial.</span>
                        )}
                      </div>

                      {/* Admin update workspace form */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase block select-none">Mudar Status do Andamento</label>
                            <p className="text-[10px] text-slate-400 leading-normal">O autor poderá consultar esta resposta em tempo real.</p>
                          </div>
                          
                          {/* Status buttons */}
                          <div id="status-selection-box" className="flex flex-wrap gap-1.5">
                            {(['pendente', 'em_analise', 'resolvido', 'arquivado'] as const).map(st => (
                              <button
                                key={st}
                                onClick={() => handleUpdateRegistration(st, adminNotesText)}
                                disabled={updatingStatus}
                                className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider font-extrabold rounded-xl border cursor-pointer transition-all ${
                                  selectedReg.status === st
                                    ? 'bg-blue-600 text-white font-extrabold border-blue-600 shadow-sm shadow-blue-100'
                                    : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200'
                                }`}
                              >
                                {st === 'pendente' && '📋 Pendente'}
                                {st === 'em_analise' && '⚙️ Em Análise'}
                                {st === 'resolvido' && '✅ Resolvido'}
                                {st === 'arquivado' && '📦 Arquivado'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Direct feedback notes textarea */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block select-none">Parecer Técnico / Notas de Investigação da CIPA:</label>
                          <textarea
                            rows={4}
                            value={adminNotesText}
                            onChange={(e) => setAdminNotesText(e.target.value)}
                            placeholder="Descreva as soluções sugeridas, o andamento das reuniões, vistorias locais de SST ou a resolução..."
                            className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10"
                          />
                        </div>

                        {/* Save notes button */}
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleUpdateRegistration(selectedReg.status, adminNotesText)}
                            disabled={updatingStatus}
                            id="save-notes-btn"
                            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-sm shadow-blue-100"
                          >
                            <Send className="h-3 w-3" />
                            <span>Salvar Parecer da CIPA</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 h-[320px]">
                      <ClipboardList className="h-10 w-10 text-slate-300 mb-2.5" />
                      <p className="text-sm font-bold text-slate-600">Nenhum relato selecionado</p>
                      <p className="text-xs text-slate-450 mt-1 max-w-xs leading-normal">
                        Clique em qualquer relato na lista lateral à esquerda para visualizar sua descrição completa, contatos e registrar o parecer oficial.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 border border-slate-200 rounded-3xl bg-white shadow-sm">
                <AlertCircle className="h-8 w-8 text-slate-350 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">Nenhum relato correspondente localizado</p>
                <p className="text-xs text-slate-400 mt-1">Experimente remover os termos de busca ou mudar a categoria do filtro.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Dynamic Areas Management Tab */}
        {activeTab === 'areas' && (
          <motion.div
            key="areasTab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column: Manage and Add Area */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-blue-600">
                <MapPin className="h-5 w-5" />
                <h3 className="font-sans font-bold text-slate-800 text-base">Cadastrar Novo Setor</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Adicione novos setores, filiais ou áreas operacionais que ficarão disponíveis para escolha no menu drop-down do formulário de relatos.
              </p>

              <form onSubmit={handleAddArea} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 block select-none">Nome do Setor / Área</label>
                  <input
                    type="text"
                    id="new-area-name-input"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="Ex: Almoxarifado Central"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  id="add-area-submit-btn"
                  disabled={savingArea || !newAreaName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-105"
                >
                  {savingArea ? 'Gravando...' : 'Cadastrar Área / Setor'}
                </button>
              </form>

              {/* Bootstrap presets helper if empty or to ease starting */}
              <div className="pt-4 border-t border-slate-100 space-y-3.5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Carga Rápida de Presets</h4>
                  <p className="text-[10px] text-slate-400">Insira rapidamente a listagem padrão de setores industriais da CIPA no banco.</p>
                </div>
                <button
                  type="button"
                  id="bootstrap-presets-btn"
                  onClick={handleImportPresetAreas}
                  disabled={savingArea}
                  className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-blue-300 hover:text-blue-700 bg-slate-50/50 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Carregar Setores Padrão</span>
                </button>
              </div>
            </div>

            {/* Right Column: List of Operating Areas */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2">
                <div>
                  <h3 className="font-sans font-bold text-slate-800 text-base">Setores Ativos no Sistema</h3>
                  <p className="text-slate-400 text-xs font-mono font-medium mt-0.5">Disponibilizados ao usuário final</p>
                </div>
                <span className="text-xs bg-slate-100 font-bold py-1 px-3 rounded-full text-slate-500 font-mono">
                  {areasList.length} cadastrados
                </span>
              </div>

              {loadingAreas ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Carregando setores cadastrados...</span>
                </div>
              ) : areasList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Nenhum setor cadastrado na base</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Use o formulário à esquerda ou clique em "Carregar Setores Padrão" para inicializar.</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto pr-1 border border-slate-100 rounded-2xl select-none">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="py-3 px-4">Nome do Setor / Área</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {areasList.map((area) => (
                        <tr key={area.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-slate-700">
                            {editingAreaId === area.id ? (
                              <div className="flex items-center gap-1.5 max-w-sm">
                                <input
                                  type="text"
                                  value={editingAreaName}
                                  onChange={(e) => setEditingAreaName(e.target.value)}
                                  className="bg-white border border-blue-500 text-xs px-2.5 py-1.5 rounded-lg text-slate-800 focus:outline-none w-full font-bold"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateArea(area.id)}
                                  disabled={savingArea || !editingAreaName.trim()}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Confirmar alterações"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingAreaId(null); setEditingAreaName(''); }}
                                  className="bg-slate-250 hover:bg-slate-300 text-slate-705 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Cancelar"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="font-semibold text-slate-705 text-sm">{area.name}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {editingAreaId !== area.id && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingAreaId(area.id);
                                    setEditingAreaName(area.name);
                                  }}
                                  id={`edit-area-btn-${area.id}`}
                                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                                  title="Editar nome"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteArea(area.id, area.name)}
                                  id={`delete-area-btn-${area.id}`}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100"
                                  title="Excluir setor permanentemente"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Administration Management tab */}
        {activeTab === 'admins' && (
          <motion.div
            key="adminsTab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            
            {/* Inline nomination form */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative self-start space-y-6">
              <div className="flex items-center gap-2 text-blue-600">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-sans font-bold text-slate-800 text-base">Promover Administrador</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Insira o e-mail Google da pessoa (membro associado, eleito ou diretoria) para delegar privilégios integrais de administração do aplicativo Sistema de Atendimento ao Colaborador.
              </p>

              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-450 block select-none">E-mail para Nova Indicação</label>
                  <input
                    type="email"
                    id="new-admin-email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  id="add-admin-submit-btn"
                  disabled={addingAdmin || !newAdminEmail.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-105"
                >
                  {addingAdmin ? 'Promovendo...' : 'Conceder Acesso Administrativo'}
                </button>
              </form>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-800 leading-relaxed flex gap-2 font-medium">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                <span>Membros indicados terão plenos poderes para responder relatos e nomear mais novos gestores de forma independente. Use com prudência.</span>
              </div>
            </div>

            {/* Administrators list table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-sans font-bold text-slate-800 text-base">Administradores CIPA Ativos</h3>

              {loadingAdmins ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
                  <span className="text-[11px] text-slate-400 font-mono">Listando administradores...</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="py-3 px-4">E-mail Autorizado</th>
                        <th className="py-3 px-4">Delegado por</th>
                        <th className="py-3 px-4">Promovido em</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono font-medium">
                      {adminsList.map((adm) => (
                        <tr key={adm.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 text-slate-700">{adm.email}</td>
                          <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">{adm.addedBy}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {adm.createdAt?.seconds ? new Date(adm.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'No cadastro'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteAdmin(adm.email)}
                              id={`revoke-admin-btn-${adm.id}`}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-105"
                              title="Revogar credenciais de administrador"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {activeTab === 'branding' && (
          <motion.div
            key="brandingTab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-emerald-700" />
                  <span>Branding & Identidade Visual</span>
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Gerencie a identidade visual do Sistema de Atendimento ao Colaborador. Faça upload do logotipo oficial da sua empresa ou comissão para customizar a interface para desktop, celulares e a barra do navegador.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Preview and Description card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 flex flex-col items-center justify-center space-y-4">
                  <span className="text-xs font-bold text-slate-500 self-start uppercase tracking-wider">Visualização em Tempo Real</span>
                  
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md flex flex-col items-center justify-center min-w-[200px] min-h-[200px]">
                    <CipaLogo customLogo={customLogo} size={110} showText={true} />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed text-center max-w-[280px]">
                    {customLogo 
                      ? "O logotipo personalizado está ativo. Ele foi processado e otimizado para o navegador."
                      : "Carregado o logotipo padrão CIPA com estética verde de segurança padrão regulamentada pela NR-5."
                    }
                  </p>
                </div>

                {/* Upload and settings form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                      Carregar Logotipo Oficial
                    </label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-white hover:border-emerald-500/50 transition-all group relative cursor-pointer">
                      <input
                        type="file"
                        id="logo-file-input"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="h-10 w-10 text-slate-400 group-hover:text-emerald-600 transition-colors mb-2" />
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                        Arraste ou clique para enviar
                      </span>
                      <span className="text-[10px] text-slate-405 mt-1">
                        PNG, JPEG, SVG ou GIF (com compressão automática)
                      </span>
                    </div>
                  </div>

                  {customLogo && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Redefinir para Logo Padrão</span>
                    </button>
                  )}

                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-[11px] sm:text-xs leading-relaxed space-y-1">
                    <strong className="font-extrabold flex items-center gap-1">
                      <Check className="h-4 w-4 shrink-0 text-emerald-700" />
                      Sincronização em tempo real:
                    </strong>
                    <p>
                      Surgirá no desktop, celulares, e no ícone da aba do navegador (Favicon) instantaneamente para todos os usuários do canal!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmConfig.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Dialog Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 z-[1000] overflow-hidden"
            >
              {/* Header Icon + Title */}
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-full shrink-0 ${confirmConfig.isDanger ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  {confirmConfig.isDanger ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                </div>
                <div className="space-y-1">
                  <h3 className="font-sans font-extrabold text-slate-800 text-base leading-tight">
                    {confirmConfig.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mt-1">
                    {confirmConfig.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {confirmConfig.cancelText || "Cancelar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmConfig.onConfirm) {
                      confirmConfig.onConfirm();
                    }
                  }}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm ${
                    confirmConfig.isDanger
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-100'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-105'
                  }`}
                >
                  {confirmConfig.confirmText || "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
