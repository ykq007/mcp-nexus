/**
 * KeyRevealCell — wraps the shared KeyReveal component with the admin API.
 * Handles Tavily and Brave key reveal via the appropriate api method.
 */
import React from 'react';
import type { AdminApi } from '../lib/adminApi';
import { KeyReveal } from '../ui/Reveal';
import { useToast } from '../ui/toast';

interface KeyRevealCellProps {
  keyId: string;
  maskedKey: string;
  api: AdminApi;
  /** 'tavily' (default) or 'brave' — determines which reveal endpoint to call */
  provider?: 'tavily' | 'brave';
}

export function KeyRevealCell({ keyId, maskedKey, api, provider = 'tavily' }: KeyRevealCellProps) {
  const toast = useToast();

  const handleReveal = async (): Promise<string> => {
    try {
      if (provider === 'brave') {
        const { apiKey } = await api.revealBraveKey(keyId);
        return apiKey;
      }
      const { apiKey } = await api.revealKey(keyId);
      return apiKey;
    } catch (e: any) {
      toast.push({ title: 'Reveal failed', message: e.message || 'Error', variant: 'error' });
      throw e;
    }
  };

  return (
    <KeyReveal
      maskedValue={maskedKey}
      onReveal={handleReveal}
      copyLabel="Copy key"
    />
  );
}
