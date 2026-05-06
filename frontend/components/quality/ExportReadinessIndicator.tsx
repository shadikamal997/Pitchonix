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
}

export function ExportReadinessIndicator({
  deckId,
  onExport,
  onFixIssues,
  autoCheck = true,
  showExportButton = true,
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

  // Auto-check on mount
  useEffect(() => {
    if (autoCheck) {
      fetchReadiness();
    }
  }, [deckId, autoCheck]);

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
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Checking readiness...</span>
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

  // Determine status display
  const getStatusDisplay = () => {
    if (readiness.ready) {
      return {
        icon: <CheckCircle2 className="w-8 h-8 text-green-500" />,
        title: 'Ready to Export',
        message: 'Your presentation meets all requirements and is ready for export.',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        badgeVariant: 'default' as const,
      };
    }
    if (readiness.blockers.length > 0) {
      return {
        icon: <XCircle className="w-8 h-8 text-red-500" />,
        title: 'Not Ready',
        message: `${readiness.blockers.length} blocker${readiness.blockers.length !== 1 ? 's' : ''} must be fixed before exporting.`,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        badgeVariant: 'destructive' as const,
      };
    }
    return {
      icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
      title: 'Warning',
      message: 'Export is possible but not recommended. Please review the quality report.',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
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
              {readiness.ready ? 'Ready' : 'Not Ready'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          <motion.div
            className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} border rounded-lg p-4`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <motion.div
                  animate={readiness.ready ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {statusDisplay.icon}
                </motion.div>
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${statusDisplay.color} mb-1`}>
                  {statusDisplay.title}
                </h3>
                <p className={`text-sm ${statusDisplay.color}`}>
                  {statusDisplay.message}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Quality Metrics */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Quality Score</p>
              <p className="text-3xl font-bold text-gray-900">
                {readiness.qualityScore}<span className="text-xl text-gray-500">/100</span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Validation</p>
              <p className="text-2xl font-bold">
                {readiness.validationPassed ? (
                  <span className="text-green-600 flex items-center gap-2">✓ Passed</span>
                ) : (
                  <span className="text-red-600 flex items-center gap-2">✗ Failed</span>
                )}
              </p>
            </div>
          </div>

          {/* Blockers Preview */}
          {readiness.blockers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {readiness.blockers.length} Blocker{readiness.blockers.length !== 1 ? 's' : ''}:
              </p>
              <div className="space-y-1">
                {readiness.blockers.slice(0, 3).map((blocker, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{blocker}</span>
                  </div>
                ))}
                {readiness.blockers.length > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowBlockersDialog(true)}
                    className="p-0 h-auto text-xs"
                  >
                    +{readiness.blockers.length - 3} more
                  </Button>
                )}
              </div>
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
            {!readiness.ready && (
              <Button onClick={onFixIssues} variant="default" className="flex-1">
                Fix Issues
              </Button>
            )}
            <Button onClick={fetchReadiness} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blockers Dialog */}
      <Dialog open={showBlockersDialog} onOpenChange={setShowBlockersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Blockers</DialogTitle>
            <DialogDescription>
              The following issues must be resolved before exporting:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {readiness.blockers.map((blocker, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{blocker}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockersDialog(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowBlockersDialog(false); onFixIssues?.(); }}>
              Fix Issues
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
