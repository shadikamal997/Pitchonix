'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { ArrowLeft, Edit, FileText, Loader2, TrendingUp, Share2, Image as ImageIcon } from 'lucide-react';
import ShareProjectModal from '@/components/ShareProjectModal';
import { useToast } from '@/components/ToastProvider';
import { BrandAssetsModal } from '@/components/BrandAssetsModal';
import { QualityScoreBadge } from '@/components/quality/QualityScoreBadge';
import { GenerationProgress } from '@/components/quality/GenerationProgress';
import { ExportReadinessIndicator } from '@/components/quality/ExportReadinessIndicator';
import { getQualityReport, getGenerationStatus } from '@/lib/quality-api';
import type { QualityReport, GenerationStatus } from '@/types/quality';
import { BrandKitPicker, BrandKitBadge } from '@/features/brand-kits/BrandKitPicker';
import { useDeckBrandKit } from '@/features/brand-kits/useDeckBrandKit';

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
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
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
      <div className="min-h-screen bg-[#EDEBE6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4F7563] mx-auto mb-4" />
          <p className="text-[#6B6B6B]">Loading project…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#EDEBE6] flex items-center justify-center p-6">
        <div className="pn-card p-8 text-center max-w-sm">
          <p className="text-[#6B6B6B] mb-4">Project not found</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusTint =
    project.status === 'completed'  ? 'bg-[#E6F0EA] text-[#355846]' :
    project.status === 'generating' ? 'bg-[#FAEEDB] text-[#8c6210]' :
    project.status === 'failed'     ? 'bg-[#F7E3E3] text-[#9a3737]' :
    'bg-[#F1F0EC] text-[#6B6B6B]';

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      {/* Header */}
      <header className="bg-[#EDEBE6]/85 backdrop-blur-md border-b border-[#E3E1DA]/60 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="pn-h2 truncate">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-[#6B6B6B] truncate">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusTint}`}>
              {project.status}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="h-4 w-4 mr-1.5" />
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

      <BrandAssetsModal
        projectId={params.id}
        open={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        onApplied={() => fetchProject(true)}
      />

      <div className="container mx-auto px-4 py-8">
        {/* 3-column grid on desktop: 2 cols main content, 1 col quality sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {polling && (
              <div className="rounded-3xl bg-[#EEF5F1] border border-[#DDE8E1] p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#DDE8E1] flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-5 w-5 animate-spin text-[#4F7563]" />
                </div>
                <div>
                  <p className="text-[#263F34] font-semibold">Generating your deck…</p>
                  <p className="text-[#4F7563] text-sm">
                    This usually takes 10–30 seconds. We'll refresh automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Regenerate banner — appears when the project failed OR any deck is empty. */}
            {!polling && (project.status === 'failed' || project.decks.some((d) => (d.slides?.length || 0) === 0)) && (
              <div className="pn-card p-5 flex items-start gap-4 bg-[#F7F6F2]">
                <div className="w-11 h-11 rounded-full bg-[#EEF5F1] flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-[#4F7563]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="pn-h3">
                    {project.status === 'failed' ? "Generation didn't finish" : 'Empty deck — ready to auto-generate'}
                  </h3>
                  <p className="text-[13px] text-[#6B6B6B] mt-1 leading-relaxed">
                    {project.status === 'failed'
                      ? "The slide generator couldn't complete last time. Click below to retry — the system will rebuild every slide automatically from your project info."
                      : 'This deck has no slides yet. Click below and the system will auto-generate the full presentation for you.'}
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await api.post(`/generate/regenerate/${project.id}`);
                        setPolling(true);
                        fetchProject(true);
                        pollIntervalRef.current = setInterval(() => fetchProject(true), 3000);
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Could not start generation');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    size="sm"
                    className="mt-3"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                    {loading ? 'Starting…' : 'Auto-generate slides'}
                  </Button>
                </div>
              </div>
            )}

            {project.decks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h3 className="pn-h2 mb-1.5">No decks yet</h3>
                  <p className="text-[#6B6B6B] text-sm mb-4">
                    {project.status === 'generating'
                      ? 'Your deck is being generated…'
                      : project.status === 'draft'
                      ? 'This project is in draft mode.'
                      : "This project doesn't have any decks yet."}
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
                          toast.error(error.response?.data?.message || 'Failed to start generation');
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
                  <DeckCard key={deck.id} deck={deck} params={params} setShowBrandModal={setShowBrandModal} fetchProject={fetchProject} />
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
                <div className="rounded-3xl bg-[#FAEEDB] border border-[#F2DCAE] p-4 text-sm text-[#8c6210]">
                  <p className="font-semibold mb-1">Validation Issues Found</p>
                  <p>{qualityReport.validation.errorCount} error(s), {qualityReport.validation.warningCount} warning(s)</p>
                  <a href={`/projects/${project.id}/quality`} className="underline mt-1 inline-block font-semibold">
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

// =============================================================================
//  Phase 37.3D — DeckCard (extracted so we can use the useDeckBrandKit hook
//  per-deck rather than hoisting it into the parent).
// =============================================================================
function DeckCard({ deck, params, setShowBrandModal, fetchProject }: any) {
  const brand = useDeckBrandKit(deck.id);
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <CardTitle className="mb-0">{deck.title}</CardTitle>
              <BrandKitBadge kitId={brand.brandKitId} />
            </div>
            <p className="text-sm text-[#6B6B6B]">
              {deck.slides.length} slides • Created{' '}
              {new Date(deck.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2 items-center">
            {deck.slides && deck.slides.length > 0 && (
              <BrandKitPicker
                mode="apply"
                deckId={deck.id}
                value={brand.brandKitId}
                onApplied={async (newKitId) => {
                  if (newKitId === null) {
                    try { await api.patch(`/decks/${deck.id}`, { brandKitId: null }); }
                    catch { /* surfaced by picker */ }
                  }
                  brand.refresh();
                  fetchProject(true);
                }}
              />
            )}
            {deck.slides && deck.slides.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowBrandModal(true)}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload logo & photos
              </Button>
            )}
            <Link
              href={
                deck.slides && deck.slides.length > 0
                  ? `/projects/${params.id}/edit/${deck.slides[0].id}`
                  : `/projects/${params.id}/edit/${deck.id}?new=1`
              }
            >
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
          {deck.slides.slice(0, 8).map((slide: any) => (
            <Link
              key={slide.id}
              href={`/projects/${params.id}/edit/${slide.id}`}
              className="group block rounded-2xl border border-[#E3E1DA]/70 p-4 bg-white hover:shadow-soft hover:border-[#4F7563]/40 transition-all cursor-pointer"
            >
              <div className="text-[11px] text-[#9A9A9A] mb-1 flex items-center justify-between">
                <span>Slide {slide.order}</span>
                <span className="text-[#4F7563] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold uppercase tracking-wider">Edit →</span>
              </div>
              <div className="font-semibold text-sm text-[#111111] line-clamp-2">{slide.title}</div>
              <div className="text-[11px] text-[#9A9A9A] mt-1 capitalize">{slide.type}</div>
            </Link>
          ))}
        </div>
        {deck.slides.length > 8 && deck.slides[0]?.id && (
          <div className="mt-4 text-center">
            <Link href={`/projects/${params.id}/edit/${deck.slides[0].id}`}>
              <Button variant="outline" size="sm">
                View all {deck.slides.length} slides
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
