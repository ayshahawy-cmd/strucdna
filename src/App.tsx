import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import ThesesPage from './pages/ThesesPage';
import SharePage from './pages/SharePage';
import { Toaster } from 'react-hot-toast';
import { runPulseCheck } from './services/pulseService';
import { getUser } from './services/dbService';

const App: React.FC = () => {
  // Run Pulse Check for paid users on app load
  useEffect(() => {
    const user = getUser();
    if (user.tier === 'paid') {
      runPulseCheck(user);
    }
  }, []);

  return (
    <HashRouter>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#2A2A2A',
            color: '#E8E8E8',
            border: '1px solid #3A3A3A',
          },
        }}
      />
      <Routes>
        <Route path="/share" element={<SharePage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="report/:ticker" element={<ReportPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="theses" element={<ThesesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
