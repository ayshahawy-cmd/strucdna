import React, { useEffect, useState } from 'react';
import { getUser, createBillingPortalSession } from '../services/dbService';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    // Simulate fetching user data
    const u = getUser();
    setUser(u);
    setLoading(false);
  }, []);

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const url = await createBillingPortalSession(user.stripe_customer_id);
      window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e.message || 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  // Helper for status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-positive';
      case 'past_due':
        return 'text-warning';
      case 'canceled':
        return 'text-critical';
      default:
        return 'text-muted';
    }
  };

  return (
    <div className="max-w-[480px] mx-auto w-full px-8 py-10 animate-fade-in">
      <h1 className="text-[11px] font-mono text-muted uppercase tracking-widest mb-8">
        ACCOUNT
      </h1>

      {/* Section 1: Current Plan */}
      <div className="mb-10">
        <div className="text-[11px] font-mono text-muted uppercase mb-2">
          CURRENT PLAN
        </div>
        <div className="bg-surface-3 border border-border-2 rounded-lg p-6">
          <div className="mb-6">
            <div className="text-[15px] text-accent font-semibold mb-1">
              Pro
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[12px] font-mono ${getStatusColor(user.subscription_status)}`}
              >
                {user.subscription_status}
              </span>
              <span className="text-xs text-muted">•</span>
              <span className="text-[13px] text-muted">{user.email}</span>
            </div>
            <div className="text-[12px] font-mono text-muted">
              Member since{' '}
              {new Date(user.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          <button
            onClick={handleManage}
            disabled={portalLoading}
            className="w-full bg-transparent border border-border rounded-md px-4 py-2.5 text-[13px] text-text hover:border-accent transition-colors text-left flex justify-between items-center group disabled:opacity-50"
          >
            <span>Manage subscription</span>
            {portalLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted" />
            ) : (
              <span className="text-muted group-hover:text-accent transition-colors">
                →
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Section 2: Danger Zone */}
      <div>
        <div className="text-[11px] font-mono text-critical uppercase tracking-widest mb-4">
          DANGER ZONE
        </div>
        <div className="bg-bg border border-critical/20 rounded-lg p-6">
          <p className="text-[13px] text-muted leading-[1.65] mb-6">
            Canceling ends your Pro access at the end of the current billing
            period. Your reports and thesis locks are saved and remain viewable.
            You will not be charged again.
          </p>
          <button
            onClick={handleManage}
            disabled={portalLoading}
            className="w-full bg-transparent border border-critical/40 rounded-md px-4 py-2.5 text-[13px] text-critical hover:border-critical transition-colors text-left disabled:opacity-50"
          >
            Cancel subscription
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
