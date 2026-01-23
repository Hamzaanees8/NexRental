import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import FleetView from './views/FleetView';
import TripsView from './views/TripsView';
import FinancialsView from './views/FinancialsView';
import MaintenanceView from './views/MaintenanceView';
import RentalsView from './views/RentalsView';

import CustomersView from './views/CustomersView';
import DriversView from './views/DriversView';

type View = 'dashboard' | 'fleet' | 'trips' | 'financials' | 'maintenance' | 'rentals' | 'customers' | 'drivers';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

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
      case 'customers':
        return <CustomersView />;
      case 'drivers':
        return <DriversView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 overflow-y-auto p-8">
        {renderView()}
      </main>
    </div>
  );
};

export default App;