import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, History, PlusCircle, BookOpen } from 'lucide-react';
import { getTheses } from '../services/dbService';

const Layout: React.FC = () => {
  const location = useLocation();
  const isPaid = true; // Mock paid tier

  // Calculate badge status
  const theses = getTheses();
  const hasBroken = theses.some((t) => t.thesis_status === 'BROKEN');
  const hasWatch = theses.some((t) => t.thesis_status === 'WATCH');

  let badgeColor = null;
  if (hasBroken) badgeColor = '#E85D4A';
  else if (hasWatch) badgeColor = '#E8A838';

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text font-sans">
      {/* Nav */}
      <nav className="h-[56px] border-b border-border-2 flex items-center justify-between px-6 sticky top-0 bg-bg/95 backdrop-blur z-50">
        <Link
          to="/"
          className="text-[15px] font-semibold text-accent tracking-tight flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          StrucDNA
          <span className="ml-1 text-[10px] font-mono font-normal text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-border-2">
            beta
          </span>
        </Link>

        {isPaid && (
          <div className="flex items-center gap-6">
            <Link
              to="/theses"
              className={`text-[13px] flex items-center gap-1.5 transition-colors ${location.pathname === '/theses' ? 'text-accent' : 'text-muted hover:text-text'}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Journal
              {badgeColor && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: badgeColor,
                    display: 'inline-block',
                    marginLeft: '4px',
                  }}
                />
              )}
            </Link>
            <Link
              to="/history"
              className={`text-[13px] flex items-center gap-1.5 transition-colors ${location.pathname === '/history' ? 'text-accent' : 'text-muted hover:text-text'}`}
            >
              <History className="w-3.5 h-3.5" />
              History
            </Link>
            <Link
              to="/"
              className="text-[13px] flex items-center gap-1.5 text-muted hover:text-text transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New
            </Link>
            <Link
              to="/settings"
              className={`text-[13px] transition-colors ${location.pathname === '/settings' ? 'text-accent' : 'text-muted hover:text-accent'}`}
            >
              Settings
            </Link>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
