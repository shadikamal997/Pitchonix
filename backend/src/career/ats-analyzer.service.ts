import { Injectable, Logger } from '@nestjs/common';

/**
 * PHASE Ω.2 — ATS ANALYZER SERVICE
 *
 * Analyzes CVs for ATS (Applicant Tracking System) compatibility
 * and provides detailed scoring and recommendations.
 */

export interface AtsAnalysisResult {
  overallScore: number; // 0-100
  breakdown: {
    keywords: AtsScoreCategory;
    skills: AtsScoreCategory;
    experience: AtsScoreCategory;
    education: AtsScoreCategory;
    formatting: AtsScoreCategory;
    sections: AtsScoreCategory;
    readability: AtsScoreCategory;
  };
  recommendations: AtsRecommendation[];
  parsedData: AtsParsedData;
  risks: AtsRisk[];
  strengths: string[];
}

export interface AtsScoreCategory {
  score: number; // 0-100
  weight: number; // Contribution to overall score
  status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  details: string;
  issues: string[];
  suggestions: string[];
}

export interface AtsRecommendation {
  id: string;
  type: 'critical' | 'important' | 'suggested';
  category:
    | 'keywords'
    | 'skills'
    | 'experience'
    | 'education'
    | 'formatting'
    | 'sections'
    | 'readability';
  title: string;
  description: string;
  impact: string; // e.g., "+15 ATS score"
  action?: AtsAction;
}

export interface AtsAction {
  type: 'add-skill' | 'add-keyword' | 'improve-bullet' | 'add-section' | 'fix-format';
  payload: any;
  autoApply: boolean;
}

export interface AtsParsedData {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  experience: AtsParsedExperience[];
  education: AtsParsedEducation[];
  skills: string[];
  certifications: string[];
  languages: string[];
  parseSuccessRate: number; // 0-100
  parsingIssues: string[];
}

export interface AtsParsedExperience {
  title: string | null;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  parsed: boolean;
}

export interface AtsParsedEducation {
  degree: string | null;
  school: string | null;
  year: string | null;
  parsed: boolean;
}

export interface AtsRisk {
  severity: 'high' | 'medium' | 'low';
  type: 'formatting' | 'parsing' | 'content' | 'keywords';
  description: string;
  fix: string;
}

@Injectable()
export class AtsAnalyzerService {
  private readonly logger = new Logger(AtsAnalyzerService.name);

  async analyzeCV(
    profile: any,
    document: any,
    jobDescription?: string,
  ): Promise<AtsAnalysisResult> {
    const t0 = Date.now();
    const parsedData = this.parseCV(profile, document);
    const keywords = this.analyzeKeywords(profile, jobDescription);
    const skills = this.analyzeSkills(profile, jobDescription);
    const experience = this.analyzeExperience(profile);
    const education = this.analyzeEducation(profile);
    const formatting = this.analyzeFormatting(document);
    const sections = this.analyzeSections(profile);
    const readability = this.analyzeReadability(profile);
    const breakdown = {
      keywords,
      skills,
      experience,
      education,
      formatting,
      sections,
      readability,
    };
    const overallScore = this.calculateOverallScore(breakdown);
    const recommendations = this.generateRecommendations(breakdown, parsedData, jobDescription);
    const risks = this.identifyRisks(breakdown, parsedData);
    const strengths = this.identifyStrengths(breakdown, parsedData);

    this.logger.log(
      `[ATS] score=${overallScore} recs=${recommendations.length} risks=${risks.length}` +
        ` hasJD=${!!jobDescription} dur=${Date.now() - t0}ms`,
    );

    return { overallScore, breakdown, recommendations, parsedData, risks, strengths };
  }

  /**
   * Parse CV data (simulate ATS parsing)
   */
  private parseCV(profile: any, document: any): AtsParsedData {
    const parseSuccessRate = this.calculateParseSuccessRate(profile);
    const parsingIssues: string[] = [];

    // Check for common parsing issues
    if (!profile.contact?.name) parsingIssues.push('Name not clearly identified');
    if (!profile.contact?.email) parsingIssues.push('Email not found');
    if (!profile.contact?.phone) parsingIssues.push('Phone number not found');

    return {
      name: profile.contact?.name || null,
      email: profile.contact?.email || null,
      phone: profile.contact?.phone || null,
      location: profile.contact?.location || null,
      summary: profile.summary || null,
      experience: (profile.experience || []).map((exp: any) => ({
        title: exp.title || null,
        company: exp.company || null,
        startDate: exp.startDate || null,
        endDate: exp.endDate || null,
        description: exp.description || null,
        parsed: !!(exp.title && exp.company && exp.description),
      })),
      education: (profile.education || []).map((edu: any) => ({
        degree: edu.degree || null,
        school: edu.school || null,
        year: edu.year || null,
        parsed: !!(edu.degree && edu.school),
      })),
      skills: profile.skills || [],
      certifications: profile.certifications?.map((c: any) => c.name) || [],
      languages: profile.languages?.map((l: any) => l.name) || [],
      parseSuccessRate,
      parsingIssues,
    };
  }

