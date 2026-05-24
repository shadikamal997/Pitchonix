'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import {
  Briefcase, FileText, Mail, Layout, Sparkles, User, Plus, Trash2, Copy,
  Download, Upload, ExternalLink, Loader2,
} from 'lucide-react';
import { useCvProfile, useCvDocuments, useCvTemplates, CvDoctype } from '@/features/career/hooks';

// =============================================================================
//  Phase 42J — Career documents workspace.
//
//  Tabs:
//    1. Profile       — personal info + sections summary; import file/LinkedIn
//    2. CVs           — list of doctype='cv' documents
//    3. Resumes       — list of doctype='resume'
//    4. Cover Letters — list of doctype='coverLetter'
//    5. Portfolios    — list of doctype='portfolio'
//    6. Templates     — gallery (filterable by doctype + category)
// =============================================================================

type Tab = 'profile' | 'cv' | 'resume' | 'coverLetter' | 'portfolio' | 'templates';

const TABS: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'profile',     label: 'Profile',       icon: User },
  { id: 'cv',          label: 'CVs',            icon: FileText },
  { id: 'resume',      label: 'Resumes',        icon: Briefcase },
  { id: 'coverLetter', label: 'Cover Letters',  icon: Mail },
  { id: 'portfolio',   label: 'Portfolios',     icon: Layout },
  { id: 'templates',   label: 'Templates',      icon: Sparkles },
];

export default function CareerWorkspacePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>('profile');

  // Phase 42 — auto-create when arriving via /career?create=cv|resume|...
  useEffect(() => {
    const wanted = params?.get('create');
    if (!wanted) return;
    const doctype = (['cv', 'resume', 'coverLetter', 'portfolio'].includes(wanted) ? wanted : null) as CvDoctype | null;
    if (!doctype) return;
    const defaultTitles: Record<string, string> = {
      cv: 'Untitled CV',
      resume: 'Untitled Resume',
      coverLetter: 'Untitled Cover Letter',
      portfolio: 'Untitled Portfolio',
    };
    (async () => {
      try {
        const { data } = await api.post('/career/documents', { doctype, title: defaultTitles[doctype] });
        router.replace(`/career/builder/${data.id}`);
      } catch (e: any) {
        alert(`Failed to create ${doctype}: ${e?.response?.data?.message || e?.message}`);
        router.replace('/career');
      }
    })();
  }, [params, router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900">← Back</Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-500" /> Career Documents
        </h1>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-[200px_1fr] gap-6">
        <nav className="space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded transition-colors ${
                tab === id ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </nav>

        <main className="bg-white border border-slate-200 rounded-lg p-6 min-h-[60vh]">
          {tab === 'profile'  && <ProfileTab />}
          {tab === 'cv'       && <DocumentList doctype="cv" label="CV" />}
          {tab === 'resume'   && <DocumentList doctype="resume" label="Resume" />}
          {tab === 'coverLetter' && <DocumentList doctype="coverLetter" label="Cover Letter" />}
          {tab === 'portfolio'   && <DocumentList doctype="portfolio" label="Portfolio" />}
          {tab === 'templates'   && <TemplatesTab />}
        </main>
      </div>
    </div>
  );
}

// =============================================================================
//  Profile tab
// =============================================================================

