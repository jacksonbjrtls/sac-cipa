import React, { useState, useEffect } from 'react';
import { 
  signOut, onAuthStateChanged, User, signInAnonymously,
  signInWithEmailAndPassword, sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, collection, getDocs, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import Header from './components/Header';
import Footer from './components/Footer';
import FormWizard from './components/FormWizard';
import ProtocolTracker from './components/ProtocolTracker';
import AdminPanel from './components/AdminPanel';
import CipaLogo from './components/CipaLogo';
import { AREAS_LIST } from './areas';
import { 
  ShieldCheck, Info, Search, FileText, AlertCircle, Sparkles, ExternalLink,
  Mail, Lock, Eye, EyeOff, RotateCcw, Key, ArrowLeft, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function App() {
  // Navigation: 'form' | 'tracker' | 'admin'
  const [currentView, setView] = useState<'form' | 'tracker' | 'admin'>('form');
  const [routeProtocolId, setRouteProtocolId] = useState<string>('');

  // Dynamic visual identity (Logo)
  const [customLogo, setCustomLogo] = useState<string | null>('/logo/logo_cipa.png');
  const [loadingLogo, setLoadingLogo] = useState<boolean>(false);

  // Firebase states
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  // Admin Login States
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [isRegisteringPassword, setIsRegisteringPassword] = useState<boolean>(false);
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'authorized' | 'unauthorized'>('idle');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginMsg, setLoginMsg] = useState<{
    type: 'success' | 'error' | 'warning',
    text: string,
    isConfigIssue?: boolean,
    showResetButton?: boolean,
    emailToReset?: string
  } | null>(null);
  const [isAuthPending, setIsAuthPending] = useState<boolean>(false);

  // Auto-seed default admin and operating areas if database is empty (Runs securely once an Admin is identified)
  useEffect(() => {
    if (!isAdmin) return;

    const seedDatabaseIfEmpty = async () => {
      try {
        const rootAdminEmail = 'jacksonbjr@gmail.com';
        const adminDocRef = doc(db, 'admins', rootAdminEmail);
        const adminSnap = await getDoc(adminDocRef);

        if (!adminSnap.exists()) {
          console.log("Auto-seeding Master Admin into Firestore as root...");
          await setDoc(adminDocRef, {
            email: rootAdminEmail,
            addedBy: 'SYSTEM_BOOTSTRAP',
            createdAt: serverTimestamp()
          });
        }

        const areasCol = collection(db, 'areas');
        const snapshot = await getDocs(areasCol);
        if (snapshot.empty) {
          console.log("Auto-seeding default areas into Firestore as Admin...");
          for (const name of AREAS_LIST) {
            const areaId = doc(areasCol).id;
            await setDoc(doc(db, 'areas', areaId), {
              name,
              createdAt: serverTimestamp()
            });
          }
          console.log("Seeding of default areas completed successfully!");
        }

        // Seeding of areas and admin is retained as they are non-transactional metadata setup,
        // but transactional registrations are never auto-seeded on emptyness to prevent deleted reports from reappearing.
      } catch (err) {
        console.error("Erro no auto-seeding do banco de dados:", err);
      }
    };
    seedDatabaseIfEmpty();
  }, [isAdmin]);

  // Monitor Auth state changes
  useEffect(() => {
    if (isSimulated) {
      setCheckingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);

      if (currentUser) {
        if (currentUser.isAnonymous) {
          setIsAdmin(false);
          setCheckingAuth(false);
          return;
        }

        const emailLower = currentUser.email?.toLowerCase().trim() || '';
        
        // Master account bypasses DB checks immediately
        if (emailLower === 'jacksonbjr@gmail.com') {
          setIsAdmin(true);
          setCheckingAuth(false);
          return;
        }

        try {
          // Check database role
          const adminDocRef = doc(db, 'admins', emailLower);
          const docSnap = await getDoc(adminDocRef);
          
          if (docSnap.exists()) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Erro ao averiguar cargo administrativo:", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [isSimulated]);

  // Set simulation mode on mount
  useEffect(() => {
    const simulated = localStorage.getItem('cipa_is_simulated') === 'true';
    setIsSimulated(simulated);
  }, []);

  // Handle dynamic favicon and document tab bar icon updating
  useEffect(() => {
    let faviconUrl = '';
    if (customLogo) {
      faviconUrl = customLogo;
    } else {
      // Default safety green circle with white cross
      faviconUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%23047857"/><path d="M50 20 v60 M20 50 h60" stroke="white" stroke-width="12"/></svg>`;
    }

    try {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    } catch (e) {
      console.warn("Favicon update simulated or not supported:", e);
    }
  }, [customLogo]);

  // Auth Operations
  const checkEmailAuthorized = async (emailStr: string) => {
    const trimmed = emailStr.toLowerCase().trim();
    if (!trimmed) {
      setEmailCheckStatus('idle');
      setLoginMsg(null);
      return;
    }

    if (trimmed === 'jacksonbjr@gmail.com') {
      setEmailCheckStatus('authorized');
      setLoginMsg(null);
      return;
    }

    if (!trimmed.endsWith('@eldoradobrasil.com.br')) {
      setEmailCheckStatus('unauthorized');
      setLoginMsg({
        type: 'warning',
        text: 'Acesso restrito: E-mails administrativos devem pertencer ao domínio corporativo @eldoradobrasil.com.br.'
      });
      return;
    }

    setEmailCheckStatus('checking');
    try {
      const adminDocRef = doc(db, 'admins', trimmed);
      const docSnap = await getDoc(adminDocRef);
      if (docSnap.exists()) {
        setEmailCheckStatus('authorized');
        setLoginMsg(null);
      } else {
        setEmailCheckStatus('unauthorized');
        setLoginMsg({
          type: 'warning',
          text: 'Seu e-mail não está credenciado como administrador no Serviço de Atendimento ao Colaborador.'
        });
      }
    } catch (err) {
      console.error("Erro ao verificar e-mail credenciado:", err);
      // Fallback: don't brick the interface if Firestore rules/network transient issue occurs
      setEmailCheckStatus('authorized');
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMsg(null);
    setIsAuthPending(true);

    const email = loginEmail.toLowerCase().trim();
    const password = loginPassword;

    if (!email || !password) {
      setLoginMsg({ type: 'error', text: 'Por favor, preencha todos os campos.' });
      setIsAuthPending(false);
      return;
    }

    // Direct check for authorization to satisfy requirement
    if (email !== 'jacksonbjr@gmail.com') {
      if (!email.endsWith('@eldoradobrasil.com.br')) {
        setEmailCheckStatus('unauthorized');
        setLoginMsg({
          type: 'warning',
          text: 'Acesso restrito: E-mails de administradores devem obrigatoriamente pertencer ao domínio corporativo @eldoradobrasil.com.br.'
        });
        setIsAuthPending(false);
        return;
      }
      try {
        const adminDocRef = doc(db, 'admins', email);
        const docSnap = await getDoc(adminDocRef);
        if (!docSnap.exists()) {
          setEmailCheckStatus('unauthorized');
          setLoginMsg({
            type: 'warning',
            text: 'Seu e-mail não está credenciado como administrador. A entrada é somente para pessoal autorizado.'
          });
          setIsAuthPending(false);
          return;
        }
      } catch (err) {
        console.warn("Incapaz de forçar bloqueio preventivo via Firestore:", err);
      }
    }

    try {
      if (isSimulated) {
        setIsSimulated(false);
      }
      await signInWithEmailAndPassword(auth, email, password);
      setLoginMsg({ type: 'success', text: 'Autenticado com sucesso! Carregando painel...' });
    } catch (err: any) {
      console.error("Erro no login Admin:", err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setLoginMsg({
          type: 'error',
          text: 'O provedor de autenticação "E-mail/Senha" (Email/Password) está desativado no Firebase Console para este projeto.',
          isConfigIssue: true
        });
      } else if (
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-login-credentials' || 
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/user-not-found'
      ) {
        const isMaster = email === 'jacksonbjr@gmail.com';
        setLoginMsg({ 
          type: 'error', 
          text: isMaster 
            ? 'Atenção Jackson: A senha informada está incorreta ou ainda não foi criada. Como seu login já existe no sistema, você pode definir ou redefinir sua senha manual de forma instantânea clicando no botão abaixo para receber o link de criação de senha oficial no seu e-mail!' 
            : 'Senha incorreta ou credenciais inválidas. Se você deseja definir ou recuperar sua senha de forma fácil, clique no botão azul abaixo para que enviemos um link de configuração direto para seu e-mail.',
          showResetButton: true,
          emailToReset: email
        });
      } else {
        setLoginMsg({ type: 'error', text: `Falha na autenticação: ${err.message}` });
      }
    } finally {
      setIsAuthPending(false);
    }
  };

  const handleRegisterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMsg(null);
    setIsAuthPending(true);

    const email = loginEmail.toLowerCase().trim();
    const password = loginPassword;

    if (!email || !password) {
      setLoginMsg({ type: 'error', text: 'Por favor, preencha todos os campos.' });
      setIsAuthPending(false);
      return;
    }

    if (password.length < 6) {
      setLoginMsg({ type: 'error', text: 'A senha precisa conter pelo menos 6 caracteres.' });
      setIsAuthPending(false);
      return;
    }

    // Verify they are accredited
    if (email !== 'jacksonbjr@gmail.com') {
      if (!email.endsWith('@eldoradobrasil.com.br')) {
        setLoginMsg({
          type: 'warning',
          text: 'Acesso restrito: O cadastro de senha é exclusivo para o domínio @eldoradobrasil.com.br.'
        });
        setIsAuthPending(false);
        return;
      }
      try {
        const adminDocRef = doc(db, 'admins', email);
        const docSnap = await getDoc(adminDocRef);
        if (!docSnap.exists()) {
          setLoginMsg({
            type: 'warning',
            text: 'Seu e-mail não está credenciado como administrador no Serviço de Atendimento ao Colaborador.'
          });
          setIsAuthPending(false);
          return;
        }
      } catch (err) {
        setLoginMsg({ type: 'error', text: 'Erro ao validar setor. Tente novamente.' });
        setIsAuthPending(false);
        return;
      }
    }

    try {
      if (isSimulated) {
        setIsSimulated(false);
      }
      await createUserWithEmailAndPassword(auth, email, password);
      setLoginMsg({ type: 'success', text: 'Senha definida com sucesso! Acessando...' });
      setIsRegisteringPassword(false);
    } catch (err: any) {
      console.error("Erro no cadastro de senha:", err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setLoginMsg({
          type: 'error',
          text: 'O provedor de autenticação "E-mail/Senha" (Email/Password) está desativado no Firebase Console para este projeto.',
          isConfigIssue: true
        });
      } else if (err.code === 'auth/email-already-in-use') {
        // Automatically send a redefinition email to make their lives 10x easier
        try {
          await sendPasswordResetEmail(auth, email);
          setLoginMsg({
            type: 'success',
            text: `Percebemos que o e-mail "${email}" já possui um registro ativo no Firebase Autenticação (pode ter sido criado por login anterior com Google). Para sua comodidade, ENVIAMOS UM LINK DE CRIAÇÃO/DEFINIÇÃO DE SENHA para seu e-mail agora mesmo! Acesse sua caixa de entrada ou Spam, clique no link oficial do Firebase para criar sua senha e depois retorne para fazer o login manual normalmente. Simples assim!`
          });
        } catch (resetErr: any) {
          console.error("Erro ao enviar reset automático:", resetErr);
          setLoginMsg({
            type: 'error',
            text: `Este e-mail administrativo já possui registro ativo. Tentamos enviar um link de redefinição de forma automática, mas ocorreu um erro no servidor de e-mail do Firebase: ${resetErr.message || resetErr}. Clique no botão abaixo para tentar enviar manualmente.`,
            showResetButton: true,
            emailToReset: email
          });
        }
      } else {
        setLoginMsg({ type: 'error', text: `Erro: ${err.message}` });
      }
    } finally {
      setIsAuthPending(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMsg(null);
    setIsAuthPending(true);

    const email = loginEmail.toLowerCase().trim();
    if (!email) {
      setLoginMsg({ type: 'error', text: 'Por favor, insira o seu e-mail administrativo.' });
      setIsAuthPending(false);
      return;
    }

    // Verify they are accredited
    if (email !== 'jacksonbjr@gmail.com') {
      if (!email.endsWith('@eldoradobrasil.com.br')) {
        setLoginMsg({
          type: 'warning',
          text: 'Acesso restrito: E-mails informados devem pertencer ao domínio corporativo @eldoradobrasil.com.br.'
        });
        setIsAuthPending(false);
        return;
      }
      try {
        const adminDocRef = doc(db, 'admins', email);
        const docSnap = await getDoc(adminDocRef);
        if (!docSnap.exists()) {
          setLoginMsg({
            type: 'warning',
            text: 'Seu e-mail não está credenciado como administrador no Serviço de Atendimento ao Colaborador.'
          });
          setIsAuthPending(false);
          return;
        }
      } catch (err) {
        console.warn(err);
      }
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setLoginMsg({ 
        type: 'success', 
        text: 'E-mail de redefinição enviado com sucesso! IMPORTANTE: 1) Verifique sua pasta de Lixo Eletrônico/Spam, pois o envio é automatizado e pode ser filtrado pelo seu provedor. 2) Caso este seja seu primeiro acesso ou se você ainda não registrou uma senha no sistema, use a opção "Definir Nova Senha (1º Acesso)" na tela de login anterior para cadastrar seus dados.' 
      });
    } catch (err: any) {
      console.error("Erro no envio do e-mail de redefinição:", err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setLoginMsg({
          type: 'error',
          text: 'O provedor de autenticação "E-mail/Senha" (Email/Password) está desativado no Firebase Console para este projeto.',
          isConfigIssue: true
        });
      } else {
        setLoginMsg({ type: 'error', text: `Não foi possível enviar o e-mail: ${err.message}` });
      }
    } finally {
      setIsAuthPending(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginMsg(null);
    setIsAuthPending(true);
    try {
      if (isSimulated) {
        setIsSimulated(false);
      }
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const emailLower = result.user.email?.toLowerCase().trim() || '';

      // Check if email is authorized (or master account)
      if (emailLower === 'jacksonbjr@gmail.com') {
        setIsAdmin(true);
        setLoginMsg({ type: 'success', text: 'Autenticado via Google com sucesso!' });
      } else {
        const adminDocRef = doc(db, 'admins', emailLower);
        const docSnap = await getDoc(adminDocRef);
        if (docSnap.exists()) {
          setIsAdmin(true);
          setLoginMsg({ type: 'success', text: 'Autenticado via Google com sucesso!' });
        } else {
          setIsAdmin(false);
          await signOut(auth); // Sign out if they are not an authorized admin
          setLoginMsg({
            type: 'warning',
            text: `A conta Google (${emailLower}) não está credenciada como administrador. Acesso negado.`
          });
        }
      }
    } catch (err: any) {
      console.error("Erro no login Google:", err);
      if (err.code === 'auth/popup-blocked') {
        setLoginMsg({ type: 'error', text: 'O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site e tente novamente.' });
      } else {
        setLoginMsg({ type: 'error', text: `Erro no login Google: ${err.message}` });
      }
    } finally {
      setIsAuthPending(false);
    }
  };

  const handleTestLogin = () => {
    setCheckingAuth(true);
    setIsSimulated(true);
    setUser({
      email: 'jacksonbjr@gmail.com',
      displayName: 'Jackson (Simulado CIPA)',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      uid: 'simulated-jackson-user',
      isAnonymous: false,
    } as any);
    setIsAdmin(true);
    setAuthError(null);
    setCheckingAuth(false);
  };

  const handleLogout = async () => {
    setCheckingAuth(true);
    try {
      if (isSimulated) {
        setIsSimulated(false);
        setUser(null);
        setIsAdmin(false);
        setView('form');
      } else {
        await signOut(auth);
        setView('form');
      }
    } catch (err) {
      console.error("Falha na desconexão:", err);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Redirect to tracker upon successful questionnaire send
  const handleFormSubmitted = (generatedProtocolId: string) => {
    setRouteProtocolId(generatedProtocolId);
    setView('tracker');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f5f9] text-slate-800 font-sans selection:bg-emerald-700 selection:text-white">
      {/* Real-time Header */}
      <Header
        currentView={currentView}
        setView={(v) => {
          setView(v);
          setAuthError(null);
        }}
        user={user}
        isAdmin={isAdmin}
        onLogin={() => {
          setView('admin');
          setAuthError(null);
          setLoginMsg(null);
        }}
        onLogout={handleLogout}
        customLogo={customLogo}
      />

      {/* Main Body */}
      <main id="app-main-content" className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {authError && (
          <div className="mb-6 flex gap-3 items-start rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-850 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p>{authError}</p>
          </div>
        )}

        {checkingAuth ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-emerald-700 animate-spin"></div>
              <ShieldCheck className="h-5 w-5 absolute top-3.5 left-3.5 text-emerald-600 shrink-0" />
            </div>
            <span className="text-xs text-slate-505 font-mono tracking-wider animate-pulse font-medium">Sincronizando credenciais...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {currentView === 'form' && (
              <FormWizard onSuccess={handleFormSubmitted} />
            )}

            {currentView === 'tracker' && (
              <ProtocolTracker initialProtocolId={routeProtocolId} />
            )}

            {currentView === 'admin' && user && isAdmin && (
              <AdminPanel 
                currentUserEmail={user.email || 'Conta Corporativa'} 
                isSimulated={isSimulated} 
                customLogo={customLogo}
                setCustomLogo={setCustomLogo}
              />
            )}

            {currentView === 'admin' && (!user || !isAdmin) && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 max-w-lg mx-auto shadow-sm space-y-6">
                {/* Visual Header */}
                <div className="text-center space-y-2">
                  <div className="mx-auto flex justify-center mb-3">
                    <CipaLogo customLogo={customLogo} size={56} className="mx-auto" />
                  </div>
                  <h2 id="cipa-admin-auth-header" className="text-xl font-bold text-slate-800">
                    {isForgotPassword 
                      ? 'Recuperar Senha Admin' 
                      : isRegisteringPassword 
                        ? 'Definir Senha de Admin' 
                        : 'Acesso Restrito ao Comitê CIPA'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-505 leading-relaxed max-w-sm mx-auto">
                    {isForgotPassword
                      ? 'Insira o seu e-mail corporativo credenciado para receber o link de redefinição de senha.'
                      : isRegisteringPassword
                        ? 'Se você é um administrador e este é seu primeiro login, crie sua senha abaixo.'
                        : 'Identifique-se com suas credenciais de e-mail e senha homologadas.'}
                  </p>
                </div>

                {/* Notifications & Warning Alerts */}
                {loginMsg && (
                  <div className="space-y-4">
                    <div id="cipa-login-alert-box" className={`p-4 rounded-xl text-xs sm:text-sm border flex gap-3 items-start ${
                      loginMsg.type === 'success' 
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800' 
                        : loginMsg.type === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-800 font-semibold'
                          : 'border-red-200 bg-red-50 text-red-850'
                    }`}>
                      <AlertCircle className={`h-5 w-5 shrink-0 ${
                        loginMsg.type === 'success'
                          ? 'text-emerald-600'
                          : loginMsg.type === 'warning'
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`} />
                      <div className="flex-1 space-y-1">
                        <p className="font-bold">
                          {loginMsg.type === 'warning' 
                            ? 'Entrada somente para pessoal autorizado' 
                            : loginMsg.type === 'success' 
                              ? 'Operação Concluída' 
                              : 'Erro de Autenticação'}
                        </p>
                        <p className="leading-relaxed font-semibold">{loginMsg.text}</p>
                        {loginMsg.showResetButton && loginMsg.emailToReset && (
                          <div className="pt-2.5 text-left">
                            <button
                              type="button"
                              onClick={async () => {
                                const email = loginMsg.emailToReset!;
                                setLoginMsg({ type: 'success', text: `Solicitando link de definição de senha oficial para ${email}...` });
                                try {
                                  await sendPasswordResetEmail(auth, email);
                                  setLoginMsg({
                                    type: 'success',
                                    text: `Link enviado com total sucesso! Verifique a Caixa de Entrada (e pasta de Spam/Lixo Eletrônico) de "${email}" para cadastrar sua nova senha antes de tentar logar novamente.`
                                  });
                                } catch (resetErr: any) {
                                  setLoginMsg({
                                    type: 'error',
                                    text: `Ocorreu um erro ao despachar a solicitação: ${resetErr.message || resetErr}`
                                  });
                                }
                              }}
                              className="mt-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs transition-all cursor-pointer shadow-sm tracking-wide"
                            >
                              Enviar Link de Criação de Senha por E-mail
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                     {/* Step-by-step manual guide if email/password auth provider is disabled in Firebase console */}
                    {loginMsg.isConfigIssue && (
                      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-emerald-950 text-xs leading-relaxed space-y-3 text-left">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                          <Info className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                          <span>Instruções de Permissões sobre Métodos de Login:</span>
                        </div>
                        <p className="text-slate-700 font-medium">
                          A mensagem <em className="text-red-700 font-bold">"Para gerenciar métodos de login peça a um proprietário..."</em> ocorre porque o ambiente sandboxed do AI Studio restringe permissões IAM de configuração do Firebase Console.
                        </p>
                        <p className="text-slate-700 font-semibold">
                          Para contornar isso de forma rápida e segura, use uma das alternativas integradas abaixo:
                        </p>
                        <div className="space-y-2 border-t border-emerald-100/70 pt-2.5 text-[11px] text-slate-800">
                          <p>
                            🔵 <strong>Alternativa 1 (Recomendada): Google Sign-In</strong><br />
                            A autenticação Google já foi configurada pelo AI Studio! Você pode simplesmente logar usando o botão <strong>"Entrar com o Google"</strong> abaixo. Ao conectar sua conta (como <strong className="text-emerald-800">jacksonbjr@gmail.com</strong>), o sistema lhe concederá benefícios de administrador em tempo real imediatamente.
                          </p>
                          <p>
                            🟢 <strong>Alternativa 2: Modo de Teste Rápido</strong><br />
                            Clique no botão verde <strong>"Acesso de Teste (Bypass)"</strong> mais abaixo para experimentar todas as ferramentas do Painel CIPA localmente por meio de armazenamento isolado instantâneo.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Auth Form */}
                {isForgotPassword ? (
                  // RESET PASSWORD FLOW
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    {/* Alerta de primeiro acesso e entrega de e-mail */}
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 space-y-1.5 text-left text-[11px] text-amber-900 leading-relaxed font-semibold">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Info className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Atenção sobre o e-mail de recuperação:</span>
                      </div>
                      <p>● **Pasta de Lixo Eletrônico/Spam**: Como o envio é automatizado, verifique com atenção sua pasta de Spam corporativo.</p>
                      <p>● **Primeiro Acesso ao Sistema**: Se você nunca entrou no painel ou ainda não registrou uma senha pessoal, sua conta de login ainda não existe. O e-mail de recuperação só é enviado para contas já cadastradas. Nesse caso, use a opção de **"Definir Nova Senha (1º Acesso)"** na tela anterior.</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center select-none">
                        <label className="text-xs font-bold text-slate-500 block">E-mail Administrativo</label>
                        {emailCheckStatus === 'checking' && <span className="text-[10px] text-emerald-600 animate-pulse font-bold">Verificando...</span>}
                        {emailCheckStatus === 'authorized' && <span className="text-[10px] text-emerald-600 font-bold">● E-mail Credenciado</span>}
                        {emailCheckStatus === 'unauthorized' && <span className="text-[10px] text-red-650 font-bold">● Não Autorizado</span>}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            setLoginMsg(null);
                          }}
                          onBlur={() => checkEmailAuthorized(loginEmail)}
                          placeholder="Ex: nome@eldoradobrasil.com.br"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/10"
                          required
                          disabled={isAuthPending}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthPending || emailCheckStatus === 'unauthorized'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {isAuthPending ? 'Enviando...' : 'Enviar Link de Recuperação'}
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setLoginMsg(null);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-505 hover:text-slate-800 hover:bg-slate-50 border border-transparent py-2 rounded-xl transition-all font-semibold"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Voltar para Login</span>
                    </button>
                  </form>
                ) : isRegisteringPassword ? (
                  // PASSWORD REGISTRATION FLOW (FIRST ACCESS)
                  <form onSubmit={handleRegisterPassword} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center select-none">
                          <label className="text-xs font-bold text-slate-500 block">E-mail de Convite CIPA</label>
                          {emailCheckStatus === 'checking' && <span className="text-[10px] text-emerald-600 animate-pulse font-bold">Verificando...</span>}
                          {emailCheckStatus === 'authorized' && <span className="text-[10px] text-emerald-600 font-bold">● E-mail Autorizado</span>}
                          {emailCheckStatus === 'unauthorized' && <span className="text-[10px] text-red-650 font-bold">● Entrada somente para autorizado</span>}
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => {
                              setLoginEmail(e.target.value);
                              setLoginMsg(null);
                            }}
                            onBlur={() => checkEmailAuthorized(loginEmail)}
                            placeholder="Ex: nome@eldoradobrasil.com.br"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/10"
                            required
                            disabled={isAuthPending}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 block">Senha de Acesso (Min. 6 dígitos)</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                            <Lock className="h-4 w-4" />
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Defina qual será sua senha"
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/10"
                            required
                            disabled={isAuthPending || emailCheckStatus === 'unauthorized'}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthPending || emailCheckStatus === 'unauthorized' || !loginPassword}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {isAuthPending ? 'Cadastrando...' : 'Cadastrar Minha Senha'}
                      <CheckCircle2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisteringPassword(false);
                        setLoginMsg(null);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-505 hover:text-slate-800 hover:bg-slate-50 border border-transparent py-2 rounded-xl transition-all font-semibold"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Voltar para Login</span>
                    </button>
                  </form>
                ) : (
                  // REGULAR EMAIL/PASSWORD LOGIN FLOW
                  <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
                    <div className="space-y-4">
                      {/* Email Field */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center select-none">
                          <label className="text-xs font-bold text-slate-505 block">E-mail do Comitê</label>
                          {emailCheckStatus === 'checking' && <span className="text-[10px] text-emerald-600 animate-pulse font-bold">Verificando...</span>}
                          {emailCheckStatus === 'authorized' && <span className="text-[10px] text-emerald-600 font-bold">● E-mail Autorizado</span>}
                          {emailCheckStatus === 'unauthorized' && <span className="text-[10px] text-red-650 font-bold uppercase tracking-wider">● Entrada somente para autorizado</span>}
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => {
                              setLoginEmail(e.target.value);
                              // Clear authorization state during editing to recheck on blur/submit
                              setEmailCheckStatus('idle');
                              setLoginMsg(null);
                            }}
                            onBlur={() => checkEmailAuthorized(loginEmail)}
                            placeholder="nome.sobrenome@eldoradobrasil.com.br"
                            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none transition-all focus:bg-white ${
                              emailCheckStatus === 'unauthorized'
                                ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/10'
                                : emailCheckStatus === 'authorized'
                                  ? 'border-emerald-200 focus:border-emerald-500'
                                  : 'border-slate-200 focus:border-emerald-500'
                            }`}
                            required
                            disabled={isAuthPending}
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center select-none">
                          <label className="text-xs font-bold text-slate-505 block">Senha de Segurança</label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotPassword(true);
                              setLoginMsg(null);
                            }}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline font-bold transition-all"
                          >
                            Esqueci minha senha?
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                            <Lock className="h-4 w-4" />
                          </span>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Insira sua senha de acesso"
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/10"
                            required
                            disabled={isAuthPending || emailCheckStatus === 'unauthorized'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthPending || emailCheckStatus === 'unauthorized'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-sm text-center flex items-center justify-center gap-1.5"
                    >
                      {isAuthPending ? 'Entrando...' : 'Entrar no Painel CIPA'}
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1.5 select-none font-semibold">
                      <span>Não tem senha ainda?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisteringPassword(true);
                          setLoginMsg(null);
                        }}
                        className="text-emerald-600 hover:text-emerald-700 hover:underline font-extrabold shadow-none bg-transparent p-0 m-0 cursor-pointer"
                      >
                        Definir Nova Senha (1º Acesso)
                      </button>
                    </div>
                  </form>
                )}

                <div className="pt-2 border-t border-slate-150 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setView('form');
                      // Reset validation helper states
                      setLoginMsg(null);
                      setEmailCheckStatus('idle');
                    }}
                    id="btn-back-form-card"
                    className="w-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-705 py-3 px-4 rounded-xl text-xs transition-all cursor-pointer text-center font-bold"
                  >
                    Voltar ao Envio de Relatos CIPA
                  </button>
                </div>

                <div className="text-[9px] text-slate-400 select-none text-center font-medium">
                  Caso necessite de permissões de inclusão no comitê, contate jacksonbjr@gmail.com.
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent Legal CIPA Footer */}
      <Footer />

    </div>
  );
}