  /**
   * Analyze keywords
   */
  private analyzeKeywords(profile: any, jobDescription?: string): AtsScoreCategory {
    if (!jobDescription) {
      return {
        score: 70,
        weight: 0.25,
        status: 'good',
        details: 'No job description provided for comparison',
        issues: [],
        suggestions: ['Provide a job description to analyze keyword match'],
      };
    }

    const cvText = this.extractTextFromProfile(profile);
    const jdKeywords = this.extractKeywords(jobDescription);
    const cvKeywords = this.extractKeywords(cvText);

    const matchedKeywords = jdKeywords.filter((kw) =>
      cvKeywords.some((cvKw) => cvKw.toLowerCase() === kw.toLowerCase()),
    );

    const matchRate =
      jdKeywords.length > 0 ? (matchedKeywords.length / jdKeywords.length) * 100 : 0;
    const score = Math.min(100, matchRate);

    const missingKeywords = jdKeywords.filter(
      (kw) => !cvKeywords.some((cvKw) => cvKw.toLowerCase() === kw.toLowerCase()),
    );

    return {
      score: Math.round(score),
      weight: 0.25,
      status: this.getStatus(score),
      details: `${matchedKeywords.length} of ${jdKeywords.length} job keywords found in CV`,
      issues:
        missingKeywords.length > 0
          ? [`Missing ${missingKeywords.length} important keywords from job description`]
          : [],
      suggestions: missingKeywords.slice(0, 5).map((kw) => `Add keyword: "${kw}"`),
    };
  }

  /**
   * Analyze skills
   */
  private analyzeSkills(profile: any, jobDescription?: string): AtsScoreCategory {
    const cvSkills = profile.skills || [];

    if (!jobDescription) {
      const score = cvSkills.length >= 8 ? 85 : cvSkills.length >= 5 ? 70 : 50;
      return {
        score,
        weight: 0.2,
        status: this.getStatus(score),
        details: `${cvSkills.length} skills listed`,
        issues: cvSkills.length < 8 ? ['Add more relevant skills'] : [],
        suggestions: cvSkills.length < 8 ? ['Aim for 8-12 skills for optimal ATS performance'] : [],
      };
    }

    const jdSkills = this.extractSkills(jobDescription);
    const matchedSkills = jdSkills.filter((skill) =>
      cvSkills.some((cvSkill: string) => cvSkill.toLowerCase() === skill.toLowerCase()),
    );

    const matchRate = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 0;
    const score = Math.min(100, matchRate);

    const missingSkills = jdSkills.filter(
      (skill) => !cvSkills.some((cvSkill: string) => cvSkill.toLowerCase() === skill.toLowerCase()),
    );

    return {
      score: Math.round(score),
      weight: 0.2,
      status: this.getStatus(score),
      details: `${matchedSkills.length} of ${jdSkills.length} required skills found`,
      issues:
        missingSkills.length > 0
          ? [`Missing ${missingSkills.length} skills from job requirements`]
          : [],
      suggestions: missingSkills.slice(0, 5).map((skill) => `Add skill: "${skill}"`),
    };
  }

  /**
   * Analyze experience
   */
  private analyzeExperience(profile: any): AtsScoreCategory {
    const experience = profile.experience || [];
    const issues: string[] = [];
    const suggestions: string[] = [];

    let score = 60;

    // Check number of positions
    if (experience.length === 0) {
      score = 0;
      issues.push('No work experience listed');
      suggestions.push('Add at least 2-3 relevant positions');
    } else if (experience.length < 2) {
      score = 50;
      issues.push('Only one position listed');
      suggestions.push('Add more work experience if available');
    } else {
      score += 20;
    }

    // Check for descriptions
    const withoutDescription = experience.filter(
      (exp: any) => !exp.description || exp.description.length < 50,
    );
    if (withoutDescription.length > 0) {
      score -= 15;
      issues.push(`${withoutDescription.length} position(s) missing detailed descriptions`);
      suggestions.push('Add bullet points describing achievements and responsibilities');
    }

    // Check for dates
    const withoutDates = experience.filter((exp: any) => !exp.startDate);
    if (withoutDates.length > 0) {
      score -= 10;
      issues.push(`${withoutDates.length} position(s) missing dates`);
      suggestions.push('Add start and end dates for all positions');
    }

    // Check for quantifiable achievements
    const hasNumbers = experience.some(
      (exp: any) =>
        exp.description &&
        /\d+[%$]?|\d+k|\d+ (users|customers|clients|projects)/.test(exp.description),
    );
    if (!hasNumbers) {
      score -= 10;
      issues.push('No quantifiable achievements found');
      suggestions.push(
        'Add metrics and numbers to demonstrate impact (e.g., "increased sales by 25%")',
      );
    } else {
      score += 10;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score: Math.round(score),
      weight: 0.2,
      status: this.getStatus(score),
      details: `${experience.length} position${experience.length !== 1 ? 's' : ''} listed`,
      issues,
      suggestions,
    };
  }

