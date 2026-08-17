import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import FleetView from './views/FleetView';
import TripsView from './views/TripsView';
import FinancialsView from './views/FinancialsView';
import MaintenanceView from './views/MaintenanceView';
import RentalsView from './views/RentalsView';
import ChallansView from './views/ChallansView';
import { MenuIcon, LogoIcon } from './components/icons';

import CustomersView from './views/CustomersView';
import DriversView from './views/DriversView';
import SettingsView from './views/SettingsView';
import ImportView from './views/ImportView';
import VehicleROIView from './views/VehicleROIView';
import { Toaster } from 'react-hot-toast';
import { AIVoiceAssistant } from './components/AIVoiceAssistant';
type View = 'dashboard' | 'fleet' | 'trips' | 'financials' | 'maintenance' | 'rentals' | 'customers' | 'affiliated' | 'drivers' | 'challans' | 'settings' | 'import' | 'roi';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView setCurrentView={setCurrentView} />;
      case 'fleet':
        return <FleetView />;
      case 'trips':
        return <TripsView />;
      case 'financials':
        return <FinancialsView />;
      case 'rentals':
        return <RentalsView />;
      case 'maintenance':
        return <MaintenanceView />;
      case 'challans':
        return <ChallansView />;
      case 'customers':
        return <CustomersView />;
      case 'affiliated':
        return <CustomersView mode="affiliated" />;
      case 'drivers':
        return <DriversView />;
      case 'settings':
        return <SettingsView />;
      case 'import':
        return <ImportView />;
      case 'roi':
        return <VehicleROIView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" />
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b h-16 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center">
            <LogoIcon className="h-8 w-auto text-indigo-600" />
            <span className="ml-2 font-bold text-lg">FleetOps</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md text-slate-500 hover:bg-slate-100"
          >
            <MenuIcon />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
      
      <AIVoiceAssistant />
    </div>
  );
};

export default App;