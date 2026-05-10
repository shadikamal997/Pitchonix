'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import EnhancementPanel from '@/components/editor/EnhancementPanel';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import api from '@/lib/api';
import {
  ArrowLeft,
  Download,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
} from 'lucide-react';

interface Slide {
  id: string;
  type: string;
  order: number;
  title: string;
  subtitle?: string;
  content: any;
  speakerNotes?: string;
}

interface Deck {
  id: string;
  title: string;
  slides: Slide[];
  project: {
    id: string;
    name: string;
  };
}

export default function EditorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [editedSlide, setEditedSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchDeck();
  }, [params.id]);

  useEffect(() => {
    if (deck && deck.slides[currentSlideIndex]) {
      setEditedSlide({ ...deck.slides[currentSlideIndex] });
    }
  }, [currentSlideIndex, deck]);

  const fetchDeck = async () => {
    try {
      const response = await api.get(`/decks/${params.id}`);
      setDeck(response.data);
    } catch (error) {
      console.error('Failed to fetch deck:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSlide = async () => {
    if (!editedSlide) return;

    setSaving(true);
    setSaveMessage(null);
    try {
      await api.patch(`/slides/${editedSlide.id}`, {
        title: editedSlide.title,
        subtitle: editedSlide.subtitle,
        content: editedSlide.content,
        speakerNotes: editedSlide.speakerNotes,
      });

      // Update local state
      if (deck) {
        const updatedSlides = [...deck.slides];
        updatedSlides[currentSlideIndex] = editedSlide;
        setDeck({ ...deck, slides: updatedSlides });
      }

      setSaveMessage({ type: 'success', text: 'Slide saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save slide. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.post(
        '/export/pptx',
        { deckId: params.id },
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${deck?.title || 'presentation'}.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to export deck. Please try again.' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!deck || deck.slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Deck not found or has no slides</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentSlide = deck.slides[currentSlideIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Bar */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href={`/projects/${deck.project.id}`}>
            <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-white">
            <h1 className="font-semibold">{deck.title}</h1>
            <p className="text-xs text-gray-400">{deck.project.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <PresenceIndicator documentId={params.id} />
          {saveMessage && (
            <span
              className={`text-sm px-3 py-1 rounded-lg ${
                saveMessage.type === 'success'
                  ? 'bg-green-800 text-green-100'
                  : 'bg-red-800 text-red-100'
              }`}
            >
              {saveMessage.text}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveSlide}
            disabled={saving}
            className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export PPTX
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Slide List */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-white font-semibold mb-3">Slides ({deck.slides.length})</h2>
            <div className="space-y-2">
              {deck.slides.map((slide, index) => (
                <div
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    index === currentSlideIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-xs mb-1">Slide {slide.order}</div>
                  <div className="font-medium text-sm line-clamp-2">{slide.title}</div>
                  <div className="text-xs mt-1 opacity-75 capitalize">{slide.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Slide Preview */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
              disabled={currentSlideIndex === 0}
              className="text-white hover:text-white hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-white text-sm">
              Slide {currentSlideIndex + 1} of {deck.slides.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentSlideIndex(Math.min(deck.slides.length - 1, currentSlideIndex + 1))
              }
              disabled={currentSlideIndex === deck.slides.length - 1}
              className="text-white hover:text-white hover:bg-gray-700"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Slide Canvas */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-5xl aspect-video bg-white rounded-lg shadow-2xl p-12 overflow-auto">
              {/* Slide Content Preview */}
              <div className="h-full flex flex-col">
                <h1 className="text-4xl font-bold mb-4 text-gray-900">{currentSlide.title}</h1>
                {currentSlide.subtitle && (
                  <h2 className="text-2xl text-gray-600 mb-6">{currentSlide.subtitle}</h2>
                )}
                <div className="flex-1 text-gray-700">
                  {currentSlide.type === 'cover' && (
                    <div className="text-center mt-8">
                      <p className="text-xl">{currentSlide.content.tagline}</p>
                    </div>
                  )}
                  {(currentSlide.type === 'problem' || currentSlide.type === 'solution') && (
                    <div>
                      <p className="mb-4">{currentSlide.content.description}</p>
                      {currentSlide.content.painPoints && (
                        <ul className="list-disc pl-6 space-y-2">
                          {currentSlide.content.painPoints.map((point: string, i: number) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      )}
                      {currentSlide.content.features && (
                        <ul className="list-disc pl-6 space-y-2">
                          {currentSlide.content.features.map((feature: string, i: number) => (
                            <li key={i}>{feature}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {currentSlide.type === 'market' && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-3xl font-bold text-blue-600">
                          {currentSlide.content.tam?.value}
                        </p>
                        <p className="text-sm">{currentSlide.content.tam?.label}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Edit Panel */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            <h2 className="text-white font-semibold">Edit Slide</h2>
            {editedSlide && (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Title</Label>
                  <Input
                    value={editedSlide.title}
                    onChange={(e) => setEditedSlide({ ...editedSlide, title: e.target.value })}
                    className="bg-gray-700 text-white border-gray-600"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Subtitle</Label>
                  <Input
                    value={editedSlide.subtitle || ''}
                    onChange={(e) => setEditedSlide({ ...editedSlide, subtitle: e.target.value })}
                    className="bg-gray-700 text-white border-gray-600"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Speaker Notes</Label>
                  <Textarea
                    value={editedSlide.speakerNotes || ''}
                    onChange={(e) => setEditedSlide({ ...editedSlide, speakerNotes: e.target.value })}
                    rows={4}
                    className="bg-gray-700 text-white border-gray-600"
                  />
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Type: {editedSlide.type}</p>
                  <p className="text-xs text-gray-400">Order: {editedSlide.order}</p>
                </div>
              </div>
            )}

            {/* AI Enhancement Panel */}
            <div className="pt-4 border-t border-gray-700">
              <EnhancementPanel
                slideId={currentSlide.id}
                deckId={deck.id}
                onEnhancementComplete={fetchDeck}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
