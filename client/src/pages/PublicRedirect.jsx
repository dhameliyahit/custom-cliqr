import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Radio, ExternalLink, AlertCircle, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function PublicRedirect() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');

  const [linkInfo, setLinkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(statusParam || 'loading');

  useEffect(() => {
    if (!code) {
      setStatus('not_found');
      setLoading(false);
      return;
    }

    const fetchAndRedirect = async () => {
      try {
        const { data } = await api.get(`/qr/info/${code}`);
        if (data.success && data.link) {
          setLinkInfo(data.link);

          // If link is configured and active, immediately perform redirection
          if (
            data.link.status === 'configured' &&
            data.link.redirectUrl &&
            data.link.redirectUrl.trim() !== ''
          ) {
            let target = data.link.redirectUrl.trim();
            if (!target.match(/^https?:\/\//i)) {
              target = `https://${target}`;
            }

            // Redirect smoothly
            window.location.replace(target);
            return;
          }

          if (data.link.status === 'inactive') {
            setStatus('inactive');
          } else {
            setStatus('unconfigured');
          }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setStatus('not_found');
        } else {
          setStatus('error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAndRedirect();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 animate-pulse">
          <Radio className="w-8 h-8 text-white" />
        </div>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white mb-4"></div>
        <h2 className="text-xl font-bold tracking-tight">Connecting via CustomCliq...</h2>
        <p className="text-xs text-zinc-400 mt-1 font-mono">Code: {code}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto my-auto">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-md">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-black">CustomCliq</h1>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Smart NFC Platform
            </p>
          </div>
        </div>

        {/* Card Status Container */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center">
          {status === 'unconfigured' && (
            <div>
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-black mb-1">
                NFC Tag Not Yet Activated
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                This CustomCliq smart tag is authentic and registered, but has not yet been linked to a customer destination URL.
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left mb-5">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-500 font-medium">Tag Short Code:</span>
                  <span className="font-mono font-bold text-black">{code}</span>
                </div>
                {linkInfo?.batchCode && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Batch Reference:</span>
                    <span className="font-mono text-slate-700">{linkInfo.batchCode}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Are you the owner of this card? Log in to your Admin portal to configure your business link.
              </p>
            </div>
          )}

          {status === 'inactive' && (
            <div>
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-black mb-1">Link Temporarily Paused</h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                This smart tag has been temporarily set to inactive by the administrator.
              </p>
              <div className="font-mono text-xs text-slate-400">Code: {code}</div>
            </div>
          )}

          {status === 'not_found' && (
            <div>
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-black mb-1">Unrecognized Tag</h2>
              <p className="text-xs text-slate-500 mb-5">
                This QR code or NFC card code ({code}) was not found in the CustomCliq system.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 font-medium mt-8">
        Powered by <span className="font-bold text-black">CustomCliq</span> • Smart NFC & QR Solutions
      </div>
    </div>
  );
}
