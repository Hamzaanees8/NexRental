import React from 'react';
import { DashboardIcon, FleetIcon, TripIcon, FinanceIcon, MaintenanceIcon, LogoIcon, CloseIcon, SettingsIcon } from './icons';

type View = 'dashboard' | 'fleet' | 'trips' | 'financials' | 'maintenance' | 'rentals' | 'customers' | 'affiliated' | 'drivers' | 'challans' | 'settings' | 'import';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, onClose }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'fleet', label: 'Fleet Management', icon: <FleetIcon /> },
    { id: 'rentals', label: 'Rental Management', icon: <TripIcon /> },
    { id: 'financials', label: 'Financials', icon: <FinanceIcon /> },
    { id: 'maintenance', label: 'Maintenance', icon: <MaintenanceIcon /> },
    { id: 'customers', label: 'Customers', icon: <span className="font-bold text-lg">C</span> }, // Placeholder icon
    { id: 'affiliated', label: 'Affiliated', icon: <span className="font-bold text-lg">A</span> }, // Placeholder icon
    { id: 'drivers', label: 'Drivers', icon: <span className="font-bold text-lg">D</span> }, // Placeholder icon
    { id: 'challans', label: 'Traffic Challans', icon: <span className="font-bold text-lg">T</span> }, // Placeholder icon
    { id: 'import', label: 'Import Data', icon: <span className="font-bold text-lg">I</span> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    onClose(); // Close sidebar on mobile after clicking a link
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-md
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-20 px-6 border-b">
          <div className="flex items-center">
            <LogoIcon className="h-8 w-auto text-indigo-600" />
            <h1 className="text-xl font-bold ml-2">FleetOps</h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100"
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul>
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id as View)}
                  className={`flex items-center w-full px-4 py-3 my-1 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer
                    ${currentView === item.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <span className="mr-3 w-6 text-center">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t">
          <p className="text-xs text-slate-500 text-center">© 2024 FleetOps Inc.</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
