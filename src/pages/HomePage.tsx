import React from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { Layers } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSearch = (ticker: string) => {
    navigate(`/report/${ticker}`);
  };

  const examples = ['MSFT', 'AAPL', 'NVDA', 'TSLA'];

  return (
    <div className="flex-1 flex flex-col items-center justify-center pb-32 px-4 animate-fade-in">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-surface-2 rounded-2xl flex items-center justify-center border border-border shadow-2xl mb-6">
          <Layers className="w-8 h-8 text-accent" />
        </div>

        <h1
          style={{
            fontSize: '42px',
            fontWeight: 700,
            color: '#F0EDE8',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          Lock a thesis.
          <br />
          Know when it breaks.
        </h1>

        <p
          style={{
            fontSize: '15px',
            color: '#8A8A8A',
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: '380px',
            margin: '0 auto 32px',
          }}
        >
          AI-assisted company research and a personal thesis journal. This
          prototype uses model knowledge, without live filing retrieval. Verify
          claims against original sources.
        </p>
      </div>

      <SearchBar onSearch={handleSearch} variant="hero" />

      <div className="mt-12 flex gap-4 text-xs text-muted">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => handleSearch(ex)}
            className="bg-surface-2 px-3 py-1.5 rounded border border-border-2 hover:border-accent hover:text-text transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
