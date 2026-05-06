import { Injectable, Logger } from '@nestjs/common';
import {
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
  ValidationRule,
} from './types';
import { VisualSlideContent, LayoutType } from '../visual/types';
import { WizardInput } from '../slide-types/types';

/**
 * Validation Service
 * Implements rule-based validation for presentation content
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  private rules: ValidationRule[];

  constructor() {
    this.rules = this.initializeRules();
  }

  /**
   * Validate slides against all rules
   */
  validate(
    slides: VisualSlideContent[],
    input?: WizardInput,
  ): ValidationResult {
    this.logger.log(`Validating ${slides.length} slides against ${this.rules.length} rules`);

    const allIssues: ValidationIssue[] = [];

    // Run all validation rules
    this.rules.forEach(rule => {
      try {
        const issues = rule.validate(slides, input);
        allIssues.push(...issues);
      } catch (error) {
        this.logger.error(`Validation rule ${rule.id} failed: ${error.message}`);
      }
    });

    // Categorize issues by severity
    const errors = allIssues.filter(i => i.severity === ValidationSeverity.ERROR);
    const warnings = allIssues.filter(i => i.severity === ValidationSeverity.WARNING);
    const info = allIssues.filter(i => i.severity === ValidationSeverity.INFO);

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      summary: {
        totalIssues: allIssues.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        infoCount: info.length,
      },
      timestamp: new Date(),
    };

    this.logger.log(
      `Validation complete: ${errors.length} errors, ${warnings.length} warnings, ${info.length} info`,
    );

    return result;
  }

  /**
   * Initialize all validation rules
   */
  private initializeRules(): ValidationRule[] {
    return [
      // Content rules
      this.createTitleSlideRule(),
      this.createContentLengthRule(),
      this.createBulletPointRule(),
      this.createContactInfoRule(),

      // Chart rules
      this.createChartDataRule(),
      this.createChartLabelsRule(),

      // Visual rules
      this.createThemeConsistencyRule(),
      this.createLayoutRule(),
      this.createImageRule(),

      // Best practice rules
      this.createSlideCountRule(),
      this.createContentDensityRule(),
      this.createRequiredSlidesRule(),
    ];
  }

  /**
   * Rule: Title slide must have company name
   */
  private createTitleSlideRule(): ValidationRule {
    return {
      id: 'title-slide-company-name',
      name: 'Title Slide Company Name',
      description: 'Title slide must include company name',
      severity: ValidationSeverity.ERROR,
      category: 'content',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];
        const titleSlide = slides.find(s => s.type === 'title');

        if (titleSlide) {
          if (!titleSlide.title || titleSlide.title.length < 2) {
            issues.push({
              severity: ValidationSeverity.ERROR,
              rule: 'title-slide-company-name',
              message: 'Title slide must have a company name (minimum 2 characters)',
              slideIndex: slides.indexOf(titleSlide),
              slideType: 'title',
              field: 'title',
              suggestion: 'Add your company name to the title slide',
            });
          }
        } else {
          issues.push({
            severity: ValidationSeverity.WARNING,
            rule: 'title-slide-company-name',
            message: 'No title slide found in presentation',
            suggestion: 'Add a title slide to introduce your presentation',
          });
        }

        return issues;
      },
    };
  }

  /**
   * Rule: Content should be within length limits
   */
  private createContentLengthRule(): ValidationRule {
    return {
      id: 'content-length',
      name: 'Content Length',
      description: 'Slide content should be appropriate length',
      severity: ValidationSeverity.WARNING,
      category: 'content',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];

        slides.forEach((slide, index) => {
          // Check title length
          if (slide.title) {
            if (slide.title.length < 5) {
              issues.push({
                severity: ValidationSeverity.WARNING,
                rule: 'content-length',
                message: `Slide ${index + 1}: Title is too short (${slide.title.length} chars)`,
                slideIndex: index,
                slideType: slide.type,
                field: 'title',
                suggestion: 'Title should be at least 5 characters',
              });
            } else if (slide.title.length > 80) {
              issues.push({
                severity: ValidationSeverity.WARNING,
                rule: 'content-length',
                message: `Slide ${index + 1}: Title is too long (${slide.title.length} chars)`,
                slideIndex: index,
                slideType: slide.type,
                field: 'title',
                suggestion: 'Keep title under 80 characters for readability',
              });
            }
          }

          // Check subtitle length
          if (slide.subtitle && slide.subtitle.length > 120) {
            issues.push({
              severity: ValidationSeverity.INFO,
              rule: 'content-length',
              message: `Slide ${index + 1}: Subtitle is quite long (${slide.subtitle.length} chars)`,
              slideIndex: index,
              slideType: slide.type,
              field: 'subtitle',
              suggestion: 'Consider keeping subtitle under 120 characters',
            });
          }
        });

        return issues;
      },
    };
  }

  /**
   * Rule: Bullet points should follow best practices
   */
  private createBulletPointRule(): ValidationRule {
    return {
      id: 'bullet-points',
      name: 'Bullet Points',
      description: 'Bullet points should be concise and limited in number',
      severity: ValidationSeverity.WARNING,
      category: 'content',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];

        slides.forEach((slide, index) => {
          if (Array.isArray(slide.content)) {
            // Too many bullets
            if (slide.content.length > 7) {
              issues.push({
                severity: ValidationSeverity.WARNING,
                rule: 'bullet-points',
                message: `Slide ${index + 1}: Too many bullet points (${slide.content.length})`,
                slideIndex: index,
                slideType: slide.type,
                field: 'content',
                suggestion: 'Limit to 5-7 bullet points per slide',
              });
            }

            // Check individual bullet length
            slide.content.forEach((bullet, bulletIndex) => {
              if (typeof bullet === 'string') {
                if (bullet.length < 10) {
                  issues.push({
                    severity: ValidationSeverity.INFO,
                    rule: 'bullet-points',
                    message: `Slide ${index + 1}, bullet ${bulletIndex + 1}: Very short bullet point`,
                    slideIndex: index,
                    slideType: slide.type,
                    field: 'content',
                    suggestion: 'Consider adding more detail',
                  });
                } else if (bullet.length > 200) {
                  issues.push({
                    severity: ValidationSeverity.WARNING,
                    rule: 'bullet-points',
                    message: `Slide ${index + 1}, bullet ${bulletIndex + 1}: Bullet point is too long (${bullet.length} chars)`,
                    slideIndex: index,
                    slideType: slide.type,
                    field: 'content',
                    suggestion: 'Keep bullet points under 200 characters',
                  });
                }
              }
            });
          }
        });

        return issues;
      },
    };
  }

  /**
   * Rule: Contact information should be present
   */
  private createContactInfoRule(): ValidationRule {
    return {
      id: 'contact-info',
      name: 'Contact Information',
      description: 'Presentation should include contact information',
      severity: ValidationSeverity.INFO,
      category: 'content',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];
        
        const hasContactSlide = slides.some(s => 
          s.type === 'contact' || 
          s.type === 'closing' ||
          (s.content && JSON.stringify(s.content).match(/@|contact|email|phone/i))
        );

        if (!hasContactSlide) {
          issues.push({
            severity: ValidationSeverity.INFO,
            rule: 'contact-info',
            message: 'No contact information found',
            suggestion: 'Add a closing slide with contact details',
          });
        }

        return issues;
      },
    };
  }

  /**
   * Rule: Charts must have valid data
   */
  private createChartDataRule(): ValidationRule {
    return {
      id: 'chart-data',
      name: 'Chart Data',
      description: 'Charts must have valid data points',
      severity: ValidationSeverity.ERROR,
      category: 'chart',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];

        slides.forEach((slide, index) => {
          slide.charts?.forEach((chart, chartIndex) => {
            if (!chart.data || chart.data.length === 0) {
              issues.push({
                severity: ValidationSeverity.ERROR,
                rule: 'chart-data',
                message: `Slide ${index + 1}, chart ${chartIndex + 1}: Chart has no data`,
                slideIndex: index,
                slideType: slide.type,
                suggestion: 'Add data points to the chart or remove it',
              });
            }

            // Check for non-numeric data where numeric is expected
            chart.data?.forEach((series, seriesIndex) => {
              if (series.values) {
                const invalidValues = series.values.filter(v => 
                  typeof v !== 'number' && v !== null && v !== undefined
                );
                if (invalidValues.length > 0) {
                  issues.push({
                    severity: ValidationSeverity.ERROR,
                    rule: 'chart-data',
                    message: `Slide ${index + 1}, chart ${chartIndex + 1}: Invalid data in series ${seriesIndex + 1}`,
                    slideIndex: index,
                    slideType: slide.type,
                    suggestion: 'Ensure all chart values are numeric',
                  });
                }
              }
            });
          });
        });

        return issues;
      },
    };
  }

  /**
   * Rule: Charts must have labels
   */
  private createChartLabelsRule(): ValidationRule {
    return {
      id: 'chart-labels',
      name: 'Chart Labels',
      description: 'Charts should have labels for readability',
      severity: ValidationSeverity.WARNING,
      category: 'chart',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];

        slides.forEach((slide, index) => {
          slide.charts?.forEach((chart, chartIndex) => {
            // Check if series have proper labels
            chart.data?.forEach((series, seriesIndex) => {
              if (!series.labels || series.labels.length === 0) {
                issues.push({
                  severity: ValidationSeverity.INFO,
                  rule: 'chart-labels',
                  message: `Slide ${index + 1}, chart ${chartIndex + 1}: Series ${seriesIndex + 1} has no labels`,
                  slideIndex: index,
                  slideType: slide.type,
                  suggestion: 'Add labels to make the chart more readable',
                });
              }

              // Check if label count matches values count
              if (series.labels && series.values && series.labels.length !== series.values.length) {
                issues.push({
                  severity: ValidationSeverity.WARNING,
                  rule: 'chart-labels',
                  message: `Slide ${index + 1}, chart ${chartIndex + 1}: Series ${seriesIndex + 1} label count (${series.labels.length}) doesn't match value count (${series.values.length})`,
                  slideIndex: index,
                  slideType: slide.type,
                  suggestion: 'Ensure each data point has a corresponding label',
                });
              }
            });
          });
        });

        return issues;
      },
    };
  }

  /**
   * Rule: Theme should be consistent
   */
  private createThemeConsistencyRule(): ValidationRule {
    return {
      id: 'theme-consistency',
      name: 'Theme Consistency',
      description: 'All slides should use the same theme',
      severity: ValidationSeverity.WARNING,
      category: 'theme',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];

        if (slides.length > 0) {
          const firstTheme = slides[0].theme;
          
          slides.forEach((slide, index) => {
            if (slide.theme.name !== firstTheme.name) {
              issues.push({
                severity: ValidationSeverity.WARNING,
                rule: 'theme-consistency',
                message: `Slide ${index + 1}: Using different theme (${slide.theme.name} vs ${firstTheme.name})`,
                slideIndex: index,
                slideType: slide.type,
                suggestion: 'Use consistent theme across all slides',
              });
            }

            if (slide.theme.colors.primary !== firstTheme.colors.primary) {
              issues.push({
                severity: ValidationSeverity.INFO,
                rule: 'theme-consistency',
                message: `Slide ${index + 1}: Different primary color used`,
                slideIndex: index,
                slideType: slide.type,
                suggestion: 'Maintain consistent brand colors',
              });
            }
          });
        }

        return issues;
      },
    };
  }

  /**
   * Rule: Layouts should be appropriate
   */
  private createLayoutRule(): ValidationRule {
    return {
      id: 'layout-appropriate',
      name: 'Layout Appropriateness',
      description: 'Slides should use appropriate layouts',
      severity: ValidationSeverity.INFO,
      category: 'visual',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];

        slides.forEach((slide, index) => {
          // Title slide should use title layout
          if (slide.type === 'title' && slide.layout.type !== LayoutType.TITLE_SLIDE && slide.layout.type !== LayoutType.TITLE_CONTENT) {
            issues.push({
              severity: ValidationSeverity.INFO,
              rule: 'layout-appropriate',
              message: `Slide ${index + 1}: Title slide not using title layout`,
              slideIndex: index,
              slideType: slide.type,
              suggestion: 'Consider using TITLE_SLIDE or TITLE_CONTENT layout',
            });
          }

          // Charts should use appropriate layout
          if (slide.charts && slide.charts.length > 0) {
            if (slide.layout.type !== LayoutType.TITLE_CHART) {
              issues.push({
                severity: ValidationSeverity.INFO,
                rule: 'layout-appropriate',
                message: `Slide ${index + 1}: Has charts but not using chart layout`,
                slideIndex: index,
                slideType: slide.type,
                suggestion: 'Consider using TITLE_CHART layout',
              });
            }
          }
        });

        return issues;
      },
    };
  }

  /**
   * Rule: Images should have reasonable sizes
   */
  private createImageRule(): ValidationRule {
    return {
      id: 'image-size',
      name: 'Image Size',
      description: 'Images should have reasonable dimensions',
      severity: ValidationSeverity.WARNING,
      category: 'visual',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];

        slides.forEach((slide, index) => {
          slide.images?.forEach((image, imageIndex) => {
            if (image.width > 2000 || image.height > 2000) {
              issues.push({
                severity: ValidationSeverity.WARNING,
                rule: 'image-size',
                message: `Slide ${index + 1}, image ${imageIndex + 1}: Image is very large (${image.width}x${image.height})`,
                slideIndex: index,
                slideType: slide.type,
                suggestion: 'Consider reducing image size for better performance',
              });
            }

            if (!image.altText) {
              issues.push({
                severity: ValidationSeverity.INFO,
                rule: 'image-size',
                message: `Slide ${index + 1}, image ${imageIndex + 1}: Missing alt text`,
                slideIndex: index,
                slideType: slide.type,
                suggestion: 'Add alt text for accessibility',
              });
            }
          });
        });

        return issues;
      },
    };
  }

  /**
   * Rule: Slide count should be appropriate
   */
  private createSlideCountRule(): ValidationRule {
    return {
      id: 'slide-count',
      name: 'Slide Count',
      description: 'Presentation should have appropriate number of slides',
      severity: ValidationSeverity.INFO,
      category: 'best-practice',
      validate: (slides: VisualSlideContent[], input?: WizardInput) => {
        const issues: ValidationIssue[] = [];
        const count = slides.length;

        let minRecommended = 8;
        let maxRecommended = 20;

        if (input) {
          if (input.documentType === 'pitch_deck') {
            minRecommended = 10;
            maxRecommended = 15;
          } else if (input.documentType === 'one_pager') {
            minRecommended = 1;
            maxRecommended = 3;
          } else if (input.documentType === 'business_plan') {
            minRecommended = 15;
            maxRecommended = 30;
          }
        }

        if (count < minRecommended) {
          issues.push({
            severity: ValidationSeverity.INFO,
            rule: 'slide-count',
            message: `Presentation has only ${count} slides (recommended: ${minRecommended}-${maxRecommended})`,
            suggestion: 'Consider adding more slides to cover your topic thoroughly',
          });
        } else if (count > maxRecommended) {
          issues.push({
            severity: ValidationSeverity.INFO,
            rule: 'slide-count',
            message: `Presentation has ${count} slides (recommended: ${minRecommended}-${maxRecommended})`,
            suggestion: 'Consider condensing content to keep audience engaged',
          });
        }

        return issues;
      },
    };
  }

  /**
   * Rule: Content density should be balanced
   */
  private createContentDensityRule(): ValidationRule {
    return {
      id: 'content-density',
      name: 'Content Density',
      description: 'Slides should not be too dense or too sparse',
      severity: ValidationSeverity.INFO,
      category: 'best-practice',
      validate: (slides: VisualSlideContent[]) => {
        const issues: ValidationIssue[] = [];

        slides.forEach((slide, index) => {
          let contentElements = 0;
          
          if (slide.title) contentElements++;
          if (slide.subtitle) contentElements++;
          if (slide.content) contentElements++;
          if (slide.charts && slide.charts.length > 0) contentElements += slide.charts.length;
          if (slide.images && slide.images.length > 0) contentElements += slide.images.length;

          if (contentElements === 0) {
            issues.push({
              severity: ValidationSeverity.WARNING,
              rule: 'content-density',
              message: `Slide ${index + 1}: Slide appears to be empty`,
              slideIndex: index,
              slideType: slide.type,
              suggestion: 'Add content to this slide or remove it',
            });
          } else if (contentElements > 5) {
            issues.push({
              severity: ValidationSeverity.INFO,
              rule: 'content-density',
              message: `Slide ${index + 1}: Slide has many elements (${contentElements})`,
              slideIndex: index,
              slideType: slide.type,
              suggestion: 'Consider splitting content across multiple slides',
            });
          }
        });

        return issues;
      },
    };
  }

  /**
   * Rule: Required slides should be present
   */
  private createRequiredSlidesRule(): ValidationRule {
    return {
      id: 'required-slides',
      name: 'Required Slides',
      description: 'Presentation should have all required slides',
      severity: ValidationSeverity.WARNING,
      category: 'best-practice',
      validate: (slides: VisualSlideContent[], input?: WizardInput) => {
        const issues: ValidationIssue[] = [];
        const slideTypes = slides.map(s => s.type);

        let requiredSlides: string[] = ['title', 'problem', 'solution'];

        if (input?.documentType === 'pitch_deck') {
          requiredSlides = ['title', 'problem', 'solution', 'market', 'team', 'ask'];
        } else if (input?.documentType === 'business_plan') {
          requiredSlides = ['title', 'executive_summary', 'problem', 'solution', 'market', 'business_model'];
        }

        requiredSlides.forEach(requiredType => {
          if (!slideTypes.includes(requiredType)) {
            issues.push({
              severity: ValidationSeverity.WARNING,
              rule: 'required-slides',
              message: `Missing recommended slide: ${requiredType.replace('_', ' ')}`,
              suggestion: `Add a ${requiredType.replace('_', ' ')} slide for completeness`,
            });
          }
        });

        return issues;
      },
    };
  }
}
