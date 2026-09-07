import { Link, useLocation } from 'react-router-dom';
import { QrCode, Users, Layers, Settings, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { user, isSuperAdmin, logout } = useAuth();

  const navItems = [
    {
      name: 'QR Gen',
      path: '/',
      icon: QrCode,
      show: true,
    },
    {
      name: 'Batches',
      path: '/batches',
      icon: Layers,
      show: isSuperAdmin,
    },
    {
      name: 'Admins',
      path: '/admins',
      icon: Users,
      show: isSuperAdmin,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      show: isSuperAdmin,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between overflow-y-auto shrink-0 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
            <Link to="/" className="flex items-center gap-3 group cursor-pointer" onClick={() => onClose && onClose()}>
              <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-black leading-none">
                  CustomCliq
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                  Smart QR Platform
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-black p-1 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => onClose && onClose()}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-100 text-black border-l-4 border-black font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-black hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-black' : 'text-slate-500'
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* User Footer Card */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-black truncate">{user?.name || 'User'}</p>
                <span className="inline-block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-200 rounded-md cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
