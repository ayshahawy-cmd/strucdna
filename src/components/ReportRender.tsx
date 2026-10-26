import React, { useMemo, useState, useEffect } from 'react';
import {
  Report,
  LensType,
  BacktestQuarter,
  StressTestResult,
  BlueOceanData,
} from '../types';
import ThesisLock from './ThesisLock';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  upsertBacktestQuarter,
  getManagementBacktest,
  saveStressTest,
  getStressTest,
  getTheses,
} from '../services/dbService';
import { runMoatStressTest } from '../services/aiService';

interface ReportRenderProps {
  report: Report;
  activeLens: LensType;
  onRefresh?: () => void;
  isCached?: boolean;
}

// --- UTILS: Parsing & Helpers ---

const stripMachineBlocks = (markdown: string): string => {
  let cleaned = markdown;
  cleaned = cleaned.replace(/<!--.*?-->/gs, '');
  cleaned = cleaned.replace(/═+/g, '');
  return cleaned.trim();
};

const parseMarkdownTable = (markdown: string): Record<string, string>[] => {
  const lines = markdown
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);
  if (lines.length < 2) return [];

  // Find header row (line before the separator row |---|---|)
  const separatorIdx = lines.findIndex((l) => /^\|?\s*:?-+:?\s*\|/.test(l));
  if (separatorIdx === -1) return [];

  const headerLine = lines[separatorIdx - 1];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((h) => h);

  const data = [];
  // Start after separator
  for (let i = separatorIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('|')) break; // End of table
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] || '';
    });
    data.push(row);
  }
  return data;
};

const extractSection = (markdown: string, headerStart: string): string => {
  const idx = markdown.indexOf(headerStart);
  if (idx === -1) return '';
  const nextIdx = markdown
    .slice(idx + headerStart.length)
    .search(/(^|\n)## \d+|^MODULE [A-Z]/m);
  if (nextIdx === -1) return markdown.slice(idx);
  return markdown.slice(idx, idx + headerStart.length + nextIdx);
};

const parseBlueOcean = (markdown: string): BlueOceanData | undefined => {
  const match = markdown.match(/<!-- BLUE_OCEAN([\s\S]*?)-->/);
  if (!match) return undefined;

  const block = match[1];
  const result: any = {};

  block.split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      result[key.trim()] = rest.join(':').trim();
    }
  });

  return {
    spectrum_pct: parseInt(result.spectrum_pct || '0'),
    market_space: result.market_space as any,
    competitive_intensity: result.competitive_intensity as any,
    value_innovation: result.value_innovation as any,
    non_consumption: result.non_consumption as any,
    verdict: result.verdict || 'No assessment available.',
  };
};

// --- COMPONENTS: Primitives ---

const ErrorCard: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      background: '#2A2020',
      borderLeft: '2px solid #E85D4A',
      padding: '10px 14px',
      fontSize: '12px',
      color: '#8A8A8A',
      margin: '16px 0',
    }}
  >
    {message}
  </div>
);

const NullState: React.FC<{ message?: string }> = ({
  message = 'No data found for this section in the current bundle.',
}) => (
  <div
    style={{
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#8A8A8A',
      textAlign: 'center',
      padding: '24px 0',
    }}
  >
    {message}
  </div>
);

const EvidenceBadge: React.FC<{ window: string; isCached?: boolean }> = ({
  window,
  isCached,
}) => (
  <div
    style={{
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#8A8A8A',
      borderBottom: '1px solid #2F2F2F',
      paddingBottom: '12px',
      marginBottom: '20px',
    }}
  >
    Evidence window: {window}{' '}
    {isCached && ` · Cached ${new Date().toLocaleDateString()}`}
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      fontSize: '11px',
      fontWeight: 500,
      color: '#8A8A8A',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '16px',
    }}
  >
    {children}
  </div>
);