  /**
   * Analyze education
   */
  private analyzeEducation(profile: any): AtsScoreCategory {
    const education = profile.education || [];
    const issues: string[] = [];
    const suggestions: string[] = [];

    let score = 70;

    if (education.length === 0) {
      score = 50;
      issues.push('No education listed');
      suggestions.push('Add your education history');
    } else {
      const withoutDegree = education.filter((edu: any) => !edu.degree);
      const withoutSchool = education.filter((edu: any) => !edu.school);

      if (withoutDegree.length > 0) {
        score -= 15;
        issues.push(`${withoutDegree.length} education entry(ies) missing degree information`);
        suggestions.push('Specify degree type (e.g., Bachelor of Science)');
      }

      if (withoutSchool.length > 0) {
        score -= 10;
        issues.push(`${withoutSchool.length} education entry(ies) missing school name`);
        suggestions.push('Add institution name for all education entries');
      }

      if (education.length > 0 && !withoutDegree.length && !withoutSchool.length) {
        score = 95;
      }
    }

    return {
      score: Math.round(score),
      weight: 0.1,
      status: this.getStatus(score),
      details: `${education.length} education entry(ies) listed`,
      issues,
      suggestions,
    };
  }

  /**
   * Analyze formatting
   */
  private analyzeFormatting(document: any): AtsScoreCategory {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 90;

    // Check template
    const template = document?.template || {};
    const layout = template.layout || {};

    // ATS-friendly formatting checks
    if (layout.columns > 1) {
      score -= 15;
      issues.push('Multi-column layout may confuse some ATS systems');
      suggestions.push('Consider using single-column layout for maximum compatibility');
    }

    if (layout.style === 'creative' || layout.style === 'colorful') {
      score -= 10;
      issues.push('Creative/colorful styles may not parse well in all ATS');
      suggestions.push('Use professional or minimal styles for better ATS compatibility');
    }

    if (layout.customCss && layout.customCss.includes('position: absolute')) {
      score -= 10;
      issues.push('Absolute positioning detected - may cause parsing issues');
      suggestions.push('Use standard document flow for better ATS parsing');
    }

    // Check for headers and footers
    if (layout.headerStyle === 'sidebar') {
      score -= 5;
      issues.push('Sidebar headers can be problematic for some ATS');
      suggestions.push('Use top-aligned headers for better compatibility');
    }

    if (issues.length === 0) {
      suggestions.push('Formatting is ATS-friendly - no major issues detected');
    }

    return {
      score: Math.round(score),
      weight: 0.1,
      status: this.getStatus(score),
      details: 'Document formatting analyzed for ATS compatibility',
      issues,
      suggestions,
    };
  }

  /**
   * Analyze sections
   */
  private analyzeSections(profile: any): AtsScoreCategory {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 70;

    const sections = {
      contact: !!profile.contact?.name && !!profile.contact?.email,
      summary: !!profile.summary && profile.summary.length >= 100,
      experience: profile.experience && profile.experience.length > 0,
      education: profile.education && profile.education.length > 0,
      skills: profile.skills && profile.skills.length >= 5,
    };

    const completedSections = Object.values(sections).filter(Boolean).length;
    score = (completedSections / 5) * 100;

    if (!sections.contact) {
      issues.push('Contact information incomplete');
      suggestions.push('Add complete contact details (name, email, phone, location)');
    }

    if (!sections.summary) {
      issues.push('Professional summary missing or too short');
      suggestions.push('Add a compelling summary (150-200 words)');
    }

    if (!sections.experience) {
      issues.push('No work experience listed');
      suggestions.push('Add your professional experience');
    }

    if (!sections.education) {
      issues.push('No education listed');
      suggestions.push('Add your educational background');
    }

    if (!sections.skills) {
      issues.push('Skills section needs more entries');
      suggestions.push('Add at least 5-8 relevant skills');
    }

    return {
      score: Math.round(score),
      weight: 0.1,
      status: this.getStatus(score),
      details: `${completedSections} of 5 essential sections complete`,
      issues,
      suggestions,
    };
  }

