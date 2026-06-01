'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { checkExportReadiness } from '@/lib/quality-api';
import type { ExportReadiness } from '@/types/quality';

interface ExportReadinessIndicatorProps {
  deckId: string;
  onExport?: () => void;
  onFixIssues?: () => void;
  autoCheck?: boolean;
  showExportButton?: boolean;
  /** Increment this to force the card to re-fetch readiness (e.g. after running a quality check). */
  refreshTrigger?: number;
}

export function ExportReadinessIndicator({
  deckId,
  onExport,
  onFixIssues,
  autoCheck = true,
  showExportButton = true,
  refreshTrigger = 0,
}: ExportReadinessIndicatorProps) {
  const [readiness, setReadiness] = useState<ExportReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBlockersDialog, setShowBlockersDialog] = useState(false);

  // Fetch export readiness
  const fetchReadiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkExportReadiness(deckId);
      setReadiness(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check export readiness');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount, deckId change, or when parent increments refreshTrigger.
  useEffect(() => {
    if (autoCheck) {
      fetchReadiness();
    }
  }, [deckId, autoCheck, refreshTrigger]);

  // Handle export click
  const handleExport = () => {
    if (!readiness) return;

    if (readiness.ready) {
      onExport?.();
    } else {
      setShowBlockersDialog(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-[#C9C6BD]" />
            <span className="ml-2 text-[#6B6B6B]">Checking readiness...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!readiness) return null;

  // "Quality check not yet performed" is a special state — no real blockers exist yet,
  // the deck just hasn't been scored. Show a distinct prompt instead of "Not Ready".
  const needsFirstCheck =
    !readiness.ready &&
    readiness.blockers?.length === 1 &&
    readiness.blockers[0] === 'Quality check not yet performed';

  if (needsFirstCheck) {
    return (
      <Card className="border-2 border-dashed border-[#D4D2CB]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-xl">
            <span>Export Readiness</span>
            <Badge variant="secondary" className="text-sm px-3 py-1">Not Checked</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <div className="w-14 h-14 rounded-full bg-[#F1F0EC] flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-[#9A9A9A]" />
            </div>
            <div>
              <p className="font-semibold text-[#111111] mb-1">No quality check has been run yet</p>
              <p className="text-sm text-[#9A9A9A] max-w-sm">
                Run a quality check to see your score, find validation issues, and determine if this deck is ready to export.
              </p>
            </div>
            <Button
              onClick={onFixIssues}
              className="gap-2 px-6"
              disabled={!onFixIssues}
            >
              <RefreshCw className="w-4 h-4" />
              Run Quality Check
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normal states — ready / warnings / real blockers
  const getStatusDisplay = () => {
    if (readiness.ready) {
      return {
        icon: <CheckCircle2 className="w-8 h-8 text-green-500" />,
        title: 'Ready to Export',
        message: 'Your presentation meets all requirements and is ready for export.',
        color: 'text-[#355846]',
        bgColor: 'bg-[#EEF5F1]',
        borderColor: 'border-[#DDE8E1]',
        badgeLabel: 'Ready',
        badgeVariant: 'default' as const,
      };
    }
    if ((readiness.blockers?.length ?? 0) > 0) {
      return {
        icon: <XCircle className="w-8 h-8 text-[#D96A6A]" />,
        title: 'Not Ready to Export',
        message: `${readiness.blockers.length} issue${readiness.blockers.length !== 1 ? 's' : ''} must be resolved before exporting.`,
        color: 'text-[#7a2929]',
        bgColor: 'bg-[#FCF1F1]',
        borderColor: 'border-[#F7E3E3]',
        badgeLabel: 'Not Ready',
        badgeVariant: 'destructive' as const,
      };
    }
    return {
      icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
      title: 'Export with Caution',
      message: 'Export is possible but quality could be improved.',
      color: 'text-[#735008]',
      bgColor: 'bg-[#FAEEDB]',
      borderColor: 'border-[#F2DCAE]',
      badgeLabel: 'Review Needed',
      badgeVariant: 'secondary' as const,
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <>
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <span>Export Readiness</span>
            <Badge variant={statusDisplay.badgeVariant} className="text-sm px-3 py-1">
              {statusDisplay.badgeLabel}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status banner */}
          <motion.div
            className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} border rounded-lg p-4`}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">{statusDisplay.icon}</div>
              <div className="flex-1">
                <h3 className={`text-base font-semibold ${statusDisplay.color} mb-0.5`}>
                  {statusDisplay.title}
                </h3>
                <p className={`text-sm ${statusDisplay.color}`}>{statusDisplay.message}</p>
              </div>
            </div>
          </motion.div>

          {/* Score + validation row */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[#F8F7F4] rounded-lg">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9A9A9A] mb-1.5">Quality Score</p>
              <p className="text-3xl font-bold text-[#111111]">
                {readiness.qualityScore ?? '—'}
                <span className="text-lg text-[#C9C6BD]">/100</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9A9A9A] mb-1.5">Validation</p>
              {readiness.validationPassed == null ? (
                <p className="text-base font-semibold text-[#C9C6BD]">— Not checked</p>
              ) : readiness.validationPassed ? (
                <p className="text-base font-semibold text-[#4F7563] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Passed
                </p>
              ) : (
                <p className="text-base font-semibold text-[#9a3737] flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Failed
                </p>
              )}
            </div>
          </div>

          {/* Blockers list */}
          {(readiness.blockers?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#111111]">
                {readiness.blockers.length} Blocker{readiness.blockers.length !== 1 ? 's' : ''}
              </p>
              {readiness.blockers.slice(0, 3).map((blocker, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[#7a2929] bg-[#FCF1F1] border border-[#F7E3E3] rounded px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{blocker}</span>
                </div>
              ))}
              {readiness.blockers.length > 3 && (
                <button
                  onClick={() => setShowBlockersDialog(true)}
                  className="text-xs text-[#4F7563] underline pl-1"
                >
                  +{readiness.blockers.length - 3} more
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {showExportButton && readiness.ready && (
              <Button onClick={handleExport} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export Presentation
              </Button>
            )}
            {!readiness.ready && onFixIssues && (
              <Button onClick={onFixIssues} variant="default" className="flex-1">
                Fix Issues
              </Button>
            )}
            <Button onClick={fetchReadiness} variant="outline" size="icon" title="Re-check readiness">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blockers detail dialog */}
      <Dialog open={showBlockersDialog} onOpenChange={setShowBlockersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What's blocking export?</DialogTitle>
            <DialogDescription>
              Resolve each of these issues, then re-run the quality check.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {readiness.blockers?.map((blocker, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-[#FCF1F1] rounded border border-[#F7E3E3]">
                <AlertCircle className="w-4 h-4 text-[#D96A6A] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#7a2929]">{blocker}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockersDialog(false)}>Close</Button>
            {onFixIssues && (
              <Button onClick={() => { setShowBlockersDialog(false); onFixIssues(); }}>
                Run Quality Check
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