const ProfileTab: React.FC = () => {
  const { profile, loading, patchPersonal, importFile, importLinkedIn } = useCvProfile();
  const [busy, setBusy] = useState(false);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  if (loading && !profile) return <Loader />;
  if (!profile) return <div className="text-xs text-slate-500 italic">No profile.</div>;
  const p = profile.personal || {};

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await importFile(file);
      if (res?.warnings?.length) alert(`Imported with ${res.warnings.length} warning(s):\n\n${res.warnings.join('\n')}`);
    } catch (e: any) { alert(`Import failed: ${e?.response?.data?.message || e?.message}`); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-3">Personal information</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name"  value={p.fullName ?? ''} onChange={(v) => patchPersonal({ fullName: v })} />
          <Field label="Headline"   value={p.headline ?? ''} onChange={(v) => patchPersonal({ headline: v })} />
          <Field label="Email"      value={p.email ?? ''}    onChange={(v) => patchPersonal({ email: v })} />
          <Field label="Phone"      value={p.phone ?? ''}    onChange={(v) => patchPersonal({ phone: v })} />
          <Field label="Location"   value={p.location ?? ''} onChange={(v) => patchPersonal({ location: v })} />
          <Field label="Website"    value={p.website ?? ''}  onChange={(v) => patchPersonal({ website: v })} />
          <Field label="LinkedIn"   value={p.linkedin ?? ''} onChange={(v) => patchPersonal({ linkedin: v })} />
          <Field label="GitHub"     value={p.github ?? ''}   onChange={(v) => patchPersonal({ github: v })} />
        </div>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Summary</label>
          <textarea value={p.summary ?? ''} onChange={(e) => patchPersonal({ summary: e.target.value })}
            rows={4} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded resize-none" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-2">Section counts</h2>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {([
            ['Experience',    profile.experience.length],
            ['Education',     profile.education.length],
            ['Skills',        profile.skills.length],
            ['Languages',     profile.languages.length],
            ['Projects',      profile.projects.length],
            ['Certifications',profile.certifications.length],
            ['Awards',        profile.awards.length],
            ['Publications',  profile.publications.length],
            ['References',    profile.references.length],
          ] as [string, number][]).map(([label, n]) => (
            <div key={label} className="border border-slate-200 rounded px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
              <div className="text-lg font-bold">{n}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 italic mt-2">
          Use the builder UI on each document to edit sections in detail.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-2">Import existing CV</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded cursor-pointer hover:bg-slate-50 text-xs ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {busy ? 'Importing…' : 'Upload DOCX / PDF / MD / HTML'}
            <input type="file" className="hidden"
              accept=".docx,.pdf,.md,.markdown,.html,.htm"
              onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {/* Phase Ω.1 — LinkedIn import. Backend endpoint
              POST /career/profile/:id/import/linkedin existed; now reachable. */}
          <button
            type="button"
            onClick={() => setLinkedinOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-blue-300 rounded cursor-pointer hover:bg-blue-50 text-xs text-blue-700"
          >
            <Upload className="w-3 h-3" /> Import from LinkedIn
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Runs through Universal Conversion → maps sections onto your profile.
        </p>
      </section>

      {linkedinOpen && (
        <LinkedInImportModal
          onClose={() => setLinkedinOpen(false)}
          onImport={async (payload) => {
            setBusy(true);
            try {
              await importLinkedIn(payload);
              setLinkedinOpen(false);
            } catch (e: any) {
              alert(`Import failed: ${e?.response?.data?.message || e?.message}`);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
//  Phase Ω.1 — LinkedIn import modal
//
//  Two paths because LinkedIn doesn't offer a public OAuth surface for
//  arbitrary apps without partnership: (1) paste the Profile JSON the user
//  exports from their LinkedIn settings, (2) paste a public profile URL
//  which the backend scrapes.
// =============================================================================
const LinkedInImportModal: React.FC<{
  onClose:  () => void;
  onImport: (payload: any) => void | Promise<void>;
}> = ({ onClose, onImport }) => {
  const [mode, setMode] = useState<'url' | 'json'>('url');
  const [url,  setUrl]  = useState('');
  const [json, setJson] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'url') {
        if (!url.trim()) { alert('Please enter a LinkedIn URL'); return; }
        await onImport({ url: url.trim() });
      } else {
        let payload: any;
        try { payload = JSON.parse(json); }
        catch { alert('Invalid JSON'); return; }
        await onImport(payload);
      }
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Import from LinkedIn</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Pulls your name, headline, experience, education and skills into the profile.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
        </div>

        <div className="flex gap-1 mb-3 border-b border-slate-200">
          <button onClick={() => setMode('url')}
            className={`px-2 py-1.5 text-xs font-semibold border-b-2 ${mode === 'url' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            By URL
          </button>
          <button onClick={() => setMode('json')}
            className={`px-2 py-1.5 text-xs font-semibold border-b-2 ${mode === 'json' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            Paste exported JSON
          </button>
        </div>

        {mode === 'url' ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">LinkedIn profile URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-handle"
              className="w-full h-8 px-2 text-xs border border-slate-300 rounded" />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Paste exported JSON</label>
            <textarea value={json} onChange={(e) => setJson(e.target.value)}
              rows={8}
              placeholder='{ "firstName": "...", "lastName": "...", "experience": [...] }'
              className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded resize-none" />
            <p className="text-[10px] text-slate-500">
              Get this by going to LinkedIn → Settings → "Get a copy of your data" → Download.
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 inline-flex items-center justify-center gap-1">
            {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
            Import
          </button>
          <button onClick={onClose}
            className="h-8 px-3 text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-700 rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
//  Document list tab (CV / Resume / Cover Letter / Portfolio)
// =============================================================================

const DocumentList: React.FC<{ doctype: CvDoctype; label: string }> = ({ doctype, label }) => {
  const { items, create, remove, duplicate, exportDoc } = useCvDocuments(doctype);
  const [busy, setBusy] = useState<string | null>(null);

  const createNew = async () => {
    const title = window.prompt(`Title for the new ${label}:`, `Untitled ${label}`);
    if (!title) return;
    await create({ doctype, title });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">{label}s ({items.length})</h2>
        <button onClick={createNew} className="h-7 px-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> New {label}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-slate-500 italic py-8 text-center border border-dashed border-slate-200 rounded">
          No {label.toLowerCase()}s yet. Click "New {label}" to start.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((d) => (
            <li key={d.id} className="bg-white border border-slate-200 rounded p-3 space-y-1.5">
              <div className="text-xs font-bold text-slate-900 truncate">{d.title}</div>
              {d.variant && <div className="text-[10px] text-slate-500 truncate">variant: {d.variant}</div>}
              <div className="text-[9px] text-slate-400 font-mono">{new Date(d.updatedAt).toLocaleString()}</div>
              <div className="flex flex-wrap gap-1 pt-1">
                <Link href={`/career/builder/${d.id}`}
                  className="flex-1 h-7 text-[10px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center justify-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Open
                </Link>
                <button onClick={async () => { setBusy(d.id); try { await exportDoc(d.id, 'pdf', `${d.title}.pdf`); } finally { setBusy(null); } }}
                  disabled={busy === d.id}
                  className="h-7 px-2 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 inline-flex items-center gap-1 disabled:opacity-40">
                  {busy === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} PDF
                </button>
                <button onClick={async () => { setBusy(d.id); try { await exportDoc(d.id, 'docx', `${d.title}.docx`); } finally { setBusy(null); } }}
                  disabled={busy === d.id}
                  className="h-7 px-2 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 inline-flex items-center gap-1 disabled:opacity-40">
                  <Download className="w-3 h-3" /> DOCX
                </button>
                <button onClick={() => duplicate(d.id)}
                  className="h-7 px-2 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 inline-flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={() => { if (window.confirm(`Delete "${d.title}"?`)) remove(d.id); }}
                  className="h-7 px-2 text-[10px] font-semibold bg-red-50 text-red-700 rounded hover:bg-red-100">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// =============================================================================
//  Templates tab
// =============================================================================

const TemplatesTab: React.FC = () => {
  const [doctype, setDoctype] = useState<CvDoctype | ''>('');
  const { items, loading } = useCvTemplates(doctype || undefined);
  const groups = items.reduce((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {} as Record<string, typeof items>);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Templates ({items.length})</h2>
        <select value={doctype} onChange={(e) => setDoctype((e.target.value as any) || '')}
          className="h-7 px-2 text-xs border border-slate-300 rounded">
          <option value="">All doctypes</option>
          <option value="cv">CV</option>
          <option value="resume">Resume</option>
          <option value="coverLetter">Cover Letter</option>
          <option value="portfolio">Portfolio</option>
        </select>
      </div>
      {loading && items.length === 0 && <Loader />}
      {Object.entries(groups).map(([cat, list]) => (
        <section key={cat}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{cat} ({list.length})</div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {list.map((t) => (
              <li key={t.id} className="border border-slate-200 rounded p-3 hover:border-blue-400 transition-colors">
                <div className="text-xs font-semibold">{t.name}</div>
                <div className="text-[10px] text-slate-500 capitalize">{t.doctype}</div>
                <div className="mt-2 h-1 rounded" style={{ background: t.layout?.accent || '#E2E8F0' }} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

// =============================================================================
//  Helpers
// =============================================================================

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="text-xs">
    <span className="block font-semibold text-slate-700 mb-1">{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 px-2 text-xs border border-slate-300 rounded" />
  </label>
);

const Loader: React.FC = () => (
  <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
);
