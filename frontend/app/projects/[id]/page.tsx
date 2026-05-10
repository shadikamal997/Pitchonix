'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { ArrowLeft, Edit, FileText, Loader2, TrendingUp, Share2 } from 'lucide-react';
import ShareProjectModal from '@/components/ShareProjectModal';
import { QualityScoreBadge } from '@/components/quality/QualityScoreBadge';
import { GenerationProgress } from '@/components/quality/GenerationProgress';
import { ExportReadinessIndicator } from '@/components/quality/ExportReadinessIndicator';
import { getQualityReport, getGenerationStatus } from '@/lib/quality-api';
import type { QualityReport, GenerationStatus } from '@/types/quality';

interface Deck {
  id: string;
  title: string;
  status: string;
  slides: any[];
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  decks: Deck[];
  businessInfo?: Record<string, any>;
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPolling(false);
  };

  useEffect(() => {
    fetchProject();
    return () => stopPolling();
  }, [params.id]);

  const fetchProject = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const response = await api.get(`/projects/${params.id}`);
      setProject(response.data);

      // Fetch quality data if deck exists
      if (response.data.decks && response.data.decks.length > 0) {
        const deckId = response.data.decks[0].id;
        
        // Fetch generation status if generating
        if (response.data.status === 'generating') {
          try {
            const status = await getGenerationStatus(deckId);
            setGenerationStatus(status);
          } catch (error) {
            console.error('Failed to fetch generation status:', error);
          }
        }

        // Fetch quality report if completed
        if (response.data.status === 'completed') {
          try {
            const quality = await getQualityReport(deckId);
            setQualityReport(quality);
          } catch (error) {
            console.error('Failed to fetch quality report:', error);
          }
        }
      }

      // Manage polling interval based on status
      if (response.data.status === 'completed' || response.data.status === 'failed') {
        stopPolling();
      } else if (response.data.status === 'generating' && !pollIntervalRef.current) {
        setPolling(true);
        pollIntervalRef.current = setInterval(() => fetchProject(true), 3000);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-4">Project not found</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-600">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : project.status === 'generating'
                  ? 'bg-blue-100 text-blue-700'
                  : project.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {project.status}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <ShareProjectModal
        projectId={params.id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      <div className="container mx-auto px-4 py-8">
        {/* 3-column grid on desktop: 2 cols main content, 1 col quality sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {polling && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-3" />
                <div>
                  <p className="text-blue-900 font-medium">Generating your deck...</p>
                  <p className="text-blue-700 text-sm">
                    This usually takes 10-30 seconds. We'll refresh automatically.
                  </p>
                </div>
              </div>
            )}

            {project.decks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No decks yet</h3>
                  <p className="text-gray-600 mb-4">
                    {project.status === 'generating'
                      ? 'Your deck is being generated...'
                      : project.status === 'draft'
                      ? 'This project is in draft mode.'
                      : 'This project doesnt have any decks yet.'}
                  </p>
                  {project.status === 'draft' && (
                    <Button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await api.post('/generate', {
                            projectId: project.id,
                            input: project.businessInfo || {},
                          });
                          fetchProject(); // Refresh to show generating status
                        } catch (error: any) {
                          console.error('Failed to start generation:', error);
                          alert(error.response?.data?.message || 'Failed to start generation');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      {loading ? 'Starting...' : 'Generate Deck'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {project.decks.map((deck) => (
                  <Card key={deck.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="mb-2">{deck.title}</CardTitle>
                          <p className="text-sm text-gray-600">
                            {deck.slides.length} slides • Created{' '}
                            {new Date(deck.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/editor/${deck.id}`}>
                            <Button>
                              <Edit className="h-4 w-4 mr-2" />
                              Open Editor
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {deck.slides.slice(0, 8).map((slide, index) => (
                          <div
                            key={slide.id}
                            className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/editor/${deck.id}#slide-${index}`)}
                          >
                            <div className="text-xs text-gray-500 mb-1">Slide {slide.order}</div>
                            <div className="font-medium text-sm line-clamp-2">{slide.title}</div>
                            <div className="text-xs text-gray-500 mt-1 capitalize">{slide.type}</div>
                          </div>
                        ))}
                      </div>
                      {deck.slides.length > 8 && (
                        <div className="mt-4 text-center">
                          <Link href={`/editor/${deck.id}`}>
                            <Button variant="outline" size="sm">
                              View all {deck.slides.length} slides
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quality Sidebar */}
          {project.decks.length > 0 && (
            <div className="space-y-6">
              {/* Quality Score */}
              {qualityReport && (
                <QualityScoreBadge
                  score={qualityReport.overall}
                  grade={qualityReport.grade}
                  dimensions={qualityReport.dimensions}
                  size="md"
                />
              )}

              {/* Generation Progress (if generating) */}
              {polling && generationStatus && (
                <GenerationProgress
                  deckId={project.decks[0].id}
                  autoRefresh={true}
                  refreshInterval={2000}
                  onComplete={(status) => {
                    console.log('Generation complete:', status);
                    fetchProject();
                  }}
                />
              )}

              {/* Export Readiness */}
              <ExportReadinessIndicator
                deckId={project.decks[0].id}
                showExportButton={true}
                onExport={() => {
                  router.push(`/editor/${project.decks[0].id}`);
                }}
                onFixIssues={() => {
                  router.push(`/projects/${project.id}/quality`);
                }}
              />

              {/* Validation Summary (link to quality page for full details) */}
              {qualityReport && qualityReport.validation.totalIssues > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                  <p className="font-medium mb-1">Validation Issues Found</p>
                  <p>{qualityReport.validation.errorCount} error(s), {qualityReport.validation.warningCount} warning(s)</p>
                  <a href={`/projects/${project.id}/quality`} className="underline mt-1 inline-block">
                    View full validation report
                  </a>
                </div>
              )}

              {/* Link to Quality Dashboard */}
              <Card>
                <CardContent className="p-4">
                  <Link href={`/projects/${project.id}/quality`}>
                    <Button variant="outline" className="w-full">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Quality Dashboard
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
