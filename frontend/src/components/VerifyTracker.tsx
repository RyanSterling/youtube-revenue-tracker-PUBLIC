'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface VerifyTrackerProps {
  destinationUrl: string;
  slug: string;
}

export function VerifyTracker({ destinationUrl, slug }: VerifyTrackerProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'wrong_slug' | 'not_found' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const verify = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/verify-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: destinationUrl, slug }),
      });
      const data = await res.json();
      setStatus(data.status);
      setMessage(data.message);
    } catch {
      setStatus('error');
      setMessage('Could not reach verification service');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="secondary" onClick={verify} disabled={status === 'loading'}>
        {status === 'loading' ? 'Checking...' : 'Verify Installation'}
      </Button>
      {status === 'ok' && (
        <span className="flex items-center gap-1.5 text-xs text-green-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {message}
        </span>
      )}
      {(status === 'not_found' || status === 'wrong_slug' || status === 'error') && (
        <span className="flex items-center gap-1.5 text-xs text-red-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {message}
        </span>
      )}
    </div>
  );
}
