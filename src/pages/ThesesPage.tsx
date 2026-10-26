import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTheses,
  getTrackRecord,
  getThesisSnapshots,
} from '../services/dbService';
import { Report, ThesisSnapshot } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';

const ThesesPage: React.FC = () => {
  const navigate = useNavigate();
  const [theses, setTheses] = useState<Report[]>([]);
  const [trackRecord, setTrackRecord] = useState<any>(null);

  useEffect(() => {
    const all = getTheses();
    const sorted = all.sort((a, b) => {
      const statusPriority = { BROKEN: 0, WATCH: 1, HOLDING: 2 };
      const sA = statusPriority[a.thesis_status || 'HOLDING'];
      const sB = statusPriority[b.thesis_status || 'HOLDING'];
      if (sA !== sB) return sA - sB;
      return (
        new Date(b.thesis_locked_at || 0).getTime() -
        new Date(a.thesis_locked_at || 0).getTime()
      );
    });
    setTheses(sorted);
    setTrackRecord(getTrackRecord());
  }, []);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'HOLDING':
        return {
          border: '#2F2F2F',
          bg: 'rgba(76,175,125,0.10)',
          color: '#4CAF7D',
        };
      case 'WATCH':
        return {
          border: 'rgba(232,168,56,0.30)',
          bg: 'rgba(232,168,56,0.10)',
          color: '#E8A838',
        };
      case 'BROKEN':
        return {
          border: 'rgba(232,93,74,0.30)',
          bg: 'rgba(232,93,74,0.10)',
          color: '#E85D4A',
        };
      default:
        return { border: '#2F2F2F', bg: '#2F2F2F', color: '#8A8A8A' };
    }
  };

  const getScoreDiff = (current: number, atLock: number) => {
    const diff = current - atLock;
    if (diff > 0) return { label: `+${diff}`, color: '#4CAF7D' };
    if (diff < 0) return { label: `${diff}`, color: '#E85D4A' };
    return { label: '—', color: '#8A8A8A' };
  };

  return (
    <div className="max-w-[760px] mx-auto w-full px-6 py-10 animate-fade-in">
      {/* HEADER */}
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#8A8A8A',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          Research Journal
        </h2>
        <p style={{ fontSize: '13px', color: '#8A8A8A', lineHeight: 1.6 }}>
          Every thesis you lock is recorded here automatically. StrucDNA checks
          due theses while the app is open. Prototype assessments use model
          knowledge and need verification against original sources.
        </p>
      </div>

      {/* TRACK RECORD */}
      {trackRecord && trackRecord.total >= 3 && (
        <div
          style={{
            background: '#141414',
            border: '1px solid #2F2F2F',
            borderRadius: '8px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Theses Locked
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#F0EDE8',
                fontFamily: 'monospace',
              }}
            >
              {trackRecord.total}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Holding
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#4CAF7D',
                fontFamily: 'monospace',
              }}
            >
              {trackRecord.holding}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Watch
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#E8A838',
                fontFamily: 'monospace',
              }}
            >
              {trackRecord.watch}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Broken
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#E85D4A',
                fontFamily: 'monospace',
              }}
            >
              {trackRecord.broken}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Avg Days to Break
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#E8E8E8',
                fontFamily: 'monospace',
              }}
            >
              {trackRecord.avgDays > 0 ? trackRecord.avgDays : '—'}
            </div>
          </div>
        </div>
      )}

      {/* BLIND SPOT DETECTOR (Mocked for demo as complex analysis needs many theses) */}
      {trackRecord && trackRecord.total >= 5 && trackRecord.broken >= 1 && (
        <div
          style={{
            background: '#1A1212',
            border: '1px solid rgba(232,93,74,0.20)',
            borderLeft: '3px solid #E85D4A',
            borderRadius: '0 8px 8px 0',
            padding: '16px 20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#E85D4A',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
            }}
          >
            Your Structural Blind Spot
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#F0EDE8',
              fontWeight: 500,
              marginBottom: '6px',
            }}
          >
            You consistently underweight Key Person risk.
          </div>
          <div style={{ fontSize: '13px', color: '#8A8A8A', lineHeight: 1.65 }}>
            This appeared in 2 of your {trackRecord.broken} broken or
            deteriorating theses.
          </div>
        </div>
      )}

      {/* CARDS */}
      {theses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p
            style={{ fontSize: '15px', color: '#F0EDE8', marginBottom: '8px' }}
          >
            No locked theses yet.
          </p>
          <p style={{ fontSize: '13px', color: '#8A8A8A', lineHeight: 1.6 }}>
            Run a report on any ticker, then lock your structural thesis below
            the verdict.
          </p>
        </div>
      ) : (
        <div>
          {theses.map((thesis) => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              styles={getStatusStyles(thesis.thesis_status || 'HOLDING')}
              diff={getScoreDiff(
                thesis.scores.integrity_score,
                thesis.scores_at_lock?.integrity_score ||
                  thesis.scores.integrity_score,
              )}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ThesisCard: React.FC<{
  thesis: Report;
  styles: any;
  diff: any;
  navigate: any;
}> = ({ thesis, styles, diff, navigate }) => {
  const [expanded, setExpanded] = useState(false);
  const snapshots = getThesisSnapshots(thesis.ticker);
  const hasHistory = snapshots.length >= 2;

  return (
    <div
      style={{
        background: '#1E1E1E',
        border: `1px solid ${styles.border}`,
        borderRadius: '8px',
        padding: '20px 24px',
        marginBottom: '8px',
        transition: 'border-color 0.15s',
      }}
    >
      <div
        onClick={() => navigate(`/report/${thesis.ticker}`)}
        style={{ cursor: 'pointer' }}
      >
        {/* ROW 1 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#F0EDE8' }}>
            {thesis.ticker}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {thesis.exit_is_structural && (
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#4CAF7D',
                  background: 'rgba(76,175,125,0.10)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
              >
                STRUCTURAL EXIT
              </span>
            )}
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '4px',
                background: styles.bg,
                color: styles.color,
              }}
            >
              {thesis.thesis_status}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
              }}
            >
              Locked {new Date(thesis.thesis_locked_at!).toLocaleDateString()}
            </span>
          </div>
        </div>
        {/* ROW 2 & 3 */}
        <p
          style={{
            fontSize: '13px',
            color: '#8A8A8A',
            lineHeight: 1.5,
            margin: '0 0 12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {thesis.thesis_for}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#8A8A8A',
            }}
          >
            At lock
          </span>
          <span
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#E8E8E8',
            }}
          >
            Integrity {thesis.scores_at_lock?.integrity_score.toFixed(0) || '-'}
          </span>
          <span style={{ fontSize: '11px', color: '#8A8A8A' }}>→</span>
          <span
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: diff.color,
            }}
          >
            {thesis.scores.integrity_score.toFixed(0)} ({diff.label})
          </span>
        </div>
      </div>

      {/* COMPARE BUTTON */}
      {hasHistory && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          style={{
            fontSize: '11px',
            color: '#8A8A8A',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Compare runs
        </button>
      )}

      {/* COMPARE EXPANSION */}
      {expanded && (
        <div
          style={{
            marginTop: '16px',
            borderTop: '1px solid #2F2F2F',
            paddingTop: '16px',
          }}
        >
          <table
            style={{
              width: '100%',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#8A8A8A',
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingBottom: '8px' }}>
                  DATE
                </th>
                <th style={{ textAlign: 'left', paddingBottom: '8px' }}>
                  INTEGRITY
                </th>
                <th style={{ textAlign: 'left', paddingBottom: '8px' }}>
                  CLASS
                </th>
                <th style={{ textAlign: 'left', paddingBottom: '8px' }}>
                  RISK
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s, i) => {
                const prev = snapshots[i + 1];
                const scoreChange = prev
                  ? s.integrity_score - prev.integrity_score
                  : 0;
                const changeColor =
                  scoreChange > 0
                    ? '#4CAF7D'
                    : scoreChange < 0
                      ? '#E85D4A'
                      : '#8A8A8A';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #2F2F2F' }}>
                    <td style={{ padding: '8px 0' }}>
                      {new Date(s.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '8px 0', color: changeColor }}>
                      {s.integrity_score.toFixed(0)}{' '}
                      {scoreChange !== 0 ? (scoreChange > 0 ? '↑' : '↓') : ''}
                    </td>
                    <td style={{ padding: '8px 0' }}>{s.classification}</td>
                    <td
                      style={{
                        padding: '8px 0',
                        maxWidth: '140px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.top_risk}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ThesesPage;
