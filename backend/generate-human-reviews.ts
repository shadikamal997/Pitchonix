/**
 * Human Review Simulator
 * 
 * Generates simulated human reviews for CVs based on realistic scoring patterns
 * Note: These are SIMULATED reviews for testing. Real certification requires real human reviewers.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CV {
  profile: {
    personalInfo: any;
    skills: string[];
    experience: any[];
    education: any[];
    certifications?: string[];
  };
  document: {
    title: string;
    content: string;
  };
}

interface HumanReview {
  reviewerId: string;
  atsReadiness: number;
  skillRelevance: number;
  experienceStrength: number;
  formattingQuality: number;
  keywordCoverage: number;
  overallScore: number;
  comments: string;
  timestamp: string;
}

class HumanReviewSimulator {
  private cvsDir: string;
  private reviewsDir: string;
  
  constructor() {
    this.cvsDir = path.join(__dirname, 'validation-data', 'cvs');
    this.reviewsDir = path.join(__dirname, 'validation-data', 'human-reviews');
  }
  
  async generateReviews(): Promise<void> {
    console.log('👥 Generating Simulated Human Reviews...\n');
    console.log('⚠️  NOTE: These are SIMULATED reviews for testing purposes.');
    console.log('   Real certification requires 3 independent human reviewers per CV.\n');
    
    if (!fs.existsSync(this.reviewsDir)) {
      fs.mkdirSync(this.reviewsDir, { recursive: true });
    }
    
    const categories = ['developer', 'designer', 'marketing', 'executive', 'academic'];
    let totalReviews = 0;
    
    for (const category of categories) {
      const categoryDir = path.join(this.cvsDir, category);
      if (!fs.existsSync(categoryDir)) continue;
      
      const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const cvPath = path.join(categoryDir, file);
        const cv: CV = JSON.parse(fs.readFileSync(cvPath, 'utf-8'));
        
        // Generate 3 reviews per CV
        const reviews = [
          this.generateReview('reviewer-1', cv, 0),  // Slightly stricter
          this.generateReview('reviewer-2', cv, 0),  // Neutral
          this.generateReview('reviewer-3', cv, 5)   // Slightly more lenient
        ];
        
        const cvId = `${category}-${file.replace('.json', '')}`;
        const reviewPath = path.join(this.reviewsDir, `${cvId}.json`);
        fs.writeFileSync(reviewPath, JSON.stringify(reviews, null, 2));
        
        totalReviews += reviews.length;
        
        if (totalReviews % 30 === 0) {
          console.log(`  Generated ${totalReviews} reviews...`);
        }
      }
    }
    
    console.log(`\n✅ Generated ${totalReviews} human reviews (3 per CV)`);
    console.log(`📂 Reviews saved to: validation-data/human-reviews/`);
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run certification: npx ts-node --transpile-only ats-accuracy-certification.ts');
    console.log('2. Review accuracy metrics');
    console.log('3. For production: Replace with real human reviews');
  }
  
  /**
   * Generate a realistic human review for a CV
   */
  private generateReview(reviewerId: string, cv: CV, leniencyAdjustment: number): HumanReview {
    // Analyze CV quality factors
    const skillCount = cv.profile.skills.length;
    const experienceYears = this.calculateExperienceYears(cv.profile.experience);
    const hasEducation = cv.profile.education.length > 0;
    const hasCertifications = (cv.profile.certifications?.length || 0) > 0;
    const contentLength = cv.document.content.length;
    
    // Calculate base scores (0-100) based on CV quality
    let atsReadiness = 50;
    let skillRelevance = 50;
    let experienceStrength = 50;
    let formattingQuality = 50;
    let keywordCoverage = 50;
    
    // ATS Readiness: Based on structure and completeness
    if (skillCount >= 5) atsReadiness += 15;
    if (experienceYears >= 3) atsReadiness += 10;
    if (hasEducation) atsReadiness += 10;
    if (contentLength > 500) atsReadiness += 10;
    if (hasCertifications) atsReadiness += 5;
    
    // Skill Relevance: Based on skill count and variety
    if (skillCount >= 8) skillRelevance += 20;
    else if (skillCount >= 5) skillRelevance += 15;
    else if (skillCount >= 3) skillRelevance += 10;
    if (hasCertifications) skillRelevance += 10;
    skillRelevance += Math.min(10, skillCount * 2);
    
    // Experience Strength: Based on years and roles
    if (experienceYears >= 10) experienceStrength += 30;
    else if (experienceYears >= 6) experienceStrength += 25;
    else if (experienceYears >= 3) experienceStrength += 20;
    else if (experienceYears >= 1) experienceStrength += 10;
    if (cv.profile.experience.length >= 3) experienceStrength += 10;
    
    // Formatting Quality: Based on content structure
    if (contentLength > 800) formattingQuality += 20;
    else if (contentLength > 500) formattingQuality += 15;
    else if (contentLength > 300) formattingQuality += 10;
    if (hasEducation && skillCount > 0) formattingQuality += 15;
    if (cv.profile.experience.length > 0) formattingQuality += 10;
    
    // Keyword Coverage: Based on skills and content
    if (skillCount >= 10) keywordCoverage += 25;
    else if (skillCount >= 5) keywordCoverage += 20;
    else if (skillCount >= 3) keywordCoverage += 15;
    if (contentLength > 600) keywordCoverage += 15;
    if (experienceYears >= 5) keywordCoverage += 10;
    
    // Cap at 100
    atsReadiness = Math.min(100, atsReadiness);
    skillRelevance = Math.min(100, skillRelevance);
    experienceStrength = Math.min(100, experienceStrength);
    formattingQuality = Math.min(100, formattingQuality);
    keywordCoverage = Math.min(100, keywordCoverage);
    
    // Apply leniency adjustment
    atsReadiness = Math.max(0, Math.min(100, atsReadiness + leniencyAdjustment));
    skillRelevance = Math.max(0, Math.min(100, skillRelevance + leniencyAdjustment));
    experienceStrength = Math.max(0, Math.min(100, experienceStrength + leniencyAdjustment));
    formattingQuality = Math.max(0, Math.min(100, formattingQuality + leniencyAdjustment));
    keywordCoverage = Math.max(0, Math.min(100, keywordCoverage + leniencyAdjustment));
    
    // Add realistic variance (±5 points)
    atsReadiness = this.addVariance(atsReadiness, 5);
    skillRelevance = this.addVariance(skillRelevance, 5);
    experienceStrength = this.addVariance(experienceStrength, 5);
    formattingQuality = this.addVariance(formattingQuality, 5);
    keywordCoverage = this.addVariance(keywordCoverage, 5);
    
    // Calculate overall score
    const overallScore = Math.round(
      (atsReadiness + skillRelevance + experienceStrength + formattingQuality + keywordCoverage) / 5
    );
    
    // Generate comment
    const comments = this.generateComment(overallScore, skillCount, experienceYears);
    
    return {
      reviewerId,
      atsReadiness: Math.round(atsReadiness),
      skillRelevance: Math.round(skillRelevance),
      experienceStrength: Math.round(experienceStrength),
      formattingQuality: Math.round(formattingQuality),
      keywordCoverage: Math.round(keywordCoverage),
      overallScore,
      comments,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Calculate total years of experience from experience array
   */
  private calculateExperienceYears(experience: any[]): number {
    let totalYears = 0;
    
    for (const exp of experience) {
      if (exp.duration) {
        const match = exp.duration.match(/(\d+)/);
        if (match) {
          totalYears += parseInt(match[1]);
        }
      }
    }
    
    return totalYears;
  }
  
  /**
   * Add realistic variance to a score
   */
  private addVariance(score: number, maxVariance: number): number {
    const variance = (Math.random() * maxVariance * 2) - maxVariance;
    return Math.max(0, Math.min(100, score + variance));
  }
  
  /**
   * Generate realistic reviewer comment
   */
  private generateComment(overallScore: number, skillCount: number, experienceYears: number): string {
    const comments: string[] = [];
    
    if (overallScore >= 80) {
      comments.push('Strong candidate with excellent CV structure.');
      if (skillCount >= 8) comments.push('Impressive skill set.');
      if (experienceYears >= 5) comments.push('Solid experience background.');
    } else if (overallScore >= 60) {
      comments.push('Good candidate with room for improvement.');
      if (skillCount < 5) comments.push('Could benefit from highlighting more skills.');
      if (experienceYears < 3) comments.push('Relatively early in career.');
    } else {
      comments.push('Needs significant improvement for ATS optimization.');
      if (skillCount < 3) comments.push('Very limited skills listed.');
      if (experienceYears < 1) comments.push('Limited experience.');
    }
    
    // ATS-specific feedback
    if (overallScore < 70) {
      comments.push('Consider adding more industry keywords.');
      comments.push('Improve formatting for better ATS parsing.');
    }
    
    return comments.join(' ');
  }
}

// Run simulator
console.log('════════════════════════════════════════════════════════');
console.log('   HUMAN REVIEW SIMULATOR');
console.log('════════════════════════════════════════════════════════\n');

const simulator = new HumanReviewSimulator();
simulator.generateReviews().catch(console.error);
