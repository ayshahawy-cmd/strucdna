import React from 'react';
import { LensType } from '../types';

interface LensTabsProps {
  activeLens: LensType;
  onChange: (lens: LensType) => void;
}

const LensTabs: React.FC<LensTabsProps> = ({ activeLens, onChange }) => {
  return (
    <div className="w-full border-b border-border-2 bg-bg/95 backdrop-blur sticky top-[105px] z-30">
      <div className="max-w-[760px] mx-auto px-8 flex items-center gap-8 overflow-x-auto no-scrollbar">
        {Object.values(LensType).map((lens) => (
          <button
            key={lens}
            onClick={() => onChange(lens)}
            className={`
              h-12 text-[13px] font-medium whitespace-nowrap transition-colors relative
              ${activeLens === lens ? 'text-accent' : 'text-muted hover:text-text'}
            `}
          >
            {lens}
            {activeLens === lens && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LensTabs;
