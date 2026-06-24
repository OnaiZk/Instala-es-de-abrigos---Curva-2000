import React, { useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { UserRole } from '../types';
import { ShieldCheck, ArrowLeft, Mail, Lock, Loader2, User as UserIcon, Briefcase, RefreshCw } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: (session: any) => void;
}

type AuthMode = 'login' | 'register' | 'verify';

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<string>('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [verifySuccess, setVerifySuccess] = useState(false);

    // Recovery of email if page refreshes during verification
    React.useEffect(() => {
        const savedEmail = localStorage.getItem('pending_verification_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setMode('verify');
            localStorage.setItem('active_portal', 'internal');
        }
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
                    setError('Conta verificada com sucesso! Por favor, faça o login.');
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

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row font-sans overflow-hidden">
            {/* Esquerda - Branding (Estilo Devialet: Limpo, Texto Gigante, Elegante) */}
            <div className="w-full md:w-1/2 flex flex-col justify-center px-10 py-16 md:p-24 relative z-10 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-white to-slate-50 opacity-50"></div>
                    {/* Elemento gráfico abstrato super sutil no fundo simulando uma onda sonora/tela */}
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

            {/* Direita - Formulário de Login (Minimalista) */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-20 bg-[#FAFAFA] relative">
                <div className="w-full max-w-md bg-white p-10 md:p-14 rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.04)] border border-slate-100 relative z-10">

                    {mode === 'verify' && (
                        <button
                            onClick={() => setMode('register')}
                            className="group flex items-center gap-2 font-bold text-xs uppercase tracking-[0.1em] text-slate-400 hover:text-primary transition-colors mb-8"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            Voltar
                        </button>
                    )}

                    <div className="mb-10">
                        <h2 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase mb-2">
                            {mode === 'login' ? 'Acesso' : (mode === 'register' ? 'Criar Conta' : 'Verificação')}
                        </h2>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            {mode === 'login' ? 'Insira suas credenciais' : (mode === 'register' ? 'Solicite seu acesso' : 'Confirme seu e-mail')}
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
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Senha</label>
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 mt-4 rounded-[16px] font-black text-[11px] uppercase tracking-[0.2em] text-white bg-black hover:bg-primary transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                mode === 'login' ? 'Entrar' : (mode === 'register' ? 'Concluir' : 'Confirmar')
                            )}
                        </button>
                    </form>

                    {mode !== 'verify' && (
                        <div className="text-center mt-8 pt-6 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    setError(null);
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
