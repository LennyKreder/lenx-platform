'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface DownloadTriggerProps {
  token: string;
  buttonLabel: string;
}

export function DownloadTrigger({ token, buttonLabel }: DownloadTriggerProps) {
  const triggered = useRef(false);

  const downloadUrl = `/api/samples/download?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    // Use a hidden iframe to trigger the download without navigating away
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    // Clean up iframe after a delay
    const timeout = setTimeout(() => {
      document.body.removeChild(iframe);
    }, 30000);

    return () => clearTimeout(timeout);
  }, [downloadUrl]);

  return (
    <Button asChild size="lg">
      <a href={downloadUrl}>
        {buttonLabel}
      </a>
    </Button>
  );
}
