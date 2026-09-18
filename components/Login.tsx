import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { UserRole } from '../types';
import { ShieldCheck, ArrowLeft, Mail, Lock, Loader2, User as UserIcon, Briefcase, RefreshCw, KeyRound } from 'lucide-react';

export type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

interface LoginProps {
    onLoginSuccess: (session: any) => void;
    initialMode?: AuthMode;
    onResetComplete?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, initialMode = 'login', onResetComplete }) => {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<string>('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [verifySuccess, setVerifySuccess] = useState(false);
    const [isRecoverySession, setIsRecoverySession] = useState(false);

    useEffect(() => {
        if (initialMode) {
            setMode(initialMode);
        }
    }, [initialMode]);

    // Recovery of email if page refreshes during verification or password reset
    useEffect(() => {
        const savedEmail = localStorage.getItem('pending_verification_email');
        if (savedEmail && mode === 'verify') {
            setEmail(savedEmail);
            localStorage.setItem('active_portal', 'internal');
        }
        const savedRecoveryEmail = localStorage.getItem('pending_recovery_email');
        if (savedRecoveryEmail && (mode === 'forgot' || mode === 'reset')) {
            setEmail(savedRecoveryEmail);
        }
    }, [mode]);

    // Check if user reached page through a recovery redirect with URL tokens
    useEffect(() => {
        const checkRecoveryToken = async () => {
            const hash = window.location.hash;
            if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
                const params = new URLSearchParams(hash.replace(/^#/, ''));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const type = params.get('type');
                if (type === 'recovery' || accessToken) {
                    if (accessToken && refreshToken) {
                        try {
                            await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });
                        } catch (err) {
                            console.error('Error setting recovery session:', err);
                        }
                    }
                    setIsRecoverySession(true);
                    setMode('reset');
                    setError(null);
                    setSuccessMessage('Sessão de recuperação validada. Defina sua nova senha abaixo.');
                }
            }
        };
        checkRecoveryToken();
    }, []);

    const internalRoles = [
        { value: UserRole.TECNICO, label: 'Técnico Eletromidia' },
        { value: UserRole.LIDER, label: 'Líder Regional' },
        { value: UserRole.CHEFE, label: 'Chief of Operations' },
    ];

    const roles = internalRoles;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const normalizedEmail = email.trim().toLowerCase();

            if (mode === 'login') {
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password,
                });
                if (authError) throw authError;

                if (data.session && data.user) {
                    const userMeta = data.user.user_metadata || {};
                    const userCompanyId = userMeta.company_id || 'internal';
                    const isUserInternal = userCompanyId === 'internal';

                    if (!isUserInternal) {
                        await supabase.auth.signOut();
                        localStorage.removeItem('active_portal');
                        setLoading(false);
                        setError('Acesso negado. Apenas usuários internos podem acessar.');
                        return;
                    }

                    localStorage.setItem('active_portal', 'internal');
                    onLoginSuccess(data.session);
                }
            } else if (mode === 'register') {
                if (!role) throw new Error('Selecione sua função');

                await supabase.auth.signOut();

                const { data, error: authError } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password,
                    options: {
                        data: {
                            name,
                            role,
                            company_id: 'internal',
                            company_name: 'Eletromidia',
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                        }
                    }
                });

                if (data.user || data.session) {
                    localStorage.setItem('pending_verification_email', normalizedEmail);
                    localStorage.setItem('active_portal', 'internal');
                    setMode('verify');
                    setError(null);
                }
            } else if (mode === 'verify') {
                const { data, error: verifyError } = await supabase.auth.verifyOtp({
                    email: normalizedEmail,
                    token: otp,
                    type: 'signup'
                });

                if (verifyError) {
                    throw verifyError;
                }

                if (data.session) {
                    localStorage.setItem('active_portal', 'internal');
                    localStorage.removeItem('pending_verification_email');
                    setVerifySuccess(true);
                    onLoginSuccess(data.session);
                } else if (data.user) {
                    localStorage.removeItem('pending_verification_email');
                    setVerifySuccess(true);
                    setMode('login');
                    setSuccessMessage('Conta verificada com sucesso! Por favor, faça o login.');
                }
            } else if (mode === 'forgot') {
                if (!normalizedEmail) {
                    throw new Error('Informe seu e-mail corporativo.');
                }

                const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                    redirectTo: window.location.origin,
                });

                if (resetError) throw resetError;

                localStorage.setItem('pending_recovery_email', normalizedEmail);
                setMode('reset');
                setError(null);
                setSuccessMessage(`Enviamos as instruções para ${normalizedEmail}! Verifique sua caixa de entrada e spam.`);
            } else if (mode === 'reset') {
                if (!password) {
                    throw new Error('Informe a nova senha.');
                }
                if (password.length < 6) {
                    throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
                }
                if (password !== confirmPassword) {
                    throw new Error('As senhas digitadas não coincidem.');
                }

                // If OTP was provided, verify it first
                if (otp.trim()) {
                    const { error: otpError } = await supabase.auth.verifyOtp({
                        email: normalizedEmail,
                        token: otp.trim(),
                        type: 'recovery'
                    });
                    if (otpError) throw otpError;
                } else if (!isRecoverySession) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                        throw new Error('Insira o código numérico (OTP) recebido no e-mail ou utilize o link enviado.');
                    }
                }

                // Update the user password
                const { error: updateError } = await supabase.auth.updateUser({
                    password: password
                });

                if (updateError) throw updateError;

                if (window.location.hash) {
                    window.history.replaceState(null, '', window.location.pathname);
                }
                localStorage.removeItem('pending_recovery_email');

                setPassword('');
                setConfirmPassword('');
                setOtp('');
                setIsRecoverySession(false);
                setSuccessMessage('Senha atualizada com sucesso! Você já pode entrar com sua nova credencial.');
                setMode('login');

                if (onResetComplete) {
                    onResetComplete();
                }
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao processar solicitação');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setResending(true);
        setError(null);
        setResendSuccess(false);

        const normalizedEmail = email.trim().toLowerCase();

        try {
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: normalizedEmail,
            });

            if (resendError) throw resendError;
            setResendSuccess(true);
            setOtp('');
            setTimeout(() => setResendSuccess(false), 5000);
        } catch (err: any) {
            setError(err.message || 'Erro ao reenviar código');
        } finally {
            setResending(false);
        }
    };

    const handleResendRecovery = async () => {
        setResending(true);
        setError(null);
        setResendSuccess(false);

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            setError('Informe seu e-mail corporativo para reenviar.');
            setResending(false);
            return;
        }

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: window.location.origin,
            });
            if (resetError) throw resetError;

            setResendSuccess(true);
            setOtp('');
            setTimeout(() => setResendSuccess(false), 5000);
        } catch (err: any) {
            setError(err.message || 'Erro ao reenviar instruções');
        } finally {
            setResending(false);
        }
    };

    const getHeaderInfo = () => {
        switch (mode) {
            case 'login':
                return { title: 'Acesso', subtitle: 'Insira suas credenciais' };
            case 'register':
                return { title: 'Criar Conta', subtitle: 'Solicite seu acesso' };
            case 'verify':
                return { title: 'Verificação', subtitle: 'Confirme seu e-mail' };
            case 'forgot':
                return { title: 'Recuperar Senha', subtitle: 'Informe seu e-mail corporativo' };
            case 'reset':
                return { title: 'Nova Senha', subtitle: 'Defina sua nova credencial de acesso' };
        }
    };

    const header = getHeaderInfo();

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row font-sans overflow-hidden">
            {/* Esquerda - Branding (Estilo Devialet: Limpo, Texto Gigante, Elegante) */}
            <div className="w-full md:w-1/2 flex flex-col justify-center px-10 py-16 md:p-24 relative z-10 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-white to-slate-50 opacity-50"></div>
                    <div className="absolute top-[20%] -left-[20%] w-[140%] h-[60%] rounded-[100%] border-[1px] border-slate-100 opacity-30 transform -rotate-12 scale-150"></div>
                    <div className="absolute top-[25%] -left-[15%] w-[130%] h-[50%] rounded-[100%] border-[1px] border-slate-100 opacity-20 transform -rotate-12 scale-125"></div>
                </div>

                <div className="relative z-10 max-w-xl mx-auto md:mx-0 w-full space-y-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <span className="h-[2px] w-8 bg-primary rounded-full"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Plataforma Oficial</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-[100px] font-black text-black tracking-tighter leading-[0.85]">
                        ELETRO
                        <br />
                        <span className="text-primary">MIDIA</span>
                    </h1>

                    <div className="pt-4 border-t border-slate-100 max-w-sm">
                        <p className="text-xl md:text-2xl font-bold text-slate-400 tracking-tight">
                            FieldManager
                        </p>
                        <p className="mt-2 text-sm text-slate-400 leading-relaxed font-medium">
                            Gestão operacional de operações de campo.
                            Controle de ativos, rotas e manutenções.
                        </p>
                    </div>
                </div>
            </div>

            {/* Direita - Formulário de Login / Recuperação */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-20 bg-[#FAFAFA] relative">
                <div className="w-full max-w-md bg-white p-10 md:p-14 rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.04)] border border-slate-100 relative z-10">

                    {(mode === 'verify' || mode === 'forgot' || mode === 'reset') && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === 'verify' ? 'register' : 'login');
                                setError(null);
                                setSuccessMessage(null);
                            }}
                            className="group flex items-center gap-2 font-bold text-xs uppercase tracking-[0.1em] text-slate-400 hover:text-primary transition-colors mb-8"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            {mode === 'verify' ? 'Voltar ao cadastro' : 'Voltar ao login'}
                        </button>
                    )}

                    <div className="mb-10">
                        <h2 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase mb-2">
                            {header.title}
                        </h2>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            {header.subtitle}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'verify' ? (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Código de Acesso</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={8}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="w-full px-4 py-6 bg-slate-50 rounded-[16px] border-none outline-none font-black text-2xl md:text-3xl text-center tracking-[0.2em] text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-slate-300"
                                        placeholder="00000000"
                                    />
                                </div>

                                <p className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest leading-relaxed">
                                    Enviado para <span className="text-black">{email}</span>
                                </p>

                                {resendSuccess && (
                                    <div className="p-4 rounded-[12px] bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.1em] text-center">
                                        ✓ Código reenviado
                                    </div>
                                )}
                                {verifySuccess && (
                                    <div className="p-4 rounded-[12px] bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.1em] text-center">
                                        ✓ Acesso Liberado
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={resending}
                                    className="w-full py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    {resending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                                    Reenviar código
                                </button>
                            </div>
                        ) : mode === 'forgot' ? (
                            <div className="space-y-4 animate-fadeIn">
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Digite o e-mail corporativo associado à sua conta. Enviaremos as instruções com link e código para você redefinir sua senha com segurança.
                                </p>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">E-mail Corporativo</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-bold text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                            placeholder="usuario@eletromidia.com.br"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : mode === 'reset' ? (
                            <div className="space-y-4 animate-fadeIn">
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {isRecoverySession
                                        ? 'Sessão de recuperação autorizada. Crie uma nova senha para sua conta.'
                                        : 'Se recebeu um código numérico (OTP) por e-mail, insira-o abaixo. Se clicou no link recebido no e-mail, basta definir a nova senha.'}
                                </p>

                                {!isRecoverySession && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">E-mail Corporativo</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-bold text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                                    placeholder="usuario@eletromidia.com.br"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Código de Verificação (OTP)</label>
                                                <span className="text-[9px] text-slate-400 font-medium">Opcional se usou link</span>
                                            </div>
                                            <div className="relative group">
                                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    maxLength={8}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-black text-xl tracking-[0.2em] text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-slate-300 placeholder:font-normal placeholder:text-sm"
                                                    placeholder="Código numérico recebido"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nova Senha</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-bold text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Confirmar Nova Senha</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-bold text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                            placeholder="Repita a nova senha"
                                        />
                                    </div>
                                </div>

                                {!isRecoverySession && (
                                    <div className="pt-2">
                                        {resendSuccess && (
                                            <div className="p-3 mb-2 rounded-[12px] bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.1em] text-center">
                                                ✓ Novas instruções reenviadas
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleResendRecovery}
                                            disabled={resending}
                                            className="w-full py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2"
                                        >
                                            {resending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                                            Reenviar e-mail de recuperação
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {mode === 'register' && (
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nome Completo</label>
                                        <div className="relative group">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-bold text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                                placeholder="Nome do colaborador"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">E-mail Corporativo</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-bold text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                            placeholder="usuario@eletromidia.com.br"
                                        />
                                    </div>
                                </div>

                                {mode === 'register' && (
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Função</label>
                                        <div className="relative group">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                            <select
                                                required
                                                value={role}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-full pl-12 pr-10 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-bold text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Selecione um perfil</option>
                                                {roles.map(r => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Senha</label>
                                        {mode === 'login' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMode('forgot');
                                                    setError(null);
                                                    setSuccessMessage(null);
                                                }}
                                                className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors tracking-wide"
                                            >
                                                Esqueceu a senha?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[16px] border-none outline-none font-bold text-black focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="p-4 rounded-[12px] bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-4 rounded-[12px] bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                {successMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 mt-4 rounded-[16px] font-black text-[11px] uppercase tracking-[0.2em] text-white bg-black hover:bg-primary transition-colors flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                mode === 'login' ? 'Entrar' :
                                mode === 'register' ? 'Concluir' :
                                mode === 'verify' ? 'Confirmar' :
                                mode === 'forgot' ? 'Enviar Instruções' :
                                'Salvar Nova Senha'
                            )}
                        </button>
                    </form>

                    {mode !== 'verify' && mode !== 'forgot' && mode !== 'reset' && (
                        <div className="text-center mt-8 pt-6 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-black transition-colors"
                            >
                                {mode === 'login' ? 'Novo por aqui? Criar conta' : 'Já possui conta? Fazer login'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
