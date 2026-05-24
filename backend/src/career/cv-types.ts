// =============================================================================
//  Phase 42 — CV / Resume / Cover Letter / Portfolio shared types.
//
//  Mirrors the JSON shapes stored on CvProfile + CvDocument so the frontend
//  hooks + the renderer + the importer all agree on a single contract.
// =============================================================================

export type CvDoctype = 'cv' | 'resume' | 'coverLetter' | 'portfolio';

export interface CvPersonal {
  fullName?:  string;
  headline?:  string;
  location?:  string;
  email?:     string;
  phone?:     string;
  website?:   string;
  linkedin?:  string;
  github?:    string;
  summary?:   string;
  photoUrl?:  string;
}

export interface CvExperience {
  id:        string;
  company:   string;
  role:      string;
  location?: string;
  start:     string;          // YYYY-MM or YYYY
  end?:      string;          // null/undefined = "Present"
  bullets:   string[];        // achievements
}

export interface CvEducation {
  id:          string;
  institution: string;
  degree?:     string;
  field?:      string;
  start?:      string;
  end?:        string;
  gpa?:        string;
  honors?:     string[];
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SkillCategory = 'technical' | 'business' | 'language' | 'tool' | 'soft' | 'other';

export interface CvSkill {
  id:        string;
  name:      string;
  category:  SkillCategory;
  level?:    SkillLevel;
}

export interface CvLanguage {
  id:          string;
  name:        string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
}

export interface CvProject {
  id:           string;
  name:         string;
  description?: string;
  role?:        string;
  technologies?: string[];
  links?:       Array<{ label: string; url: string }>;
  results?:     string[];
  start?:       string;
  end?:         string;
}

export interface CvCertification {
  id:            string;
  name:          string;
  issuer:        string;
  date?:         string;
  expires?:      string;
  credentialId?: string;
  url?:          string;
  attachmentUrl?: string;
}

export interface CvAward {
  id:           string;
  title:        string;
  issuer?:      string;
  date?:        string;
  description?: string;
}

export interface CvPublication {
  id:        string;
  title:     string;
  venue?:    string;
  date?:     string;
  url?:      string;
  coauthors?: string;
}

export interface CvReference {
  id:       string;
  name:     string;
  title?:   string;
  company?: string;
  email?:   string;
  phone?:   string;
  note?:    string;
}

// =============================================================================
//  CvProfile aggregate (what the frontend loads / patches)
// =============================================================================

export interface CvProfileDto {
  id:        string;
  userId:    string;
  personal:  CvPersonal | null;
  experience:    CvExperience[];
  education:     CvEducation[];
  skills:        CvSkill[];
  languages:     CvLanguage[];
  projects:      CvProject[];
  certifications: CvCertification[];
  awards:        CvAward[];
  publications:  CvPublication[];
  references:    CvReference[];
  importSource:  string | null;
  importedAt:    string | null;
  createdAt:     string;
  updatedAt:     string;
}

// =============================================================================
//  CvDocument body shapes per doctype
// =============================================================================

/** Order + visibility of sections shown in CV / Resume / Portfolio variants. */
export type CvSectionKey =
  | 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'languages'
  | 'projects' | 'certifications' | 'awards' | 'publications' | 'references'
  | 'testimonials' | 'caseStudies' | 'achievements';

export interface CvDocumentContent_CV {
  /** Order of sections in the rendered output. */
  sectionOrder:    CvSectionKey[];
  /** Per-section overrides (e.g. trim experience to top 5, custom summary). */
  sectionOverrides?: {
    summary?:        string;
    experienceIds?:  string[];
    skillIds?:       string[];
    projectIds?:     string[];
  };
  /** Optional job-specific metadata for variants (Phase 42I). */
  jobTitle?:       string;
  jobCompany?:     string;
}

export interface CvDocumentContent_CoverLetter {
  greeting:     string;
  intro:        string;
  body:         string[];
  whyCompany?:  string;
  closing:      string;
  signature?:   string;
  company?:     string;
  role?:        string;
  hiringManager?: string;
}

export interface CvDocumentContent_Portfolio {
  sections:           Array<{ key: string; title: string; body?: string; itemIds?: string[] }>;
  showcaseProjectIds: string[];
  testimonials?:      Array<{ id: string; name: string; role: string; quote: string; company?: string }>;
  caseStudies?:       Array<{ id: string; title: string; problem: string; solution: string; outcome: string; projectId?: string }>;
}

export type CvDocumentContent =
  | CvDocumentContent_CV
  | CvDocumentContent_CoverLetter
  | CvDocumentContent_Portfolio;

export interface CvDocumentDto {
  id:            string;
  profileId:     string;
  userId:        string;
  doctype:       CvDoctype;
  title:         string;
  templateId:    string | null;
  brandKitId:    string | null;
  variant:       string | null;
  content:       CvDocumentContent;
  thumbnailUrl:  string | null;
  lastExportUrl: string | null;
  createdAt:     string;
  updatedAt:     string;
}

// =============================================================================
//  Defaults — used when creating a brand-new profile / document.
// =============================================================================

export const DEFAULT_CV_SECTION_ORDER: CvSectionKey[] = [
  'header', 'summary', 'experience', 'education', 'skills',
  'projects', 'certifications', 'languages', 'awards', 'references',
];

export const DEFAULT_RESUME_SECTION_ORDER: CvSectionKey[] = [
  'header', 'summary', 'experience', 'skills', 'education', 'certifications',
];

export function emptyProfile(userId: string): Partial<CvProfileDto> {
  return {
    userId,
    personal: null,
    experience: [], education: [], skills: [], languages: [],
    projects: [], certifications: [], awards: [], publications: [], references: [],
  };
}
