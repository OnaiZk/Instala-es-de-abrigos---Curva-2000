import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Sun, CloudRain, Cloud, CloudLightning, Clock, AlertTriangle, 
  ArrowRight, CheckCircle2, ShieldCheck, 
  MapPin, Calendar, Activity, Smartphone, Car, 
  ListTodo, Users, Sparkles
} from 'lucide-react';

interface HomeViewProps {
  currentUser: User;
  setActiveTab: (tab: any) => void;
  isPartner: boolean;
  usersCount: number;
  teamsCount: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ currentUser, setActiveTab, isPartner, usersCount, teamsCount }) => {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<'centro' | 'sul' | 'leste' | 'oeste'>('centro');

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Regional weather info for São Paulo
  const regionWeather = {
    centro: { temp: '22°C', cond: 'Ensolarado', icon: <Sun className="text-amber-500 animate-spin" style={{ animationDuration: '20s' }} size={28} />, rec: 'Condições excelentes para instalações e manutenções externas.' },
    sul: { temp: '19°C', cond: 'Chuva Leve', icon: <CloudRain className="text-blue-400 animate-bounce" size={28} />, rec: 'Atenção redobrada com trabalhos em altura e equipamentos elétricos.' },
    leste: { temp: '21°C', cond: 'Parcialmente Nublado', icon: <Cloud className="text-slate-400" size={28} />, rec: 'Operações sem restrições. Aproveite o clima favorável para inspeções gerais.' },
    oeste: { temp: '20°C', cond: 'Possibilidade de Garoa', icon: <CloudLightning className="text-purple-400" size={28} />, rec: 'Mantenha as capas protetoras de painéis e ferramentas de prontidão.' }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-10 animate-in fade-in duration-500">
      
      {/* 1. Header Banner Area */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-700/30">
        {/* Decorative dynamic circles */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none translate-x-20 -translate-y-20"></div>
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none translate-y-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-primary-300 w-fit">
              <Sparkles size={12} className="text-primary animate-pulse" />
              Painel Operacional SP
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 font-black">{currentUser.name}</span>!
            </h2>
            <p className="text-slate-300 text-sm md:text-base max-w-xl font-medium">
              Bem-vindo ao sistema de campo. Acesse as ferramentas de controle de equipe e relatórios diários de forma simplificada.
            </p>
          </div>

          {/* Clock Widget */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 self-stretch md:self-auto justify-between md:justify-start min-w-[240px]">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Clock size={10} /> Hora de Brasília
              </span>
              <span className="text-2xl font-mono font-bold text-white tracking-widest mt-1">
                {time || '--:--:--'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 truncate font-medium max-w-[170px]">
                {dateStr}
              </span>
            </div>
            <div className="p-3 bg-primary/20 rounded-xl text-primary border border-primary/20">
              <Activity size={24} className="animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Operational Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* KPI 1: Relatório Diário */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5 duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Relatório Diário</span>
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <ListTodo size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-800">Lançamento</span>
            <p className="text-xs text-slate-500 mt-1 font-medium">Controle de equipes diárias</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-primary transition-colors cursor-pointer" onClick={() => setActiveTab('daily_report')}>
            Lançar relatório diário
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* KPI 2: Funcionários */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5 duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Funcionários</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-800">{usersCount}</span>
              <span className="text-xs font-semibold text-slate-400">cadastrados</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Gestão de colaboradores ativos</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-emerald-600 transition-colors cursor-pointer" onClick={() => setActiveTab('funcionarios')}>
            Ver funcionários
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* KPI 3: Controle de Frota (Somente se não for parceiro) */}
        {!isPartner ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Frota</span>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Car size={20} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-800">Controle</span>
              <p className="text-xs text-slate-500 mt-1 font-medium">Gestão de veículos operacionais</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => setActiveTab('veiculos')}>
              Gerenciar veículos
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-center items-center shadow-sm text-center border-dashed">
            <Users size={24} className="text-slate-300 mb-2" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acesso de Parceiro</span>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[160px]">Acesso restrito para controle interno da concessionária</p>
          </div>
        )}

        {/* KPI 4: Gestão de OPEC (Somente se não for parceiro) */}
        {!isPartner ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Gestão de OPEC</span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                <Smartphone size={20} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-800">OPEC</span>
              <p className="text-xs text-slate-500 mt-1 font-medium">Veiculação de mídia em abrigos</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-purple-600 transition-colors cursor-pointer" onClick={() => setActiveTab('opec')}>
              Checar campanhas
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-center items-center shadow-sm text-center border-dashed">
            <Smartphone size={24} className="text-slate-300 mb-2" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acesso de Parceiro</span>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[160px]">Painel de campanhas reservado à equipe matriz</p>
          </div>
        )}

      </div>

      {/* 3. Weather & Safety Widget */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left: Weather forecast switcher */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Condição de Campo (Clima)</h3>
              <p className="text-xs text-slate-400 font-medium">Consulte as condições climáticas e alertas por região de São Paulo</p>
            </div>

            {/* Region Tabs switcher */}
            <div className="grid grid-cols-4 bg-slate-55 bg-slate-50 p-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center text-slate-500 select-none">
              {(['centro', 'sul', 'leste', 'oeste'] as const).map(reg => (
                <div 
                  key={reg}
                  onClick={() => setSelectedRegion(reg)}
                  className={`py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${selectedRegion === reg ? 'bg-white text-primary shadow-sm font-black' : 'hover:text-slate-800'}`}
                >
                  {reg}
                </div>
              ))}
            </div>

            {/* Region Weather Display Box */}
            <div className="flex items-center gap-4 bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-2xl p-4 shadow-inner relative overflow-hidden group">
              <div className="absolute right-3 top-3 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                {regionWeather[selectedRegion].icon}
              </div>
              
              <div className="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                {regionWeather[selectedRegion].icon}
              </div>
              
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-800 tracking-tight">{regionWeather[selectedRegion].temp}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{regionWeather[selectedRegion].cond}</span>
              </div>
            </div>

            {/* Dynamic Directive */}
            <div className="flex gap-3 bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-amber-900 text-xs">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-amber-800">Alerta Técnico ({selectedRegion.toUpperCase()}):</span>
                <p className="leading-relaxed text-amber-700 font-medium">
                  {regionWeather[selectedRegion].rec}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Safety Protocols & Best Practices */}
          <div className="flex flex-col gap-4 justify-between">
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Protocolo de Segurança em Campo</h3>
              <p className="text-xs text-slate-400 font-medium">Recomendações fundamentais para todas as equipes de operação externa</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-colors">
                <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Equipamento de Proteção Individual</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">Uso contínuo e obrigatório de botas, luvas adequadas, óculos e capacete com jugular em todas as frentes de trabalho.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-colors">
                <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Sinalização e Cones</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">Toda intervenção em via pública necessita da implantação imediata de cones reflexivos para garantir a segurança dos técnicos e de pedestres.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between items-center">
              <span>Matriz SP • Eletromidia Concessão</span>
              <span>V. 1.2.0</span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Shortcuts Grid */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Navegação Rápida</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <button 
            onClick={() => setActiveTab('daily_report')} 
            className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 hover:bg-primary-50 border border-slate-100 hover:border-primary-200 rounded-3xl transition-all duration-300 group shadow-sm hover:shadow"
          >
            <div className="p-3 bg-white rounded-2xl text-slate-600 group-hover:text-primary transition-colors shadow-sm">
              <ListTodo size={20} />
            </div>
            <span className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">Relatório Diário</span>
          </button>

          <button 
            onClick={() => setActiveTab('funcionarios')} 
            className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 hover:bg-primary-50 border border-slate-100 hover:border-primary-200 rounded-3xl transition-all duration-300 group shadow-sm hover:shadow"
          >
            <div className="p-3 bg-white rounded-2xl text-slate-600 group-hover:text-primary transition-colors shadow-sm">
              <Users size={20} />
            </div>
            <span className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">Funcionários</span>
          </button>

          {!isPartner ? (
            <button 
              onClick={() => setActiveTab('opec')} 
              className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 hover:bg-primary-50 border border-slate-100 hover:border-primary-200 rounded-3xl transition-all duration-300 group shadow-sm hover:shadow"
            >
              <div className="p-3 bg-white rounded-2xl text-slate-600 group-hover:text-primary transition-colors shadow-sm">
                <Smartphone size={20} />
              </div>
              <span className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">Gestão de OPEC</span>
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-6 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-center opacity-60">
              <Smartphone size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">OPEC Restrito</span>
            </div>
          )}

          {!isPartner ? (
            <button 
              onClick={() => setActiveTab('veiculos')} 
              className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 hover:bg-primary-50 border border-slate-100 hover:border-primary-200 rounded-3xl transition-all duration-300 group shadow-sm hover:shadow"
            >
              <div className="p-3 bg-white rounded-2xl text-slate-600 group-hover:text-primary transition-colors shadow-sm">
                <Car size={20} />
              </div>
              <span className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">Controle de Frota</span>
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-6 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-center opacity-60">
              <Car size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Frota Restrita</span>
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
};
