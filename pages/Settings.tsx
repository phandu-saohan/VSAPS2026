import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { UsersIcon } from '../components/icons/UsersIcon';
import { MailIcon } from '../components/icons/MailIcon';
import { MessageIcon } from '../components/icons/MessageIcon';
import { ApiIcon } from '../components/icons/ApiIcon';
import { useAuth } from '../App';

// Simple globe icon inline
const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const settingsNav = [
    { name: 'Quản lý vai trò', href: '/settings/roles', icon: UsersIcon },
    { name: 'Mẫu Email', href: '/settings/templates', icon: MailIcon },
    { name: 'Cài đặt Email', href: '/settings/email', icon: MailIcon },
    { name: 'Cài đặt Zalo', href: '/settings/zalo', icon: MessageIcon },
    { name: 'Tích hợp Abitstore', href: '/settings/abitstore', icon: ApiIcon },
    { name: 'Trang Giới thiệu', href: '/settings/landing', icon: GlobeIcon },
];

const AccessDenied: React.FC = () => (
    <div>
        <h1 className="text-3xl font-bold text-red-600">Truy cập bị từ chối</h1>
        <p className="mt-2 text-gray-600">Bạn không có quyền xem trang này.</p>
    </div>
);

const Settings: React.FC = () => {
    const { hasPermission } = useAuth();
    
    if (!hasPermission('settings:view')) {
        return <AccessDenied />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Cài đặt hệ thống</h1>
            <p className="mt-2 text-gray-600">Quản lý cấu hình chung cho ứng dụng.</p>

            <div className="flex flex-col lg:flex-row mt-8 gap-8">
                <aside className="lg:w-1/4">
                    <nav className="space-y-1">
                        {settingsNav.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                className={({ isActive }) =>
                                    `group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                        isActive
                                            ? 'bg-secondary-light text-secondary'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon
                                            className={`mr-3 h-6 w-6 flex-shrink-0 ${
                                                isActive ? 'text-secondary' : 'text-gray-400 group-hover:text-gray-500'
                                            }`}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{item.name}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 bg-white p-6 rounded-lg shadow">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Settings;
