import React, { useState, useEffect } from 'react';
import { User } from './types/index.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { TransportRequestsView } from './components/TransportRequestsView.tsx';
import { TrucksView } from './components/TrucksView.tsx';
import { AvailabilityPlanningView } from './components/AvailabilityPlanningView.tsx';
import { TrackingMapView } from './components/TrackingMapView.tsx';
import { CompaniesView } from './components/CompaniesView.tsx';
import { UsersView } from './components/UsersView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { DriverMobileView } from './components/DriverMobileView.tsx';
import { Truck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isDriverMobileMode, setIsDriverMobileMode] = useState<boolean>(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);

  const fetchCurrentUser = () => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          // If user is DRIVER, automatically switch to mobile driver view
          if (data.user.role === 'DRIVER') {
            setIsDriverMobileMode(true);
          } else {
            setIsDriverMobileMode(false);
          }
        }
      })
      .catch((err) => console.error('Error fetching current user:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold mb-4 animate-bounce">
          <Truck className="w-6 h-6" />
        </div>
        <h1 className="text-base font-bold tracking-tight">TransLog Algérie</h1>
        <p className="text-xs text-slate-400 mt-1">Connexion à la base de données PostgreSQL Cloud SQL...</p>
      </div>
    );
  }

  // If driver mobile mode is active, display the streamlined phone-first experience
  if (isDriverMobileMode && currentUser) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
          <span>Mode Smartphone Chauffeur Routier</span>
          <button
            onClick={() => setIsDriverMobileMode(false)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-bold"
          >
            Quitter mode mobile
          </button>
        </div>
        <DriverMobileView currentUser={currentUser} onRefreshUser={fetchCurrentUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onUserChanged={fetchCurrentUser}
        onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          setIsDriverMobileMode(false);
        }}
      />

      <div className="flex-1 flex">
        {/* Desktop / Responsive Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsDriverMobileMode(false);
          }}
          userRole={currentUser?.role || 'ADMIN'}
          isDriverMobileMode={isDriverMobileMode}
          onToggleDriverMobileMode={() => setIsDriverMobileMode(!isDriverMobileMode)}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
        />

        {/* Main Workspace Content */}
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <DashboardView currentUser={currentUser} onNavigateTab={setCurrentTab} />
          )}

          {currentTab === 'requests' && (
            <TransportRequestsView currentUser={currentUser} />
          )}

          {currentTab === 'trucks' && (
            <TrucksView currentUser={currentUser} />
          )}

          {currentTab === 'availability' && (
            <AvailabilityPlanningView currentUser={currentUser} />
          )}

          {currentTab === 'map' && <TrackingMapView />}

          {currentTab === 'companies' && (
            <CompaniesView currentUser={currentUser} />
          )}

          {currentTab === 'users' && (
            <UsersView currentUser={currentUser} />
          )}

          {currentTab === 'settings' && (
            <SettingsView currentUser={currentUser} onRefreshData={fetchCurrentUser} />
          )}
        </main>
      </div>
    </div>
  );
}
