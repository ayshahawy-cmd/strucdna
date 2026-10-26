import React from 'react';
import { Link } from 'react-router-dom';
import { getReports } from '../services/dbService';
import { Layers } from 'lucide-react';

const HistoryPage: React.FC = () => {
  const reports = getReports();

  return (
    <div className="max-w-[760px] mx-auto w-full px-6 py-10">
      <h1 className="text-2xl font-bold mb-8 text-accent flex items-center gap-3">
        <Layers className="w-6 h-6" />
        Research History
      </h1>

      {reports.length === 0 ? (
        <div className="text-center py-20 bg-surface-4 rounded-xl border border-border-2 border-dashed">
          <p className="text-muted">No reports generated yet.</p>
          <Link
            to="/"
            className="text-accent hover:underline mt-2 inline-block"
          >
            Start your first analysis
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((r) => (
            <Link
              key={r.id}
              to={`/report/${r.ticker}`}
              className="block bg-surface-2 border border-border p-5 rounded-lg hover:border-accent transition-colors group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-text group-hover:text-accent transition-colors">
                    {r.ticker}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${
                      r.classification === 'INSTITUTIONAL GRADE'
                        ? 'text-accent'
                        : r.classification === 'DURABLE'
                          ? 'text-positive'
                          : r.classification === 'MIXED'
                            ? 'text-warning'
                            : 'text-critical'
                    }`}
                  >
                    {r.classification}
                  </div>
                  <div className="text-xs text-muted mt-1 font-mono">
                    Score: {r.scores.integrity_score.toFixed(0)}/100
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
