import React from 'react';
import { DashboardIcon, FleetIcon, TripIcon, FinanceIcon, MaintenanceIcon, LogoIcon } from './icons';

type View = 'dashboard' | 'fleet' | 'trips' | 'financials' | 'maintenance';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'fleet', label: 'Fleet Management', icon: <FleetIcon /> },
    { id: 'trips', label: 'Trip Management', icon: <TripIcon /> },
    { id: 'financials', label: 'Financials', icon: <FinanceIcon /> },
    { id: 'maintenance', label: 'Maintenance', icon: <MaintenanceIcon /> },
  ];

  return (
    <aside className="w-64 bg-white shadow-md flex flex-col">
      <div className="flex items-center justify-center h-20 border-b">
        <LogoIcon className="h-8 w-auto text-indigo-600" />
        <h1 className="text-xl font-bold ml-2">FleetOps</h1>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setCurrentView(item.id as View)}
                className={`flex items-center w-full px-4 py-3 my-1 text-sm font-medium rounded-lg transition-colors duration-200
                  ${
                    currentView === item.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-slate-500">© 2024 FleetOps Inc.</p>
      </div>
    </aside>
  );
};

export default Sidebar;