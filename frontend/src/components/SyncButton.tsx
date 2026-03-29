import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { useState } from 'react';

export function SyncButton() {
  const { fetchApi } = useApi();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const data = await fetchApi<{ videos_synced: number }>('/youtube/sync', {
        method: 'POST',
      });

      // Reload to show updated videos
      window.location.reload();
      alert(`Successfully synced ${data.videos_synced} videos!`);
    } catch (error) {
      alert('Error syncing videos. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Sync from YouTube'}
    </Button>
  );
}
