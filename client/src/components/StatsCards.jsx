import { QrCode, CheckCircle2, PackageCheck, Activity, Users, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StatsCards({ stats }) {
  const { isSuperAdmin } = useAuth();

  if (!stats) return null;

  const superAdminCards = [
    {
      label: 'Total QRs Generated',
      value: stats.totalGenerated ?? 0,
      icon: QrCode,
      desc: 'All batches combined',
    },
    {
      label: 'Assigned to Admins',
      value: stats.assignedCount ?? 0,
      icon: Users,
      desc: `${stats.unassignedCount ?? 0} unassigned available`,
    },
    {
      label: 'Configured / Active',
      value: stats.configuredCount ?? 0,
      icon: CheckCircle2,
      desc: 'Active customer cards',
    },
    {
      label: 'Total Scans & Taps',
      value: stats.totalScans ?? 0,
      icon: Activity,
      desc: 'NFC and QR interactions',
    },
  ];

  const adminCards = [
    {
      label: 'My Assigned QRs',
      value: stats.totalAssigned ?? 0,
      icon: PackageCheck,
      desc: 'Total cards in inventory',
    },
    {
      label: 'Configured / Sold',
      value: stats.configuredCount ?? 0,
      icon: CheckCircle2,
      desc: 'Active customer redirects',
    },
    {
      label: 'Available to Sell',
      value: stats.availableCount ?? 0,
      icon: QrCode,
      desc: 'Ready for new customers',
    },
    {
      label: 'Customer Scans',
      value: stats.totalScans ?? 0,
      icon: Activity,
      desc: 'Total visitor taps & scans',
    },
  ];

  const cards = isSuperAdmin ? superAdminCards : adminCards;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-black/30 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-black">
              {Number(card.value).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
              {card.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}
