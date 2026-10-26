import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getReportByShareToken } from '../services/dbService';
import { Report } from '../types';
import { Layers, Loader2 } from 'lucide-react';

const SharePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('t');
    if (token) {
      const r = getReportByShareToken(token);
      setReport(r || null);
    }
    setLoading(false);
  }, [searchParams]);

  if (loading)
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="animate-spin text-muted" />
      </div>
    );

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-text">
        <div className="text-muted mb-4">Thesis not found or link expired.</div>
        <Link to="/" className="text-accent hover:underline">
          Go to StrucDNA
        </Link>
      </div>
    );
  }

  const lockedDate = report.thesis_locked_at
    ? new Date(report.thesis_locked_at).toLocaleDateString()
    : 'Unknown';

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-[500px]">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-8 opacity-60">
          <Layers className="w-5 h-5 text-accent" />
          <span className="font-semibold tracking-tight">StrucDNA</span>
        </div>

        {/* Card */}
        <div className="bg-surface-2 border border-border rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-accent opacity-20"></div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-accent mb-1">
                {report.ticker}
              </h1>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">
                Locked {lockedDate}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-positive">
                {report.classification}
              </div>
              <div className="text-xs font-mono text-muted">
                Integrity {report.scores_at_lock?.integrity_score.toFixed(0)}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-[10px] font-mono text-muted uppercase mb-2">
                The Structural Case
              </div>
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                {report.thesis_for}
              </p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted uppercase mb-2">
                Exit Condition
              </div>
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                {report.thesis_exit_condition}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border-2 flex justify-between items-center">
            <span className="text-[10px] font-mono text-muted">
              Powered by StrucDNA
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-block bg-accent text-bg px-6 py-3 rounded-lg font-bold text-sm hover:bg-white transition-colors"
          >
            Run your own structural analysis →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
