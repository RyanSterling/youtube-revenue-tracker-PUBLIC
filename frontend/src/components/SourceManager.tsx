'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { SourceIcon, SOURCE_PRESETS } from '@/components/SourceIcon';
import { useApi } from '@/hooks/useApi';

interface Source {
  id: string;
  name: string;
  slug: string;
  type: string;
  created_at: string;
}

interface SourceManagerProps {
  offerId: string;
  username: string;
  baseUrl?: string;
}

// Convert friendly name to URL-safe slug
function toUrlSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function SourceManager({ offerId, username, baseUrl = '' }: SourceManagerProps) {
  const { fetchApi } = useApi();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('custom');
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Email link builder state
  const [buildingLinkForSource, setBuildingLinkForSource] = useState<Source | null>(null);
  const [emailName, setEmailName] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchSources();
  }, [offerId]);

  async function fetchSources() {
    try {
      const data = await fetchApi<{ sources: Source[] }>(`/sources?offer_id=${offerId}`);
      setSources(data.sources || []);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
      setSources([]);
    }
    setLoading(false);
  }

  async function createSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSourceName.trim()) return;

    setCreating(true);
    try {
      const data = await fetchApi<{ source: Source }>('/sources', {
        method: 'POST',
        body: JSON.stringify({
          offer_id: offerId,
          name: newSourceName.trim(),
          slug: toUrlSlug(newSourceName.trim()),
          type: selectedType
        })
      });
      setSources([data.source, ...sources]);
      setNewSourceName('');
      setSelectedType('custom');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create source:', error);
    }
    setCreating(false);
  }

  function selectPreset(type: string, label: string) {
    setSelectedType(type);
    setNewSourceName(label);
  }

  async function deleteSource(id: string) {
    if (!confirm('Delete this tracking link? This cannot be undone.')) return;

    try {
      await fetchApi(`/sources/${id}`, { method: 'DELETE' });
      setSources(sources.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  }

  // Generate base URL for tracking links
  const trackingBaseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  function getSourceUrl(slug: string): string {
    return `${trackingBaseUrl}/u/${username}/l/${slug}`;
  }

  function copyToClipboard(slug: string, id: string) {
    const url = getSourceUrl(slug);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getEmailLinkUrl(slug: string, emailNameValue: string): string {
    const emailSlug = toUrlSlug(emailNameValue);
    if (emailSlug) {
      return `${getSourceUrl(slug)}?email=${emailSlug}`;
    }
    return getSourceUrl(slug);
  }

  function copyEmailLink() {
    if (!buildingLinkForSource) return;
    const url = getEmailLinkUrl(buildingLinkForSource.slug, emailName);
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function closeLinkBuilder() {
    setBuildingLinkForSource(null);
    setEmailName('');
    setLinkCopied(false);
  }

  if (loading) {
    return <div className="text-sm text-foreground-tertiary">Loading tracking links...</div>;
  }

  return (
    <div className="mt-6 pt-6 border-t border-border-primary">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-foreground-secondary">Tracking Links</h4>
        {!showForm && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            + Add Link
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createSource} className="mb-4 p-4 bg-background-tertiary rounded-soft border border-border-primary">
          <label className="block text-sm font-medium text-foreground-secondary mb-3">
            Quick Add
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            {SOURCE_PRESETS.map((preset) => (
              <button
                key={preset.type}
                type="button"
                onClick={() => selectPreset(preset.type, preset.label)}
                className={`flex items-center gap-2 px-3 py-2 rounded-soft border transition-colors ${
                  selectedType === preset.type
                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                    : 'bg-background-secondary border-border-primary text-foreground-secondary hover:border-foreground-tertiary'
                }`}
              >
                <SourceIcon type={preset.type} size={18} />
                <span className="text-sm">{preset.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setSelectedType('custom'); setNewSourceName(''); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-soft border transition-colors ${
                selectedType === 'custom'
                  ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                  : 'bg-background-secondary border-border-primary text-foreground-secondary hover:border-foreground-tertiary'
              }`}
            >
              <SourceIcon type="custom" size={18} />
              <span className="text-sm">Custom</span>
            </button>
          </div>

          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            Source Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder={selectedType === 'custom' ? 'e.g., Podcast Episode 1, Newsletter CTA' : `e.g., ${selectedType === 'tiktok' ? 'TikTok Bio' : selectedType === 'instagram' ? 'Instagram Story' : selectedType === 'email' ? 'Welcome Email' : 'YouTube Collab'}`}
              className="flex-1 px-3 py-2 bg-background-secondary border border-border-primary rounded-soft text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={creating || !newSourceName.trim()}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => { setShowForm(false); setSelectedType('custom'); setNewSourceName(''); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Email Link Builder Modal */}
      {buildingLinkForSource && (
        <div className="mb-4 p-4 bg-background-tertiary rounded-soft border border-accent-primary">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-foreground-primary">
              Build Email Link for {buildingLinkForSource.name}
            </h5>
            <button
              onClick={closeLinkBuilder}
              className="text-foreground-tertiary hover:text-foreground-primary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <label className="block text-sm text-foreground-secondary mb-2">
            Email Name (e.g., "Day 3 - Case Study")
          </label>
          <input
            type="text"
            value={emailName}
            onChange={(e) => setEmailName(e.target.value)}
            placeholder="Day 3 - Case Study"
            className="w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-soft text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary mb-3"
            autoFocus
          />

          <label className="block text-sm text-foreground-secondary mb-2">
            Your Link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 bg-background-secondary border border-border-primary rounded-soft text-foreground-tertiary text-xs font-mono truncate">
              {getEmailLinkUrl(buildingLinkForSource.slug, emailName)}
            </div>
            <Button
              size="sm"
              onClick={copyEmailLink}
            >
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          <p className="text-xs text-foreground-tertiary mt-3">
            This link will track which specific email drove the click.
          </p>
        </div>
      )}

      {sources.length === 0 ? (
        <p className="text-sm text-foreground-tertiary">
          No tracking links yet. Add one to track clicks from TikTok, Instagram, email, etc.
        </p>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-3 bg-background-tertiary rounded-soft border border-border-primary"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <SourceIcon type={source.type || 'custom'} size={24} className="flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-foreground-primary text-sm">{source.name}</div>
                  <div className="text-xs text-foreground-tertiary mt-1 font-mono truncate">
                    {getSourceUrl(source.slug)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {source.type === 'email' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setBuildingLinkForSource(source);
                      setEmailName('');
                      setLinkCopied(false);
                    }}
                  >
                    Build Link
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyToClipboard(source.slug, source.id)}
                >
                  {copiedId === source.id ? 'Copied!' : 'Copy URL'}
                </Button>
                <button
                  onClick={() => deleteSource(source.id)}
                  className="text-foreground-tertiary hover:text-red-400 transition-colors p-1"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
