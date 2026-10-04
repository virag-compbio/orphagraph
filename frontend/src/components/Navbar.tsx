import React from 'react';
import { 
  Network, 
  FileText, 
  GitFork, 
  FlaskConical, 
  Bot, 
  Sparkles, 
  UserCheck, 
  Microscope, 
  HeartHandshake, 
  Stethoscope,
  Activity,
  Compass,
  Zap
} from 'lucide-react';
import { PersonaType, ViewTab, GraphStats } from '../types';

interface NavbarProps {
  currentTab: ViewTab;
  setTab: (tab: ViewTab) => void;
  currentPersona: PersonaType;
  setPersona: (persona: PersonaType) => void;
  stats?: GraphStats;
  onOpenPathfinder: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  currentPersona,
  setPersona,
  stats,
  onOpenPathfinder
}) => {
  const personas: { id: PersonaType; label: string; name: string; icon: any; color: string; desc: string }[] = [
    { id: 'maria', name: 'Maria', label: 'Maria (Patient Leader)', icon: HeartHandshake, color: 'text-pink-600 border-pink-200 bg-pink-50', desc: 'Assembles families, finds reusable assets, and drafts proposals' },
    { id: 'devon', name: 'Devon', label: 'Devon (Caregiver)', icon: UserCheck, color: 'text-emerald-600 border-emerald-200 bg-emerald-50', desc: '2 a.m. searcher needing exact community & clear next steps' },
    { id: 'priya', name: 'Priya', label: 'Priya (Biotech Scout)', icon: Stethoscope, color: 'text-cyan-600 border-cyan-200 bg-cyan-50', desc: 'Evaluates therapeutic mechanisms against addressable disease clusters' },
    { id: 'dr_osei', name: 'Dr. Osei', label: 'Dr. Osei (Scientist)', icon: Microscope, color: 'text-blue-600 border-blue-200 bg-blue-50', desc: 'Finds colleagues working on same mechanism across different genes' },
  ];

  const tabs: { id: ViewTab; label: string; icon: any }[] = [
    { id: 'journey', label: "Maria's Journey", icon: Compass },
    { id: 'graph', label: 'Knowledge Graph', icon: Network },
    { id: 'dossier', label: 'Action Dossiers', icon: FileText },
    { id: 'moonshot', label: '10× Moonshot', icon: Zap },
    { id: 'silos', label: 'Silo Breaker', icon: GitFork },
    { id: 'trials', label: 'Trials & Assets', icon: FlaskConical },
    { id: 'chat', label: 'AI Copilot', icon: Bot },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      {/* Top Bar: Brand & Mission */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center shadow-sm">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-800">
              Orphagraph <span className="text-emerald-600">Atlas</span>
            </span>
            <p className="text-xs text-slate-500 hidden sm:block">
              An evidence-backed knowledge graph for rare diseases
            </p>
          </div>
        </div>

        {/* Persona Switcher, Global Action Tools & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
        {/* Persona Switcher */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 hidden lg:inline">
            Persona:
          </span>
          {personas.map((p) => {
            const Icon = p.icon;
            const isSelected = currentPersona === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                title={p.desc}
                className={`flex items-center space-x-1.5 whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  isSelected
                    ? p.color
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-slate-50/40'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{p.name}</span>
              </button>
            );
          })}
          </div>
          <button
            onClick={onOpenPathfinder}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-cyan-700 border border-cyan-200 transition-colors shadow-sm"
            title="Find mechanistic biological chain between any two entities"
          >
            <GitFork className="h-3.5 w-3.5 text-cyan-600" />
            <span>Trace Path</span>
          </button>

          {stats && (
            <div className="hidden xl:flex items-center space-x-2 text-xs bg-slate-50/80 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
              <span className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-slate-900">{stats.monogenic_diseases}</span>
                <span className="text-slate-500">Diseases</span>
              </span>
              <span className="text-slate-300">|</span>
              <span><strong className="text-emerald-600">{stats.repurposing_drugs}</strong> Leads</span>
              <span className="text-slate-300">|</span>
              <span><strong className="text-yellow-700">{stats.research_assets}</strong> Assets</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub Bar: Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200 py-2">
        {/* View Tabs */}
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
};