  /**
   * Analyze readability
   */
  private analyzeReadability(profile: any): AtsScoreCategory {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 80;

    // Check summary readability
    if (profile.summary) {
      const words = profile.summary.split(/\s+/).length;
      if (words < 50) {
        score -= 10;
        issues.push('Summary too short');
        suggestions.push('Expand summary to 100-150 words');
      } else if (words > 250) {
        score -= 5;
        issues.push('Summary too long');
        suggestions.push('Shorten summary to 150-200 words');
      }

      // Check for action verbs
      const actionVerbs = [
        'led',
        'managed',
        'developed',
        'created',
        'implemented',
        'achieved',
        'improved',
      ];
      const hasActionVerbs = actionVerbs.some((verb) =>
        profile.summary.toLowerCase().includes(verb),
      );
      if (!hasActionVerbs) {
        score -= 5;
        suggestions.push('Use action verbs in your summary');
      }
    }

    // Check experience bullet points
    if (profile.experience) {
      const allBullets = profile.experience
        .map((exp: any) => exp.description)
        .filter(Boolean)
        .join(' ');

      // Check for passive voice
      const passiveIndicators = ['was', 'were', 'been', 'being'];
      const passiveCount = passiveIndicators.filter((ind) =>
        allBullets.toLowerCase().includes(ind),
      ).length;

      if (passiveCount > 5) {
        score -= 10;
        issues.push('Too much passive voice detected');
        suggestions.push('Use active voice: "Managed team" instead of "Team was managed by me"');
      }
    }

    return {
      score: Math.round(score),
      weight: 0.05,
      status: this.getStatus(score),
      details: 'Content analyzed for clarity and impact',
      issues,
      suggestions,
    };
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(breakdown: any): number {
    const categories = Object.values(breakdown) as AtsScoreCategory[];
    const weightedSum = categories.reduce((sum, cat) => sum + cat.score * cat.weight, 0);
    return Math.round(weightedSum);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    breakdown: any,
    parsedData: AtsParsedData,
    jobDescription?: string,
  ): AtsRecommendation[] {
    const recommendations: AtsRecommendation[] = [];
    let id = 1;

    // Critical recommendations (score < 50)
    Object.entries(breakdown).forEach(([category, data]: [string, any]) => {
      if (data.score < 50) {
        data.issues.forEach((issue: string) => {
          recommendations.push({
            id: `rec-${id++}`,
            type: 'critical',
            category: category as any,
            title: issue,
            description: data.suggestions[0] || 'Improve this area',
            impact: '+20 ATS score',
          });
        });
      }
    });

    // Important recommendations (score < 70)
    Object.entries(breakdown).forEach(([category, data]: [string, any]) => {
      if (data.score >= 50 && data.score < 70) {
        data.issues.slice(0, 2).forEach((issue: string, index: number) => {
          recommendations.push({
            id: `rec-${id++}`,
            type: 'important',
            category: category as any,
            title: issue,
            description: data.suggestions[index] || 'Improve this area',
            impact: '+10 ATS score',
          });
        });
      }
    });

    // Suggested improvements (score < 90)
    Object.entries(breakdown).forEach(([category, data]: [string, any]) => {
      if (data.score >= 70 && data.score < 90) {
        data.suggestions.slice(0, 1).forEach((suggestion: string) => {
          recommendations.push({
            id: `rec-${id++}`,
            type: 'suggested',
            category: category as any,
            title: `Optimize ${category}`,
            description: suggestion,
            impact: '+5 ATS score',
          });
        });
      }
    });

    return recommendations.slice(0, 15); // Top 15 recommendations
  }

  /**
   * Identify risks
   */
  private identifyRisks(breakdown: any, parsedData: AtsParsedData): AtsRisk[] {
    const risks: AtsRisk[] = [];

    // Parsing issues = high risk
    if (parsedData.parseSuccessRate < 70) {
      risks.push({
        severity: 'high',
        type: 'parsing',
        description: 'ATS may have difficulty parsing your CV',
        fix: 'Use a simpler template with standard formatting',
      });
    }

    // Missing contact info = high risk
    if (!parsedData.email || !parsedData.phone) {
      risks.push({
        severity: 'high',
        type: 'content',
        description: 'Contact information incomplete',
        fix: 'Add email and phone number to contact section',
      });
    }

    // Low keyword match = medium risk
    if (breakdown.keywords.score < 50) {
      risks.push({
        severity: 'medium',
        type: 'keywords',
        description: 'Low keyword match with job description',
        fix: 'Add relevant keywords from the job posting',
      });
    }

    // Formatting issues = medium risk
    if (breakdown.formatting.score < 70) {
      risks.push({
        severity: 'medium',
        type: 'formatting',
        description: 'CV formatting may not be ATS-friendly',
        fix: 'Use an ATS-optimized template',
      });
    }

    // Missing sections = low risk
    if (breakdown.sections.score < 80) {
      risks.push({
        severity: 'low',
        type: 'content',
        description: 'Some standard sections are missing',
        fix: 'Add all essential sections (contact, summary, experience, education, skills)',
      });
    }

    return risks;
  }

  /**
   * Identify strengths
   */
  private identifyStrengths(breakdown: any, parsedData: AtsParsedData): string[] {
    const strengths: string[] = [];

    Object.entries(breakdown).forEach(([category, data]: [string, any]) => {
      if (data.score >= 85) {
        strengths.push(`Strong ${category} section (${data.score}/100)`);
      }
    });

    if (parsedData.parseSuccessRate >= 90) {
      strengths.push('Excellent ATS parseability');
    }

    if (parsedData.experience.length >= 3) {
      strengths.push('Comprehensive work experience');
    }

    if (parsedData.skills.length >= 10) {
      strengths.push('Extensive skills list');
    }

    return strengths;
  }

  /**
   * Helper: Extract text from profile
   */
  private extractTextFromProfile(profile: any): string {
    const parts: string[] = [];

    if (profile.summary) parts.push(profile.summary);
    if (profile.experience) {
      profile.experience.forEach((exp: any) => {
        if (exp.title) parts.push(exp.title);
        if (exp.company) parts.push(exp.company);
        if (exp.description) parts.push(exp.description);
      });
    }
    if (profile.skills) parts.push(...profile.skills);

    return parts.join(' ');
  }

  /**
   * Helper: Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s+#]/gi, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Remove common words
    const commonWords = new Set([
      'that',
      'this',
      'with',
      'from',
      'have',
      'been',
      'were',
      'your',
      'will',
      'about',
      'their',
      'which',
      'would',
      'there',
      'could',
      'should',
    ]);

    const keywords = [...new Set(words)].filter((word) => !commonWords.has(word)).slice(0, 50);

    return keywords;
  }

  /**
   * Helper: Extract skills from text
   */
  private extractSkills(text: string): string[] {
    // Common tech skills and keywords
    const skillPatterns = [
      /javascript|typescript|python|java|c\+\+|c#|ruby|php|swift|kotlin/gi,
      /react|angular|vue|node\.?js|express|django|flask|spring|laravel/gi,
      /aws|azure|gcp|docker|kubernetes|terraform|jenkins|git/gi,
      /sql|nosql|mongodb|postgresql|mysql|redis|elasticsearch/gi,
      /agile|scrum|kanban|jira|confluence/gi,
      /leadership|management|communication|teamwork|problem.solving/gi,
    ];

    const skills = new Set<string>();

    skillPatterns.forEach((pattern) => {
      const matches = text.match(pattern) || [];
      matches.forEach((match) => skills.add(match.toLowerCase()));
    });

    return Array.from(skills);
  }

  /**
   * Helper: Calculate parse success rate
   */
  private calculateParseSuccessRate(profile: any): number {
    let score = 0;
    let total = 0;

    // Contact fields (4 points)
    total += 4;
    if (profile.contact?.name) score++;
    if (profile.contact?.email) score++;
    if (profile.contact?.phone) score++;
    if (profile.contact?.location) score++;

    // Summary (1 point)
    total += 1;
    if (profile.summary) score++;

    // Experience (3 points)
    total += 3;
    if (profile.experience && profile.experience.length > 0) {
      score++;
      const wellFormed = profile.experience.filter(
        (exp: any) => exp.title && exp.company && exp.description,
      ).length;
      if (wellFormed === profile.experience.length) score += 2;
      else if (wellFormed > 0) score++;
    }

    // Education (2 points)
    total += 2;
    if (profile.education && profile.education.length > 0) {
      score++;
      const wellFormed = profile.education.filter((edu: any) => edu.degree && edu.school).length;
      if (wellFormed === profile.education.length) score++;
    }

    return Math.round((score / total) * 100);
  }

  /**
   * Helper: Get status from score
   */
  private getStatus(score: number): 'excellent' | 'good' | 'needs-improvement' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }
}
