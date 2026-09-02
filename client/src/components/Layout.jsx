import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'QR Gen & Links';
      case '/batches':
        return 'Batch Management';
      case '/admins':
        return 'Admins & Resellers';
      case '/settings':
        return 'Domain & System Settings';
      default:
        return 'CustomCliq Dashboard';
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col lg:flex-row">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#09090b',
            color: '#ffffff',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            border: '1px solid #27272a',
          },
        }}
      />

      {/* Sidebar - Fixed height with independent scroll */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Viewport - Independent scroll */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          title={getPageTitle()}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
