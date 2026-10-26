import React, { useState } from 'react';
import { Report } from '../types';
import { saveThesisLock, generateShareToken } from '../services/dbService';
import { Lock, Share2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface ThesisLockProps {
  report: Report;
  isPaid: boolean;
  onLock: () => void;
}

const ThesisLock: React.FC<ThesisLockProps> = ({ report, isPaid, onLock }) => {
  const [formData, setFormData] = useState({
    thesis_for: '',
    thesis_risk_accepted: '',
    thesis_exit_condition: '',
    exit_is_structural: false,
  });
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  if (!isPaid) {
    return (
      <div className="mt-8 text-center text-xs text-muted">
        <p style={{ fontSize: '12px', color: '#8A8A8A', marginTop: '24px' }}>
          Pro users can lock a thesis and track if it breaks.{' '}
          <a href="#" style={{ color: '#8A8A8A', textDecoration: 'underline' }}>
            Upgrade to Pro
          </a>
        </p>
      </div>
    );
  }

  const isLocked = !!report.thesis_locked_at;

  const handleShare = () => {
    let token = report.share_token;
    if (!token) {
      token = generateShareToken(report.id);
    }
    const url = `${window.location.origin}/#/share?t=${token}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url);
    toast.success('Public link copied to clipboard');
  };

  if (isLocked) {
    return (
      <div className="mt-8 bg-surface-3 border border-border-2 rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="text-[11px] font-mono font-bold text-muted uppercase">
            Thesis Lock
          </div>
          <div className="flex items-center gap-4">
            {report.exit_is_structural && (
              <span className="text-[10px] font-mono text-positive bg-positive/10 px-2 py-0.5 rounded">
                Structural exit
              </span>
            )}
            <div className="text-[11px] font-mono text-muted uppercase">
              Locked {report.thesis_locked_at?.substring(0, 10)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-b border-border-2 pb-3 last:border-0 last:pb-0">
            <div className="text-[11px] font-mono text-muted uppercase mb-1">
              Case For
            </div>
            <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">
              {report.thesis_for}
            </div>
          </div>
          <div className="border-b border-border-2 pb-3 last:border-0 last:pb-0">
            <div className="text-[11px] font-mono text-muted uppercase mb-1">
              Risk Accepted
            </div>
            <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">
              {report.thesis_risk_accepted}
            </div>
          </div>
          <div className="border-b border-border-2 pb-3 last:border-0 last:pb-0">
            <div className="text-[11px] font-mono text-muted uppercase mb-1">
              Exit Condition
            </div>
            <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">
              {report.thesis_exit_condition}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border-2 flex items-center justify-between">
          <div className="text-[11px] font-mono text-muted">
            At lock · Integrity{' '}
            {report.scores_at_lock?.integrity_score.toFixed(0) || '-'} ·{' '}
            {report.classification} · {report.evidence_window}
          </div>
          <button
            onClick={handleShare}
            className="text-[12px] flex items-center gap-2 text-accent hover:text-white transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share thesis
          </button>
        </div>
      </div>
    );
  }

  // Unlocked State
  const handleLock = () => {
    saveThesisLock(report.id, {
      ...formData,
      scores_at_lock: report.scores,
    });
    onLock();
  };

  const isReady =
    formData.thesis_for.trim() &&
    formData.thesis_risk_accepted.trim() &&
    formData.thesis_exit_condition.trim() &&
    formData.exit_is_structural;

  return (
    <div className="mt-8 bg-surface-3 border border-border-2 rounded-lg p-6">
      <div className="text-[11px] font-mono font-bold text-muted uppercase mb-6">
        Thesis Lock
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-mono text-muted uppercase mb-2 block">
            The Structural Case For This Position
          </label>
          <textarea
            className="w-full bg-surface-4 border border-border rounded p-3 text-sm text-text focus:border-accent outline-none min-h-[80px]"
            placeholder="The moat holds because..."
            value={formData.thesis_for}
            onChange={(e) =>
              setFormData({ ...formData, thesis_for: e.target.value })
            }
          />
        </div>
        <div>
          <label className="text-[11px] font-mono text-muted uppercase mb-2 block">
            The Risk I Am Accepting
          </label>
          <textarea
            className="w-full bg-surface-4 border border-border rounded p-3 text-sm text-text focus:border-accent outline-none min-h-[80px]"
            placeholder="I know that... and I accept it because..."
            value={formData.thesis_risk_accepted}
            onChange={(e) =>
              setFormData({ ...formData, thesis_risk_accepted: e.target.value })
            }
          />
        </div>
        <div>
          <label className="text-[11px] font-mono text-muted uppercase mb-2 block">
            What Would Make Me Exit
          </label>
          <textarea
            className="w-full bg-surface-4 border border-border rounded p-3 text-sm text-text focus:border-accent outline-none min-h-[80px]"
            placeholder="I will reconsider if..."
            value={formData.thesis_exit_condition}
            onChange={(e) =>
              setFormData({
                ...formData,
                thesis_exit_condition: e.target.value,
              })
            }
          />
        </div>
      </div>

      {/* Structural Exit Checkbox */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          background: '#141414',
          border: '1px solid #2F2F2F',
          borderRadius: '8px',
          padding: '16px 20px',
          margin: '24px 0',
        }}
      >
        <input
          type="checkbox"
          checked={formData.exit_is_structural}
          onChange={(e) =>
            setFormData({ ...formData, exit_is_structural: e.target.checked })
          }
          className="mt-1 w-4 h-4 bg-surface-2 border-border rounded focus:ring-accent text-accent"
        />
        <div>
          <div
            style={{
              fontSize: '13px',
              color: '#E8E8E8',
              fontWeight: 500,
              marginBottom: '4px',
            }}
          >
            My exit trigger is structural, not price-based.
          </div>
          <div style={{ fontSize: '12px', color: '#8A8A8A', lineHeight: 1.5 }}>
            I will not exit because the price dropped. I will only exit if the
            structural thesis breaks.
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-[11px] font-mono text-muted">
          Scores locked at run-time · Integrity{' '}
          {report.scores.integrity_score.toFixed(0)} · {report.classification}
        </div>
        <button
          disabled={!isReady}
          onClick={handleLock}
          className="bg-accent text-bg px-4 py-2 rounded text-xs font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-accent-hover transition-colors flex items-center gap-2"
        >
          <Lock className="w-3 h-3" />
          Lock Thesis
        </button>
      </div>
    </div>
  );
};

export default ThesisLock;
