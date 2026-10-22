import React from 'react';
import { UserRole } from '../types/index.ts';
import {
  LayoutDashboard,
  Truck,
  Calendar,
  MapPin,
  ClipboardList,
  Building2,
  Users,
  Settings,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  isDriverMobileMode: boolean;
  onToggleDriverMobileMode: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  isDriverMobileMode,
  onToggleDriverMobileMode,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'CLIENT', 'CARRIER', 'DRIVER'],
    },
    {
      id: 'requests',
      label: 'Demandes & Réservations',
      icon: ClipboardList,
      roles: ['ADMIN', 'CLIENT', 'CARRIER', 'DRIVER'],
    },
    {
      id: 'trucks',
      label: 'Flotte de Camions',
      icon: Truck,
      roles: ['ADMIN', 'CLIENT', 'CARRIER'],
    },
    {
      id: 'availability',
      label: 'Planning des Disponibilités',
      icon: Calendar,
      roles: ['ADMIN', 'CLIENT', 'CARRIER'],
    },
    {
      id: 'map',
      label: 'Carte & Suivi en Direct',
      icon: MapPin,
      roles: ['ADMIN', 'CLIENT', 'CARRIER', 'DRIVER'],
    },
    {
      id: 'companies',
      label: 'Entreprises Partenaires',
      icon: Building2,
      roles: ['ADMIN'],
    },
    {
      id: 'users',
      label: 'Utilisateurs & Chauffeurs',
      icon: Users,
      roles: ['ADMIN'],
    },
    {
      id: 'settings',
      label: 'Paramètres & Tests',
      icon: Settings,
      roles: ['ADMIN', 'CLIENT', 'CARRIER', 'DRIVER'],
    },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-4 transition-transform lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6 px-3">
          {/* Driver UI toggle button */}
          <div className="px-2">
            <button
              onClick={onToggleDriverMobileMode}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                isDriverMobileMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Mode Chauffeur Mobile
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  isDriverMobileMode ? 'bg-slate-950 text-white' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isDriverMobileMode ? 'ACTIF' : 'TEST'}
              </span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 block mb-2">
              Menu Opérationnel
            </span>
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id && !isDriverMobileMode;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Info */}
        <div className="px-5 text-[11px] text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">Algérie TransLog v1.0</p>
          <p className="text-[10px]">Cloud SQL • PostgreSQL • 58 Wilayas</p>
        </div>
      </aside>
    </>
  );
};
