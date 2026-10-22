import React, { useState, useEffect } from 'react';
import { User, NotificationItem } from '../types/index.ts';
import { setActiveUserUid } from '../lib/api-client.ts';
import { formatDateTimeFR } from '../lib/date-utils.ts';
import {
  Truck,
  Bell,
  User as UserIcon,
  ChevronDown,
  Building,
  CheckCircle2,
  Shield,
  Layers,
  LogOut,
  X,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onUserChanged: () => void;
  onToggleSidebar?: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChanged,
  onToggleSidebar,
  onNavigateTab,
}) => {
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    fetch('/api/auth/demo-users')
      .then((r) => r.json())
      .then((data: User[]) => setDemoUsers(data))
      .catch((err) => console.error(err));

    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data: NotificationItem[]) => setNotifications(data))
      .catch((err) => console.error(err));
  }, [currentUser]);

  const handleSelectDemoUser = (user: User) => {
    setActiveUserUid(user.uid);
    setShowRoleMenu(false);
    onUserChanged();
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Mobile Menu */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => onNavigateTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">TransLog Algérie</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Fret National
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Gestion & Suivi du Transport de Marchandises
              </p>
            </div>
          </div>
        </div>

        {/* Right: Role Switcher & Notifications & User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-slate-400">Rôle Actif :</span>
              <span className="font-bold text-amber-300">{currentUser?.role || 'ADMIN'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Role switch Dropdown */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Basculer de Rôle & Compte de Test
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Testez instantanément les vues Administrateur, Clients, Transporteurs et Chauffeurs.
                  </p>
                </div>

                <div className="max-h-72 overflow-y-auto py-1">
                  {demoUsers.map((u) => {
                    const isSelected = currentUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelectDemoUser(u)}
                        className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                          isSelected ? 'bg-amber-50 text-amber-950 font-bold' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{u.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : u.role === 'CLIENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : u.role === 'CARRIER'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[220px]">
                            {u.company ? u.company.name : 'Direction TransLog'}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Centre de notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in">
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs">Notifications Opérationnelles</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{unreadCount} non lues</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`p-3 text-xs transition cursor-pointer hover:bg-slate-50 ${
                        !n.read ? 'bg-amber-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTimeFR(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1">{n.message}</p>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Aucune notification pour le moment.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-white block leading-tight">
                {currentUser?.name || 'Utilisateur'}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                {currentUser?.company?.name || 'TransLog Algérie'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
