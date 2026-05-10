import React from 'react';
import { CoverPage } from './pages/CoverPage';
import { ContentPage } from './pages/ContentPage';
import { StatsPage } from './pages/StatsPage';
import { TimelinePage } from './pages/TimelinePage';
import { ClosingPage } from './pages/ClosingPage';

export function BusinessFlyerTemplatePreview() {
  return (
    <div className="grid gap-2">
      <CoverPage />
      <div className="grid grid-cols-2 gap-2">
        <ContentPage />
        <StatsPage />
        <TimelinePage />
        <ClosingPage />
      </div>
    </div>
  );
}
