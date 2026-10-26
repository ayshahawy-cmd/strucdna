import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (ticker: string) => void;
  isLoading?: boolean;
  variant?: 'hero' | 'persistent';
  initialValue?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading,
  variant = 'hero',
  initialValue = '',
}) => {
  const [ticker, setTicker] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      onSearch(ticker.toUpperCase());
    }
  };

  const containerClasses =
    variant === 'hero'
      ? 'w-full max-w-[420px] mx-auto'
      : 'w-full border-b border-border-2 bg-surface-4 py-3 px-6 sticky top-[56px] z-40';

  const inputClasses =
    variant === 'hero'
      ? 'w-full bg-surface-2 border border-border text-text placeholder-muted rounded-lg pl-11 pr-4 py-3 text-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all'
      : 'w-[200px] bg-surface-2 border border-border text-text placeholder-muted rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-accent transition-all';

  return (
    <div className={containerClasses}>
      <form
        onSubmit={handleSubmit}
        className={
          variant === 'persistent'
            ? 'max-w-4xl mx-auto flex items-center'
            : 'relative'
        }
      >
        <div className="relative w-full">
          <div
            className={`absolute left-0 top-0 bottom-0 flex items-center pointer-events-none ${variant === 'hero' ? 'pl-4' : 'pl-3'}`}
          >
            <Search
              className={`text-muted ${variant === 'hero' ? 'w-5 h-5' : 'w-4 h-4'}`}
            />
          </div>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder={
              variant === 'hero' ? 'Enter stock ticker (e.g., MSFT)' : 'Ticker'
            }
            className={inputClasses}
            disabled={isLoading}
          />
          {variant === 'hero' && (
            <div className="absolute right-2 top-2 bottom-2">
              <button
                type="submit"
                disabled={isLoading || !ticker}
                className="h-full bg-accent text-bg px-4 rounded-md font-semibold text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Run'
                )}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