const CollapsibleDetail: React.FC<{
  summary: string;
  children: React.ReactNode;
}> = ({ summary, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: '#252525',
        borderLeft: '2px solid #3A3A3A',
        padding: '8px 8px 8px 14px',
        borderRadius: '0 4px 4px 0',
        marginTop: '12px',
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          fontSize: '12px',
          color: '#8A8A8A',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {summary}
      </div>
      {open && (
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#8A8A8A',
            lineHeight: 1.8,
            marginTop: '8px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTS: Section Specific ---

const RevenueBreakdown: React.FC<{ rawText: string }> = ({ rawText }) => {
  // Extract table from text
  const tableData = parseMarkdownTable(rawText);
  if (tableData.length === 0) return <NullState />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {tableData.map((row, i) => {
        const growth = row['YoY'] || row['YoY Change'] || '0%';
        const isPos =
          growth.includes('+') || (!growth.includes('-') && growth !== '0%');
        const isNeg = growth.includes('-');
        const type = row['Revenue Type'] || 'Mixed';

        let typeColor = 'rgba(232,168,56,0.10)'; // Mixed
        let typeText = '#E8A838';
        if (type.toLowerCase().includes('recurring')) {
          typeColor = 'rgba(76,175,125,0.10)';
          typeText = '#4CAF7D';
        }
        if (type.toLowerCase().includes('transactional')) {
          typeColor = 'rgba(240,237,232,0.08)';
          typeText = '#F0EDE8';
        }

        return (
          <div
            key={i}
            style={{
              background: '#1E1E1E',
              border: '1px solid #2F2F2F',
              borderRadius: '8px',
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div
                style={{ fontSize: '13px', fontWeight: 600, color: '#E8E8E8' }}
              >
                {row['Segment']}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: typeColor,
                  color: typeText,
                }}
              >
                {type}
              </div>
            </div>
            <div
              style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}
            >
              <div
                style={{ fontSize: '18px', fontWeight: 600, color: '#F0EDE8' }}
              >
                {row['Revenue']}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#8A8A8A',
                }}
              >
                {row['% of Total']}
              </div>
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: isPos ? '#4CAF7D' : isNeg ? '#E85D4A' : '#8A8A8A',
              }}
            >
              YoY {growth}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
                marginTop: '12px',
              }}
            >
              {row['Period'] || 'Period unknown'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ForwardIndicators: React.FC<{ rawText: string }> = ({ rawText }) => {
  const tableData = parseMarkdownTable(rawText);
  if (tableData.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {tableData.map((row, i) => (
        <div
          key={i}
          style={{
            background: '#1E1E1E',
            border: '1px solid #2F2F2F',
            borderRadius: '20px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#8A8A8A',
            }}
          >
            {row['Metric']}
          </span>
          <span style={{ fontSize: '12px', color: '#E8E8E8' }}>
            {row['Value']}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#8A8A8A',
            }}
          >
            ({row['Period']})
          </span>
        </div>
      ))}
    </div>
  );
};

const BacktestingRow: React.FC<{ data: BacktestQuarter[] }> = ({ data }) => {
  if (data.length === 0)
    return <NullState message="No guidance history available." />;

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-6">
      {data.map((q, i) => {
        const color =
          q.beat_miss === 'BEAT'
            ? '#4CAF7D'
            : q.beat_miss === 'MISS'
              ? '#E85D4A'
              : '#3A3A3A';
        return (
          <div
            key={i}
            style={{
              width: '200px',
              flexShrink: 0,
              background: '#1E1E1E',
              border: '1px solid #2F2F2F',
              borderRadius: '8px',
              padding: '16px',
              borderTop: `3px solid ${color}`,
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: '#F0EDE8',
                }}
              >
                {q.quarter}
              </span>
              <span style={{ fontSize: '10px', color: '#8A8A8A' }}>
                Earnings
              </span>
            </div>
            <div className="mb-2">
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#8A8A8A',
                }}
              >
                GUIDED
              </div>
              <div style={{ fontSize: '13px', color: '#E8E8E8' }}>
                {q.revenue_guided_low && q.revenue_guided_high
                  ? `${q.revenue_guided_low} – ${q.revenue_guided_high}`
                  : 'Non-numeric'}
              </div>
            </div>
            <div className="mb-2">
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#8A8A8A',
                }}
              >
                ACTUAL
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: color === '#3A3A3A' ? '#E8E8E8' : color,
                }}
              >
                {q.revenue_actual || '-'}
              </div>
            </div>
            <div
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                color: q.beat_margin_pct > 0 ? '#4CAF7D' : '#E85D4A',
                marginBottom: '8px',
              }}
            >
              {q.beat_margin_pct > 0 ? '+' : ''}
              {q.beat_margin_pct}%
            </div>
            <div
              title={q.management_quote}
              style={{
                fontSize: '12px',
                color: '#8A8A8A',
                fontStyle: 'italic',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: '8px',
              }}
            >
              "{q.management_quote}"
            </div>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                padding: '2px 6px',
                borderRadius: '3px',
                background: 'rgba(240,237,232,0.08)',
                color: '#F0EDE8',
              }}
            >
              {q.guidance_tone}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const FragilityBlock: React.FC<{ score: number; text: string }> = ({
  score,
  text,
}) => {
  // Extract dimensions from text if possible, otherwise hardcode layout for now as per prompt
  // The prompt implies we extract findings. For now, we will assume the text contains the assessment table.
  // We can't easily parse arbitrary text into the dimension list without structured output.
  // Assuming text contains the markdown table for dimensions or we parse it from `## 03` logic.
  // For this rewrite, I'll parse the `## 03` section text passed in to find ratings.

  // Helper to find rating
  const findRating = (key: string) => {
    const regex = new RegExp(`\\|\\s*${key}.*?\\|\\s*(.*?)\\s*\\|`);
    const match = text.match(regex);
    return match ? match[1].trim() : 'MODERATE'; // Default
  };

  const dimensions = [
    {
      name: 'Customer Concentration',
      rating: findRating('Customer Concentration'),
    },
    { name: 'Supply Chain', rating: findRating('Supply Chain') }, // approximate
    { name: 'Key Person', rating: findRating('Key Person') }, // approximate from table
    { name: 'Regulatory', rating: findRating('Regulatory') }, // approximate
    {
      name: 'Technology Dependency',
      rating: findRating('Technology Dependency'),
    }, // approximate
  ];

  let band = 'CRITICAL';
  let color = '#E85D4A';
  if (score <= 20) {
    band = 'FORTRESS';
    color = '#4CAF7D';
  } else if (score <= 40) {
    band = 'RESILIENT';
    color = '#4CAF7D';
  } else if (score <= 60) {
    band = 'EXPOSED';
    color = '#E8A838';
  } else if (score <= 80) {
    band = 'VULNERABLE';
    color = '#E85D4A';
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div
          style={{
            flex: 1,
            height: '6px',
            background: '#2A2A2A',
            borderRadius: '3px',
          }}
        >
          <div
            style={{
              width: `${score}%`,
              height: '100%',
              background: color,
              borderRadius: '3px',
            }}
          ></div>
        </div>
        <div
          style={{ fontSize: '11px', fontFamily: 'monospace', color: color }}
        >
          {score} / 100 — {band}
        </div>
      </div>

      <div>
        {dimensions.map((d, i) => {
          let rColor = '#E8A838';
          let rBg = 'rgba(232,168,56,0.10)';
          const rUpper = d.rating.toUpperCase();
          if (rUpper.includes('LOW') || rUpper.includes('NONE')) {
            rColor = '#4CAF7D';
            rBg = 'rgba(76,175,125,0.10)';
          }
          if (rUpper.includes('HIGH') || rUpper.includes('CRITICAL')) {
            rColor = '#E85D4A';
            rBg = 'rgba(232,93,74,0.10)';
          }

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom:
                  i === dimensions.length - 1 ? 'none' : '1px solid #2A2A2A',
              }}
            >
              <span style={{ fontSize: '13px', color: '#E8E8E8' }}>
                {d.name}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: rBg,
                  color: rColor,
                }}
              >
                {d.rating}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RiskCard: React.FC<{ title: string; content: string }> = ({
  title,
  content,
}) => {
  // Basic extraction
  const extract = (key: string) => {
    const regex = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.*)`);
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  };

  const severityMatch = content.match(/Severity:\s*(\w+)/i);
  const probMatch = content.match(/Probability:\s*(\w+)/i);
  const severity = severityMatch ? severityMatch[1].toUpperCase() : 'MED';
  const probability = probMatch ? probMatch[1].toUpperCase() : 'MED';

  const getBadge = (val: string) => {
    if (val === 'HIGH') return { bg: 'rgba(232,93,74,0.10)', color: '#E85D4A' };
    if (val === 'LOW') return { bg: 'rgba(76,175,125,0.10)', color: '#4CAF7D' };
    return { bg: 'rgba(232,168,56,0.10)', color: '#E8A838' };
  };

  const sBadge = getBadge(severity);
  const pBadge = getBadge(probability);

  return (
    <div
      style={{
        background: '#1C1C1C',
        border: '1px solid #2F2F2F',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '8px',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#E8E8E8' }}>
          {title}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '2px 8px',
              borderRadius: '4px',
              background: sBadge.bg,
              color: sBadge.color,
            }}
          >
            {severity}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '2px 8px',
              borderRadius: '4px',
              background: pBadge.bg,
              color: pBadge.color,
            }}
          >
            PROBABILITY: {probability}
          </span>
        </div>
      </div>

      {['Mechanism', 'Trigger', 'Structural Impact'].map((field) => {
        const text = extract(field);
        if (!text) return null;
        return (
          <div key={field} style={{ marginTop: '10px' }}>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              {field.toUpperCase()}
            </div>
            <div
              style={{ fontSize: '13px', color: '#8A8A8A', lineHeight: 1.65 }}
            >
              {text}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: '10px' }}>
        <div
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#8A8A8A',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          WHAT WOULD CHANGE THIS
        </div>
        <div
          style={{ fontSize: '12px', color: '#8A8A8A', fontStyle: 'italic' }}
        >
          {extract('What would change this') || 'Not specified.'}
        </div>
      </div>
    </div>
  );
};

const IntegrityScoreCard: React.FC<{ scores: any; classification: string }> = ({
  scores,
  classification,
}) => {
  const getClassColor = (c: string) => {
    if (c.includes('INSTITUTIONAL')) return '#F0EDE8';
    if (c.includes('DURABLE')) return '#4CAF7D';
    if (c.includes('MIXED')) return '#E8A838';
    return '#E85D4A';
  };

  return (
    <div
      style={{
        background: '#141414',
        border: '1px solid #2F2F2F',
        borderRadius: '8px',
        padding: '20px 24px',
        marginBottom: '28px',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: 2.2,
      }}
    >
      <div className="flex justify-between">
        <span style={{ color: '#E8E8E8' }}>Management Credibility</span>
        <span style={{ color: '#E8E8E8' }}>
          {scores.credibility_score} / 100
        </span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: '#E8E8E8' }}>Moat Durability</span>
        <span style={{ color: '#E8E8E8' }}>{scores.moat_score} / 100</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: '#E8E8E8' }}>Fragility Index</span>
        <span style={{ color: '#E8E8E8' }}>{scores.fragility_score} / 100</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: '#E8E8E8' }}>Business Model</span>
        <span style={{ color: '#E8E8E8' }}>
          {scores.business_model_score} / 100
        </span>
      </div>
      <div style={{ borderTop: '1px solid #2F2F2F', margin: '14px 0' }}></div>
      <div
        className="flex justify-between font-bold"
        style={{ color: '#F0EDE8' }}
      >
        <span>Structural Integrity</span>
        <span>{scores.integrity_score.toFixed(1)} / 100</span>
      </div>
      <div className="flex justify-between font-bold">
        <span style={{ color: '#F0EDE8' }}>Classification</span>
        <span style={{ color: getClassColor(classification) }}>
          {classification}
        </span>
      </div>

      <CollapsibleDetail summary="Show scoring logic">
        fragility_inverse = 100 - {scores.fragility_score}
        {'\n'}
        integrity = (0.50 × {scores.credibility_score}) + (0.30 ×{' '}
        {100 - scores.fragility_score}) + (0.20 × 50)
      </CollapsibleDetail>
    </div>
  );
};

const QualitativeFindings: React.FC<{ rawText: string }> = ({ rawText }) => {
  // Extract rows based on **[TAG]** pattern
  const regex = /\*\*\[(.*?)\]\*\*\s*—\s*(.*)/g;
  const findings = [];
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    findings.push({ tag: match[1], text: match[2] });
  }

  if (findings.length === 0) return <NullState />;

  const getTagStyle = (tag: string) => {
    const t = tag.toLowerCase();
    if (
      t.includes('moat wide') ||
      t.includes('strong') ||
      t.includes('durable')
    )
      return { bg: 'rgba(76,175,125,0.10)', color: '#4CAF7D' };
    if (t.includes('risk') || t.includes('threat') || t.includes('dependency'))
      return { bg: 'rgba(232,93,74,0.10)', color: '#E85D4A' };
    if (
      t.includes('watch') ||
      t.includes('pressure') ||
      t.includes('transitioning')
    )
      return { bg: 'rgba(232,168,56,0.10)', color: '#E8A838' };
    return { bg: 'rgba(240,237,232,0.08)', color: '#F0EDE8' };
  };

  return (
    <div>
      <SectionHeader>Qualitative Findings</SectionHeader>
      {findings.slice(0, 4).map((f, i) => {
        const style = getTagStyle(f.tag);
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
              padding: '14px 0',
              borderBottom: i === 3 ? 'none' : '1px solid #2A2A2A',
            }}
          >
            <div
              style={{
                minWidth: '120px',
                flexShrink: 0,
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: '4px',
                background: style.bg,
                color: style.color,
              }}
            >
              {f.tag}
            </div>
            <div
              style={{ fontSize: '13px', color: '#8A8A8A', lineHeight: 1.65 }}
            >
              {f.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ThesisBanner: React.FC<{ report: Report }> = ({ report }) => {
  if (!report.thesis_status || !report.thesis_locked_at) return null;

  let styles = {
    border: 'rgba(76,175,125,0.30)',
    bg: 'rgba(76,175,125,0.05)',
    color: '#4CAF7D',
    badgeBg: 'rgba(76,175,125,0.10)',
  };
  if (report.thesis_status === 'WATCH')
    styles = {
      border: 'rgba(232,168,56,0.30)',
      bg: 'rgba(232,168,56,0.05)',
      color: '#E8A838',
      badgeBg: 'rgba(232,168,56,0.10)',
    };
  if (report.thesis_status === 'BROKEN')
    styles = {
      border: 'rgba(232,93,74,0.30)',
      bg: 'rgba(232,93,74,0.05)',
      color: '#E85D4A',
      badgeBg: 'rgba(232,93,74,0.10)',
    };

  return (
    <div
      style={{
        marginBottom: '32px',
        padding: '20px 24px',
        borderRadius: '8px',
        border: `1px solid ${styles.border}`,
        background: styles.bg,
      }}
    >
      <div className="flex justify-between items-center">
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: '4px',
            background: styles.badgeBg,
            color: styles.color,
          }}
        >
          {report.thesis_status}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#8A8A8A',
          }}
        >
          Locked {new Date(report.thesis_locked_at).toLocaleDateString()} ·
          Checked{' '}
          {new Date(report.thesis_last_checked || '').toLocaleDateString()}
        </span>
      </div>
      <div
        style={{
          fontSize: '13px',
          color: '#8A8A8A',
          fontStyle: 'italic',
          marginTop: '10px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        "{report.thesis_for}"
      </div>
      {report.thesis_status === 'BROKEN' && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px 14px',
            background: 'rgba(232,93,74,0.08)',
            borderLeft: '2px solid #E85D4A',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#E85D4A',
            }}
          >
            EXIT CONDITION MET
          </div>
          <div style={{ fontSize: '12px', color: '#E8E8E8' }}>
            {report.thesis_exit_condition}
          </div>
        </div>
      )}
      <div style={{ marginTop: '14px' }}>
        <a
          href="#"
          style={{ fontSize: '12px', color: '#8A8A8A', textDecoration: 'none' }}
          className="hover:text-text"
        >
          See what changed →
        </a>
      </div>
    </div>
  );
};

const BlueOceanBlock: React.FC<{ data: BlueOceanData }> = ({ data }) => {
  return (
    <div
      style={{
        background: '#141414',
        border: '1px solid #2F2F2F',
        borderRadius: '8px',
        padding: '24px',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '8px',
          borderRadius: '4px',
          background: 'linear-gradient(to right, #E85D4A, #E8A838, #4CAF7D)',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-3px',
            left: `${data.spectrum_pct}%`,
            width: '14px',
            height: '14px',
            background: '#fff',
            border: '2px solid #1C1C1C',
            borderRadius: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '16px',
            left: '0',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#E85D4A',
          }}
        >
          RED OCEAN
        </span>
        <span
          style={{
            position: 'absolute',
            top: '16px',
            right: '0',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#4CAF7D',
          }}
        >
          BLUE OCEAN
        </span>
        <span
          style={{
            position: 'absolute',
            top: '16px',
            left: `${data.spectrum_pct}%`,
            transform: 'translateX(-50%)',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#8A8A8A',
          }}
        >
          {data.spectrum_pct}% Blue Ocean
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { l: 'MARKET SPACE', v: data.market_space },
          { l: 'COMPETITIVE INTENSITY', v: data.competitive_intensity },
          { l: 'VALUE INNOVATION', v: data.value_innovation },
          { l: 'NON-CONSUMPTION', v: data.non_consumption },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              background: '#1E1E1E',
              border: '1px solid #2F2F2F',
              borderRadius: '6px',
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#8A8A8A',
                marginBottom: '4px',
              }}
            >
              {item.l}
            </div>
            <div style={{ fontSize: '12px', color: '#E8E8E8' }}>{item.v}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '13px', color: '#8A8A8A', fontStyle: 'italic' }}>
        Blue Ocean assessment: {data.verdict}
      </div>
    </div>
  );
};

// --- MAIN RENDERER ---

const ReportRender: React.FC<ReportRenderProps> = ({
  report,
  activeLens,
  onRefresh,
  isCached,
}) => {
  const [backtestData, setBacktestData] = useState<BacktestQuarter[]>([]);

  // Process sections
  const sections = useMemo(() => {
    const raw = report.markdown;
    return {
      s00: extractSection(raw, '## 00'),
      s01: extractSection(raw, '## 01'),
      s02: extractSection(raw, '## 02'),
      s03: extractSection(raw, '## 03'),
      s04: extractSection(raw, '## 04'),
      s05: extractSection(raw, '## 05'),
      s06: extractSection(raw, '## 06'),
      modA: extractSection(raw, 'MODULE A'),
      modB: extractSection(raw, 'MODULE B'),
      modC: extractSection(raw, 'MODULE C'),
      modD: extractSection(raw, 'MODULE D'),
      blueOcean: parseBlueOcean(raw),
    };
  }, [report.markdown]);

  useEffect(() => {
    // Extract backtest data from db if available
    const bd = getManagementBacktest(report.ticker);
    // Sort newest first
    setBacktestData(bd.sort((a, b) => (a.quarter < b.quarter ? 1 : -1)));
  }, [report.ticker]);

  // Helpers to extract raw text for components
  const getFindingText = (s: string) => s.split('### Findings')[1] || '';
  const getVerdictText = (s: string) => {
    const match = s.match(/Verdict:\s*(.*)/);
    return match ? match[1] : '';
  };

  // --- LENS RENDERERS ---

  const renderFullReport = () => (
    <div className="animate-fade-in">
      <ThesisBanner report={report} />
      <ThesisLock
        report={report}
        isPaid={true}
        onLock={onRefresh || (() => {})}
      />

      {/* SECTION 0 */}
      <div className="mb-12 mt-8">
        <EvidenceBadge window={report.evidence_window} isCached={isCached} />
        <SectionHeader>00 — Executive Structural Snapshot</SectionHeader>
        <div className="text-[14px] text-text leading-[1.75] mb-8">
          {sections.s00.replace(/## 00.*?\n/, '').trim()}
        </div>

        <SectionHeader>Revenue Breakdown</SectionHeader>
        <RevenueBreakdown
          rawText={extractSection(
            sections.s04,
            '### Revenue by Structural Type',
          )}
        />

        <div className="italic text-[13px] text-muted">
          {getVerdictText(sections.s04)}
        </div>
      </div>

      {/* SECTION 1 */}
      <div className="mb-12">
        <EvidenceBadge window={report.evidence_window} />
        <SectionHeader>01 — Management Credibility</SectionHeader>
        <BacktestingRow data={backtestData} />

        {/* Score Block */}
        <div
          style={{
            background: '#141414',
            border: '1px solid #2F2F2F',
            borderRadius: '8px',
            padding: '16px 20px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        >
          <div
            style={{
              color:
                report.scores.credibility_score >= 70 ? '#4CAF7D' : '#E8A838',
            }}
          >
            MANAGEMENT CREDIBILITY {report.scores.credibility_score} / 100
          </div>
          <div className="text-muted mt-2">
            Beat rate:{' '}
            {Math.round(
              (backtestData.filter((d) => d.beat_miss === 'BEAT').length /
                Math.max(1, backtestData.length)) *
                100,
            )}
            %
          </div>
          <CollapsibleDetail summary="Show scoring detail">
            Beat Rate ={' '}
            {backtestData.filter((d) => d.beat_miss === 'BEAT').length}/
            {backtestData.length}
            {'\n'}
            Credibility Score = {report.scores.credibility_score}
          </CollapsibleDetail>
        </div>
      </div>

      {/* SECTION 2 */}
      <div className="mb-12">
        <EvidenceBadge window={report.evidence_window} />
        <SectionHeader>02 — Fragility Snapshot</SectionHeader>
        <FragilityBlock
          score={report.scores.fragility_score}
          text={sections.s03}
        />
        <div className="italic text-[13px] text-muted mt-4">
          Top Driver: {getVerdictText(sections.s03)}
        </div>
      </div>

      {/* SECTION 3 */}
      <div className="mb-12">
        <EvidenceBadge window={report.evidence_window} />
        <SectionHeader>03 — Top 3 Structural Risks</SectionHeader>
        {sections.s05
          .split('### Rank')
          .slice(1)
          .map((r, i) => (
            <RiskCard key={i} title={`Rank ${r.split('\n')[0]}`} content={r} />
          ))}
      </div>

      {/* SECTION 4 */}
      <div className="mb-12">
        <EvidenceBadge window={report.evidence_window} />
        <SectionHeader>04 — Structural Integrity Verdict</SectionHeader>
        <IntegrityScoreCard
          scores={report.scores}
          classification={report.classification}
        />

        <div className="text-[14px] text-text leading-[1.75] mb-8">
          {sections.s06.split('### Executive Brief')[1]?.split('###')[0].trim()}
        </div>

        <QualitativeFindings rawText={sections.s06} />

        <div
          style={{
            marginTop: '20px',
            padding: '16px 20px',
            background: '#1C1C1C',
            border: '1px solid #2F2F2F',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#8A8A8A',
            lineHeight: 1.65,
          }}
        >
          <strong style={{ color: '#F0EDE8', marginRight: '8px' }}>
            Verdict:
          </strong>
          {getVerdictText(sections.s06)}
        </div>
      </div>
    </div>
  );

  const renderMoatTab = () => (
    <div className="animate-fade-in">
      <EvidenceBadge window={report.evidence_window} />
      {/* Parse Moat Layer Table from s02 to render cards */}
      {parseMarkdownTable(
        extractSection(sections.s02, '### Moat Layer Table'),
      ).map((row, i) => (
        <div
          key={i}
          style={{
            background: '#1E1E1E',
            border: '1px solid #2F2F2F',
            borderRadius: '8px',
            padding: '20px 24px',
            marginBottom: '8px',
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <div
              style={{ fontSize: '14px', fontWeight: 600, color: '#F0EDE8' }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#8A8A8A',
                  marginRight: '8px',
                }}
              >
                #{i + 1}
              </span>
              {row['Moat Type']}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#F0EDE8',
              }}
            >
              {row['Strength (★1-5)']}
            </span>
          </div>
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#8A8A8A',
              textTransform: 'uppercase',
              marginTop: '10px',
            }}
          >
            EVIDENCE
          </div>
          <div style={{ fontSize: '13px', color: '#8A8A8A', lineHeight: 1.65 }}>
            {row['Evidence from Bundle']}
          </div>
        </div>
      ))}

      {/* Blue Ocean Feature */}
      {sections.blueOcean && (
        <>
          <SectionHeader>BLUE OCEAN ANALYSIS</SectionHeader>
          <BlueOceanBlock data={sections.blueOcean} />
        </>
      )}
    </div>
  );

  const renderManagementTab = () => (
    <div className="animate-fade-in">
      <EvidenceBadge window={report.evidence_window} />
      <BacktestingRow data={backtestData} />
      <div className="mt-8">
        {backtestData.map((q, i) => (
          <div
            key={i}
            style={{
              background: '#1E1E1E',
              border: '1px solid #2F2F2F',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '8px',
            }}
          >
            <div className="flex justify-between mb-3">
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#F0EDE8',
                }}
              >
                {q.quarter}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#8A8A8A',
                }}
              >
                Earnings
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-[12px] text-muted">
              <div>
                GUIDANCE:{' '}
                {q.revenue_guided_low
                  ? `${q.revenue_guided_low}-${q.revenue_guided_high}`
                  : 'Non-numeric'}
              </div>
              <div>
                ACTUAL: {q.revenue_actual} ({q.beat_miss})
              </div>
              <div className="italic">"{q.management_quote}"</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRisksTab = () => (
    <div className="animate-fade-in">
      <EvidenceBadge window={report.evidence_window} />
      {sections.s05
        .split('### Rank')
        .slice(1)
        .map((r, i) => (
          <RiskCard key={i} title={`Rank ${r.split('\n')[0]}`} content={r} />
        ))}
    </div>
  );

  const renderChecklistTab = () => (
    <div className="animate-fade-in">
      <EvidenceBadge window={report.evidence_window} />
      {sections.modB
        .split('---')
        .filter((b) => b.trim().length > 10)
        .map((b, i) => {
          const extract = (k: string) =>
            (b.match(new RegExp(`\\*\\*${k}:\\*\\*\\s*(.*)`)) || [])[1]?.trim();
          return (
            <div
              key={i}
              style={{
                background: '#1E1E1E',
                border: '1px solid #2F2F2F',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '8px',
              }}
            >
              <div className="flex justify-between mb-2">
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#F0EDE8',
                  }}
                >
                  {extract('.*?')}
                </span>{' '}
                {/* Hacky regex, assuming first bold is title */}
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: extract('Score') === 'null' ? '#8A8A8A' : '#4CAF7D',
                  }}
                >
                  {extract('Score')}
                </span>
              </div>
              <div
                style={{ fontSize: '13px', color: '#E8E8E8', lineHeight: 1.65 }}
              >
                {extract('Answer')}
              </div>
            </div>
          );
        })}
    </div>
  );

  try {
    switch (activeLens) {
      case LensType.RISKS:
        return renderRisksTab();
      case LensType.MOAT:
        return renderMoatTab();
      case LensType.MANAGEMENT:
        return renderManagementTab();
      case LensType.CHECKLIST:
        return renderChecklistTab();
      case LensType.FULL:
      default:
        return renderFullReport();
    }
  } catch (e: any) {
    return <ErrorCard message={`Failed to render section: ${e.message}`} />;
  }
};

export default ReportRender;
