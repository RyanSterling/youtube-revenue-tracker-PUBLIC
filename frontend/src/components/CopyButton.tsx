'use client';

import { Button } from '@/components/ui/Button';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-sm text-accent-primary hover:text-accent-hover transition-colors duration-200"
    >
      {label}
    </button>
  );
}
