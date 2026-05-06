'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Download, TrendingUp, AlertCircle } from 'lucide-react';
import {
  QualityScoreBadge,
  QualityDimensionChart,
  ValidationIssues,
  ExportReadinessIndicator,
  StageIndicator,
  QualityTrendsChart,
  QualityComparison,
  QualityHistoryTable,
} from '@/components/quality';
import { getQualityReport, validateDeck, getGenerationStatus } from '@/lib/quality-api';
import { runQualityCheck } from '@/lib/quality-history-api';
import api from '@/lib/api';
import type { QualityReport, ValidationResult, GenerationStatus } from '@/types/quality';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  decks: Array<{ id: string; title: string; status: string }>;
}

export default function QualityDashboardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'history'>('overview');

  useEffect(() => {
    fetchAllData();
  }, [params.id]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch project
      const projectResponse = await api.get(`/projects/${params.id}`);
      setProject(projectResponse.data);

      if (projectResponse.data.decks && projectResponse.data.decks.length > 0) {
        const deckId = projectResponse.data.decks[0].id;

        // Fetch quality report
        try {
          const quality = await getQualityReport(deckId);
          setQualityReport(quality);
        } catch (err) {
          console.error('Failed to fetch quality report:', err);
        }

        // Fetch validation result
        try {
          const validation = await validateDeck(deckId);
          setValidationResult(validation);
        } catch (err) {
          console.error('Failed to fetch validation:', err);
        }

        // Fetch generation status if generating
        if (projectResponse.data.status === 'generating') {
          try {
            const status = await getGenerationStatus(deckId);
            setGenerationStatus(status);
          } catch (err) {
            console.error('Failed to fetch generation status:', err);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quality data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleRunValidation = async () => {
    if (!project?.decks[0]?.id) return;

    setRefreshing(true);
    try {
      const validation = await validateDeck(project.decks[0].id);
      setValidationResult(validation);
    } catch (err) {
      console.error('Failed to run validation:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunQualityCheck = async () => {
    if (!project?.decks[0]?.id) return;

    setRefreshing(true);
    try {
      await runQualityCheck(project.decks[0].id);
      // Refresh all data after quality check
      await fetchAllData();
    } catch (err) {
      console.error('Failed to run quality check:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading quality data...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-2">Failed to Load</p>
            <p className="text-gray-600 mb-4">{error || 'Project not found'}</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (project.decks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-2">No Decks Available</p>
            <p className="text-gray-600 mb-4">
              This project doesn't have any decks yet.
            </p>
            <Link href={`/projects/${project.id}`}>
              <Button>Back to Project</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href={`/projects/${project.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Quality Dashboard</h1>
                <p className="text-sm text-gray-600">{project.name}</p>
              </div>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Alert if generating */}
        {project.status === 'generating' && (
          <Alert className="mb-6">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Generation is in progress. Quality metrics may be incomplete.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Top Row: Overall Score and Dimensions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Quality Score */}
            {qualityReport && (
              <QualityScoreBadge
                score={qualityReport.overall}
                grade={qualityReport.grade}
                dimensions={qualityReport.dimensions}
                size="lg"
                showTrend={false}
              />
            )}

            {/* Quality Dimensions Chart */}
            {qualityReport && (
              <QualityDimensionChart
                dimensions={qualityReport.dimensions}
                title="Quality Breakdown"
                description="Detailed analysis across four dimensions"
              />
            )}
          </div>

          {/* Generation Status (if generating) */}
          {generationStatus && !generationStatus.completed && (
            <StageIndicator
              currentStage={generationStatus.progress.stage}
              completedStages={[]}
              failedStages={generationStatus.status === 'FAILED' ? [generationStatus.progress.stage] : []}
            />
          )}

          {/* Export Readiness */}
          <ExportReadinessIndicator
            deckId={project.decks[0].id}
            showExportButton={true}
            onExport={() => {
              router.push(`/editor/${project.decks[0].id}`);
            }}
          />

          {/* Recommendations */}
          {qualityReport && qualityReport.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {qualityReport.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-blue-900">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Issues */}
          {validationResult && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Validation Results</h2>
                <Button onClick={handleRunValidation} disabled={refreshing} size="sm" variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Re-run Validation
                </Button>
              </div>
              <ValidationIssues
                issues={validationResult.issues}
                title="Issues Found"
                showSearch={true}
                showFilters={true}
                onSlideClick={(slideIndex) => {
                  router.push(`/editor/${project.decks[0].id}#slide-${slideIndex}`);
                }}
              />
            </div>
          )}

          {/* Quality History (Placeholder for future) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quality Trends & History</CardTitle>
                <Button onClick={handleRunQualityCheck} disabled={refreshing} size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Run Quality Check
                </Button>
              </div>
              {/* Tab Navigation */}
              <div className="flex space-x-2 mt-4 border-b">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('trends')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'trends'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Trends
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  History
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <QualityComparison deckId={project.decks[0].id} />
                </div>
              )}

              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <div className="space-y-6">
                  <QualityTrendsChart 
                    deckId={project.decks[0].id} 
                    showDimensions={true}
                  />
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <QualityHistoryTable deckId={project.decks[0].id} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/editor/${project.decks[0].id}`)}
                >
                  Open Editor
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRunValidation}
                  disabled={refreshing}
                >
                  Run Validation
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.print()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
