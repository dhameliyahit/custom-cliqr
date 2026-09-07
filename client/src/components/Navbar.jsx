import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  User,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Info,
  CheckCheck,
  QrCode,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onOpenMobileSidebar, title = 'QR Generation & Links' }) {
  const { user, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDomainTooltip, setShowDomainTooltip] = useState(false);

  // Dynamic system notifications state
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: isSuperAdmin ? 'Dynamic QR Engine Online' : 'QR Management System Active',
      message: isSuperAdmin
        ? 'All scanned QR codes are resolving dynamically.'
        : 'All assigned QR codes are active and ready for configuration.',
      time: 'Just now',
      read: false,
      type: 'system',
    },
    {
      id: 2,
      title: isSuperAdmin ? 'Ready for QR Generation' : 'Admin Panel Ready',
      message: isSuperAdmin
        ? 'Click "Generate QRs" to create new batches for QR printing.'
        : 'Configure your assigned tags with business details & redirect links.',
      time: '10m ago',
      read: false,
      type: 'action',
    },
    {
      id: 3,
      title: 'Auto-Renew Token Active',
      message: 'Silent refresh login is active. Your session stays authenticated automatically.',
      time: '1h ago',
      read: true,
      type: 'auth',
    },
  ]);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-black hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-black tracking-tight">
            {title}
          </h1>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-black text-white uppercase tracking-wider">
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Dynamic Domain Indicator with interactive tooltip (SuperAdmin only) */}
        {isSuperAdmin && (
          <div className="relative hidden md:block">
            <button
              onMouseEnter={() => setShowDomainTooltip(true)}
              onMouseLeave={() => setShowDomainTooltip(false)}
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 hover:border-black rounded-md text-xs font-medium text-slate-700 cursor-pointer transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Dynamic Engine</span>
              <Info className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showDomainTooltip && (
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-black text-white text-[11px] rounded-xl shadow-2xl z-50 pointer-events-none animate-fade-in border border-zinc-800 whitespace-normal break-words leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5 text-white">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Dynamic QR Base Domain</span>
                </p>
                <p className="text-zinc-300 leading-relaxed">
                  QR links adapt to your domain automatically. Super Admin can override this in Settings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Working Interactive Notifications Icon & Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-black hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
            title="Notifications & System Activity"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-black rounded-full ring-2 ring-white flex items-center justify-center text-[8px] font-bold text-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-black" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">
                    Notifications ({unreadCount} new)
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-bold text-slate-500 hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 hover:bg-slate-50 transition-colors flex gap-3 ${
                      !notif.read ? 'bg-slate-50/60' : ''
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-black mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-black truncate">{notif.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-medium">
                  CustomCliq Smart QR Alert System
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 pl-2 hover:bg-slate-100 rounded-full border border-slate-200 cursor-pointer transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-black max-w-[120px] truncate">
              {user?.name || 'Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-black truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-semibold uppercase text-slate-600">
                    {user?.role === 'superadmin' ? 'Super Admin Access' : 'Reseller Admin'}
                  </span>
                </div>
              </div>

              <div className="py-1">
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <span>System Settings</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
