import { Injectable } from '@nestjs/common';

/**
 * PHASE Ω.2 — JOB MATCHER SERVICE
 *
 * Matches CV against job descriptions and provides
 * gap analysis with actionable recommendations.
 */

export interface JobMatchResult {
  overallMatch: number; // 0-100
  breakdown: {
    skills: MatchCategory;
    keywords: MatchCategory;
    experience: MatchCategory;
    education: MatchCategory;
    certifications: MatchCategory;
  };
  gaps: JobGap[];
  strengths: JobStrength[];
  improvements: JobImprovement[];
  recommendation: 'strong-match' | 'good-match' | 'partial-match' | 'weak-match';
}

export interface MatchCategory {
  score: number; // 0-100
  matched: string[];
  missing: string[];
  details: string;
}

export interface JobGap {
  type: 'skill' | 'keyword' | 'certification' | 'experience' | 'education';
  severity: 'critical' | 'important' | 'nice-to-have';
  item: string;
  description: string;
  fix: JobGapFix;
}

export interface JobGapFix {
  action:
    | 'add-skill'
    | 'add-keyword'
    | 'improve-experience'
    | 'add-certification'
    | 'highlight-experience';
  payload: any;
  autoApply: boolean;
}

export interface JobStrength {
  type: 'skill' | 'experience' | 'education' | 'certification';
  item: string;
  description: string;
}

export interface JobImprovement {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action?: {
    type: string;
    payload: any;
  };
}

@Injectable()
export class JobMatcherService {
  /**
   * Main job matching function
   */
  async matchCVToJob(profile: any, jobDescription: string): Promise<JobMatchResult> {
    // Extract job requirements
    const jobRequirements = this.parseJobDescription(jobDescription);

    // Match each category
    const skills = this.matchSkills(profile, jobRequirements);
    const keywords = this.matchKeywords(profile, jobRequirements);
    const experience = this.matchExperience(profile, jobRequirements);
    const education = this.matchEducation(profile, jobRequirements);
    const certifications = this.matchCertifications(profile, jobRequirements);

    // Calculate overall match
    const breakdown = { skills, keywords, experience, education, certifications };
    const overallMatch = this.calculateOverallMatch(breakdown);

    // Identify gaps
    const gaps = this.identifyGaps(breakdown, jobRequirements);

    // Identify strengths
    const strengths = this.identifyStrengths(breakdown, profile);

    // Generate improvements
    const improvements = this.generateImprovements(gaps, breakdown);

    // Determine recommendation
    const recommendation = this.getRecommendation(overallMatch);

    return {
      overallMatch,
      breakdown,
      gaps,
      strengths,
      improvements,
      recommendation,
    };
  }

  /**
   * Parse job description to extract requirements
   */
  private parseJobDescription(jobDescription: string): any {
    const text = jobDescription.toLowerCase();

    // Extract required skills
    const skillKeywords = [
      'javascript',
      'typescript',
      'python',
      'java',
      'c++',
      'c#',
      'ruby',
      'php',
      'swift',
      'kotlin',
      'react',
      'angular',
      'vue',
      'node.js',
      'express',
      'django',
      'flask',
      'spring',
      'laravel',
      'aws',
      'azure',
      'gcp',
      'docker',
      'kubernetes',
      'terraform',
      'jenkins',
      'git',
      'sql',
      'nosql',
      'mongodb',
      'postgresql',
      'mysql',
      'redis',
      'elasticsearch',
      'agile',
      'scrum',
      'ci/cd',
      'rest api',
      'graphql',
      'microservices',
      'leadership',
      'management',
      'communication',
      'problem solving',
    ];

    const foundSkills = skillKeywords.filter(
      (skill) => text.includes(skill) || text.includes(skill.replace(/\s/g, '')),
    );

    // Extract experience requirements
    const expMatch = text.match(/(\d+)\+?\s*years?\s*(of\s*)?experience/i);
    const yearsRequired = expMatch ? parseInt(expMatch[1]) : 0;

    // Extract education requirements
    const educationKeywords = ['bachelor', 'master', 'phd', 'degree', 'diploma'];
    const educationRequired = educationKeywords.some((kw) => text.includes(kw));

    // Extract certifications
    const certKeywords = [
      'aws certified',
      'pmp',
      'scrum master',
      'cissp',
      'comptia',
      'microsoft certified',
    ];
    const certifications = certKeywords.filter((cert) => text.includes(cert));

    // Extract keywords (frequent important words)
    const keywords = this.extractImportantKeywords(jobDescription);

    return {
      skills: foundSkills,
      yearsRequired,
      educationRequired,
      certifications,
      keywords,
      rawText: jobDescription,
    };
  }

