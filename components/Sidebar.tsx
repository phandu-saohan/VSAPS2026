import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { LogoutIcon } from './icons/LogoutIcon';
import { BrandIcon } from './icons/BrandIcon';
import { XIcon } from './icons/XIcon';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { logout, hasPermission } = useAuth();
  
  const visibleNavItems = NAV_ITEMS.filter(item => !item.permission || hasPermission(item.permission));

  return (
    <aside className={`w-64 bg-white text-gray-800 flex flex-col flex-shrink-0 border-r border-gray-200 transition-transform duration-300 ease-in-out z-40
      fixed inset-y-0 left-0 lg:relative lg:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <BrandIcon className="w-8 h-8 text-secondary" />
          <span className="text-xl font-semibold text-gray-800">VSAPS 2026</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-800">
          <XIcon className="w-6 h-6" />
        </button>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            end={item.href === '/'}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `group flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ease-out transform-gpu ${
                isActive
                  ? 'bg-secondary text-white shadow-[0_12px_28px_rgba(235,36,142,0.28)] ring-1 ring-secondary/25 scale-[1.01]'
                  : 'text-gray-600 hover:bg-secondary-light hover:text-secondary hover:translate-x-1 hover:shadow-sm'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-secondary'}`}>
                  {item.icon}
                </span>
                <span className="ml-3 tracking-wide">{item.label}</span>
                {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-white/90" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogoutIcon className="w-5 h-5" />
          <span className="ml-3">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
