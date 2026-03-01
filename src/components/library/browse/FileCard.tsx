'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { languages } from '@/config/languages';
import { plannerTypes } from '@/config/planner-types';
import { themes } from '@/config/themes';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import type { FileInfo } from '@/types';

interface FileCardProps {
  file: FileInfo;
  accessCode: string;
}

export function FileCard({ file, accessCode }: FileCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const language = languages[file.language];
  const plannerType = plannerTypes[file.plannerType];
  const theme = themes[file.theme];

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadComplete(false);

    try {
      const response = await fetch(`/api/library/download/${file.key}`, {
        headers: {
          'x-access-code': accessCode,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'planner.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadComplete(true);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{language.flag}</span>
            <CardTitle className="text-base">{plannerType.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {plannerType.templateCount}+
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border"
              style={{ backgroundColor: theme.previewColor }}
            />
            <span className="text-sm text-muted-foreground">{theme.name}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {file.weekStart === 'monday' ? 'Mon' : 'Sun'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {file.timeFormat}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {file.calendar === 'none' ? 'No Cal' : file.calendar}
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : downloadComplete ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Done
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-1" />
              Download
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