  /**
   * Match skills
   */
  private matchSkills(profile: any, jobReqs: any): MatchCategory {
    const cvSkills = (profile.skills || []).map((s: string) => s.toLowerCase());
    const requiredSkills = jobReqs.skills || [];

    const matched = requiredSkills.filter((skill: string) =>
      cvSkills.some(
        (cvSkill: string) =>
          cvSkill === skill || cvSkill.includes(skill) || skill.includes(cvSkill),
      ),
    );

    const missing = requiredSkills.filter((skill: string) => !matched.includes(skill));

    const score =
      requiredSkills.length > 0 ? Math.round((matched.length / requiredSkills.length) * 100) : 100;

    return {
      score,
      matched,
      missing,
      details: `${matched.length} of ${requiredSkills.length} required skills found`,
    };
  }

  /**
   * Match keywords
   */
  private matchKeywords(profile: any, jobReqs: any): MatchCategory {
    const cvText = this.extractProfileText(profile).toLowerCase();
    const requiredKeywords = jobReqs.keywords || [];

    const matched = requiredKeywords.filter((kw: string) => cvText.includes(kw.toLowerCase()));
    const missing = requiredKeywords.filter((kw: string) => !matched.includes(kw));

    const score =
      requiredKeywords.length > 0
        ? Math.round((matched.length / requiredKeywords.length) * 100)
        : 100;

    return {
      score,
      matched,
      missing,
      details: `${matched.length} of ${requiredKeywords.length} job keywords found in CV`,
    };
  }

  /**
   * Match experience
   */
  private matchExperience(profile: any, jobReqs: any): MatchCategory {
    const experience = profile.experience || [];
    const totalYears = this.calculateTotalYears(experience);
    const requiredYears = jobReqs.yearsRequired || 0;

    let score = 100;
    const matched: string[] = [];
    const missing: string[] = [];

    if (requiredYears > 0) {
      if (totalYears >= requiredYears) {
        score = 100;
        matched.push(`${totalYears} years experience (${requiredYears}+ required)`);
      } else {
        score = Math.round((totalYears / requiredYears) * 100);
        missing.push(`${requiredYears - totalYears} more years of experience needed`);
      }
    } else {
      matched.push(`${totalYears} years experience`);
    }

    // Check for relevant experience
    const jobText = jobReqs.rawText.toLowerCase();
    const relevantExp = experience.filter((exp: any) => {
      const expText = `${exp.title} ${exp.company} ${exp.description}`.toLowerCase();
      return jobText.split(' ').some((word: string) => word.length > 4 && expText.includes(word));
    });

    if (relevantExp.length > 0) {
      matched.push(`${relevantExp.length} relevant position(s)`);
    } else if (experience.length > 0) {
      missing.push('No directly relevant experience found');
      score = Math.min(score, 60);
    }

    return {
      score,
      matched,
      missing,
      details: `${totalYears} years of experience (${requiredYears}+ required)`,
    };
  }

  /**
   * Match education
   */
  private matchEducation(profile: any, jobReqs: any): MatchCategory {
    const education = profile.education || [];
    const requiredEducation = jobReqs.educationRequired;

    let score = 100;
    const matched: string[] = [];
    const missing: string[] = [];

    if (requiredEducation) {
      if (education.length === 0) {
        score = 40;
        missing.push('Education required but none listed');
      } else {
        const hasDegree = education.some(
          (edu: any) => edu.degree && /bachelor|master|phd|degree/i.test(edu.degree),
        );

        if (hasDegree) {
          matched.push('Relevant degree found');
          score = 100;
        } else {
          missing.push('Specific degree requirements not clearly met');
          score = 70;
        }
      }
    } else {
      if (education.length > 0) {
        matched.push(`${education.length} education entry(ies) listed`);
      }
    }

    return {
      score,
      matched,
      missing,
      details:
        education.length > 0 ? `${education.length} education entry(ies)` : 'No education listed',
    };
  }

  /**
   * Match certifications
   */
  private matchCertifications(profile: any, jobReqs: any): MatchCategory {
    const cvCerts = (profile.certifications || []).map((c: any) => c.name?.toLowerCase() || '');
    const requiredCerts = jobReqs.certifications || [];

    const matched = requiredCerts.filter((cert: string) =>
      cvCerts.some((cvCert: string) => cvCert.includes(cert) || cert.includes(cvCert)),
    );

    const missing = requiredCerts.filter((cert: string) => !matched.includes(cert));

    const score =
      requiredCerts.length > 0 ? Math.round((matched.length / requiredCerts.length) * 100) : 100;

    return {
      score,
      matched,
      missing,
      details:
        requiredCerts.length > 0
          ? `${matched.length} of ${requiredCerts.length} required certifications`
          : 'No certifications required',
    };
  }

  /**
   * Calculate overall match score
   */
  private calculateOverallMatch(breakdown: any): number {
    const weights = {
      skills: 0.3,
      keywords: 0.25,
      experience: 0.25,
      education: 0.1,
      certifications: 0.1,
    };

    const weightedSum = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + breakdown[key].score * weight;
    }, 0);

    return Math.round(weightedSum);
  }

  /**
   * Identify gaps
   */
  private identifyGaps(breakdown: any, jobReqs: any): JobGap[] {
    const gaps: JobGap[] = [];

    // Critical skills gaps
    breakdown.skills.missing.slice(0, 5).forEach((skill: string) => {
      gaps.push({
        type: 'skill',
        severity: 'critical',
        item: skill,
        description: `Required skill "${skill}" not found in CV`,
        fix: {
          action: 'add-skill',
          payload: { skill },
          autoApply: true,
        },
      });
    });

    // Important keyword gaps
    breakdown.keywords.missing.slice(0, 5).forEach((keyword: string) => {
      gaps.push({
        type: 'keyword',
        severity: 'important',
        item: keyword,
        description: `Important keyword "${keyword}" missing from CV`,
        fix: {
          action: 'add-keyword',
          payload: { keyword },
          autoApply: false,
        },
      });
    });

    // Experience gaps
    breakdown.experience.missing.forEach((missing: string) => {
      gaps.push({
        type: 'experience',
        severity: 'important',
        item: missing,
        description: missing,
        fix: {
          action: 'improve-experience',
          payload: {},
          autoApply: false,
        },
      });
    });

    // Certification gaps
    breakdown.certifications.missing.forEach((cert: string) => {
      gaps.push({
        type: 'certification',
        severity: 'nice-to-have',
        item: cert,
        description: `Certification "${cert}" mentioned in job posting`,
        fix: {
          action: 'add-certification',
          payload: { certification: cert },
          autoApply: false,
        },
      });
    });

    return gaps;
  }

  /**
   * Identify strengths
   */
  private identifyStrengths(breakdown: any, profile: any): JobStrength[] {
    const strengths: JobStrength[] = [];

    // Matched skills
    breakdown.skills.matched.forEach((skill: string) => {
      strengths.push({
        type: 'skill',
        item: skill,
        description: `You have the required "${skill}" skill`,
      });
    });

    // Relevant experience
    if (breakdown.experience.score >= 80) {
      strengths.push({
        type: 'experience',
        item: 'Experience Level',
        description: 'Your experience level meets or exceeds requirements',
      });
    }

    // Education
    if (breakdown.education.score >= 80) {
      strengths.push({
        type: 'education',
        item: 'Education',
        description: 'Your education meets the job requirements',
      });
    }

    // Matched certifications
    breakdown.certifications.matched.forEach((cert: string) => {
      strengths.push({
        type: 'certification',
        item: cert,
        description: `You have the "${cert}" certification`,
      });
    });

    return strengths;
  }

  /**
   * Generate improvements
   */
  private generateImprovements(gaps: JobGap[], breakdown: any): JobImprovement[] {
    const improvements: JobImprovement[] = [];
    let id = 1;

    // High priority: Critical gaps
    gaps
      .filter((g) => g.severity === 'critical')
      .forEach((gap) => {
        improvements.push({
          id: `imp-${id++}`,
          priority: 'high',
          title: `Add missing skill: ${gap.item}`,
          description: gap.description,
          impact: '+15 match score',
          action: {
            type: gap.fix.action,
            payload: gap.fix.payload,
          },
        });
      });

    // Medium priority: Important gaps
    gaps
      .filter((g) => g.severity === 'important')
      .slice(0, 5)
      .forEach((gap) => {
        improvements.push({
          id: `imp-${id++}`,
          priority: 'medium',
          title: gap.type === 'keyword' ? `Include keyword: ${gap.item}` : `Address: ${gap.item}`,
          description: gap.description,
          impact: '+10 match score',
          action: {
            type: gap.fix.action,
            payload: gap.fix.payload,
          },
        });
      });

    // Low priority: Nice-to-have gaps
    gaps
      .filter((g) => g.severity === 'nice-to-have')
      .slice(0, 3)
      .forEach((gap) => {
        improvements.push({
          id: `imp-${id++}`,
          priority: 'low',
          title: `Consider adding: ${gap.item}`,
          description: gap.description,
          impact: '+5 match score',
        });
      });

    return improvements;
  }

  /**
   * Get match recommendation
   */
  private getRecommendation(
    score: number,
  ): 'strong-match' | 'good-match' | 'partial-match' | 'weak-match' {
    if (score >= 80) return 'strong-match';
    if (score >= 60) return 'good-match';
    if (score >= 40) return 'partial-match';
    return 'weak-match';
  }

  /**
   * Helper: Extract profile text
   */
  private extractProfileText(profile: any): string {
    const parts: string[] = [];

    if (profile.summary) parts.push(profile.summary);
    if (profile.experience) {
      profile.experience.forEach((exp: any) => {
        parts.push(exp.title || '');
        parts.push(exp.company || '');
        parts.push(exp.description || '');
      });
    }
    if (profile.skills) parts.push(...profile.skills);
    if (profile.education) {
      profile.education.forEach((edu: any) => {
        parts.push(edu.degree || '');
        parts.push(edu.school || '');
      });
    }

    return parts.join(' ');
  }

  /**
   * Helper: Extract important keywords
   */
  private extractImportantKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s+#.]/gi, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Count word frequency
    const frequency: { [key: string]: number } = {};
    words.forEach((word) => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Get words that appear 2+ times
    const important = Object.entries(frequency)
      .filter(([word, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 20);

    return important;
  }

  /**
   * Helper: Calculate total years of experience
   */
  private calculateTotalYears(experience: any[]): number {
    if (!experience || experience.length === 0) return 0;

    let totalMonths = 0;

    experience.forEach((exp) => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += Math.max(0, months);
      }
    });

    return Math.round((totalMonths / 12) * 10) / 10; // Round to 1 decimal
  }
}
