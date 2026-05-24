import { Injectable, Logger, Optional } from '@nestjs/common';
import { WizardInput } from '../slide-types/types';
import { ThemeConfig } from './types';
import { PrismaService } from '../../prisma/prisma.service';
import type { BrandTokens, BrandVoice, BrandIdentity } from '../../brand-kits/brand-kits.service';

/**
 * Theme Service
 * Manages presentation themes and branding
 *
 * Phase 37.1A — extended with an async `getThemeForPresentationAsync` that
 * loads a BrandKit by `input.brandKitId` and uses its tokens as the
 * primary source. The legacy sync `getThemeForPresentation` is preserved
 * for callers that pass inline `brandColors` / `fontStyle`.
 */
@Injectable()
export class ThemeService {
  private readonly logger = new Logger(ThemeService.name);
  private themes: Map<string, ThemeConfig> = new Map();

  constructor(
    // Optional so unit tests + tools that instantiate ThemeService directly
    // (without a Nest container) keep working.
    @Optional() private prisma?: PrismaService,
  ) {
    this.initializeThemes();
  }

  /**
   * Get theme based on wizard input
   */
  getThemeForPresentation(input: WizardInput): ThemeConfig {
    const themeName = input.theme || 'modern';
    let theme = this.themes.get(themeName);

    if (!theme) {
      this.logger.warn(`Theme ${themeName} not found, using modern`);
      theme = this.themes.get('modern')!;
    }

    // Apply brand colors if provided
    if (input.brandColors) {
      theme = this.applyBrandColors(theme, input.brandColors);
    }

    // Apply font style if provided
    if (input.fontStyle) {
      theme = this.applyFontStyle(theme, input.fontStyle);
    }

    return theme;
  }

  /**
   * Phase 37.1A — async variant that loads a saved BrandKit by id and
   * applies its tokens on top of the resolved theme. Falls back to the
   * sync behavior when no kit id is supplied or the lookup fails — the
   * generation pipeline keeps working in either case.
   *
   *   { colors, typography, voice, identity } ← BrandKit
   */
  async getThemeForPresentationAsync(input: WizardInput): Promise<ThemeConfig & {
    voice?: BrandVoice; identity?: BrandIdentity; logo?: string;
  }> {
    let theme: ThemeConfig & { voice?: BrandVoice; identity?: BrandIdentity; logo?: string } =
      this.getThemeForPresentation(input);

    if (!input.brandKitId || !this.prisma) return theme;

    try {
      const kit = await this.prisma.brandKit.findUnique({
        where: { id: input.brandKitId },
      });
      if (!kit) {
        this.logger.warn(`BrandKit ${input.brandKitId} not found, using inline theme`);
        return theme;
      }
      theme = this.applyBrandKitTokens(theme, kit);
    } catch (e: any) {
      this.logger.warn(`BrandKit lookup failed: ${e?.message}`);
    }
    return theme;
  }

  /**
   * Phase 37.1A — merge a persisted BrandKit's tokens into a ThemeConfig.
   * BrandKit tokens take precedence over the wizard's inline values.
   */
  private applyBrandKitTokens(
    theme: ThemeConfig,
    kit: { tokens: any; voice: any; identity: any; logo: string | null; primaryColor: string | null; secondaryColor: string | null; fontFamily: string | null },
  ): ThemeConfig & { voice?: BrandVoice; identity?: BrandIdentity; logo?: string } {
    const tokens = (kit.tokens as BrandTokens | null) || {};
    const colors = tokens.colors || {};
    const typo   = tokens.typography || {};

    const next: ThemeConfig & { voice?: BrandVoice; identity?: BrandIdentity; logo?: string } = {
      ...theme,
      colors: {
        ...theme.colors,
        primary:   colors.primary   ?? kit.primaryColor   ?? theme.colors.primary,
        secondary: colors.secondary ?? kit.secondaryColor ?? theme.colors.secondary,
        accent:    colors.accent    ?? theme.colors.accent,
      },
      fonts: {
        ...theme.fonts,
        heading: typo.heading?.family ?? kit.fontFamily ?? theme.fonts.heading,
        body:    typo.body?.family    ?? kit.fontFamily ?? theme.fonts.body,
      },
      voice:    (kit.voice    as BrandVoice    | null) || undefined,
      identity: (kit.identity as BrandIdentity | null) || undefined,
      logo:     kit.logo || undefined,
    };
    return next;
  }

  /**
   * Apply brand colors to theme
   */
  private applyBrandColors(
    theme: ThemeConfig,
    brandColors: { primary: string; secondary: string; accent: string },
  ): ThemeConfig {
    return {
      ...theme,
      colors: {
        ...theme.colors,
        primary: brandColors.primary,
        secondary: brandColors.secondary,
        accent: brandColors.accent,
      },
    };
  }

  /**
   * Apply font style to theme
   */
  private applyFontStyle(theme: ThemeConfig, fontStyle: string): ThemeConfig {
    const fontMap: Record<string, { heading: string; body: string }> = {
      'sans-serif': {
        heading: 'Inter, -apple-system, sans-serif',
        body: 'Inter, -apple-system, sans-serif',
      },
      serif: {
        heading: 'Georgia, serif',
        body: 'Georgia, serif',
      },
      modern: {
        heading: 'Poppins, sans-serif',
        body: 'Inter, sans-serif',
      },
      classic: {
        heading: 'Playfair Display, serif',
        body: 'Source Sans Pro, sans-serif',
      },
      minimal: {
        heading: 'Helvetica Neue, sans-serif',
        body: 'Helvetica Neue, sans-serif',
      },
    };

    const fonts = fontMap[fontStyle] || fontMap['sans-serif'];

    return {
      ...theme,
      fonts: {
        ...theme.fonts,
        heading: fonts.heading,
        body: fonts.body,
      },
    };
  }

  /**
   * Initialize predefined themes
   */
  private initializeThemes(): void {
    // Modern Theme
    this.themes.set('modern', {
      name: 'modern',
      displayName: 'Modern',
      colors: {
        primary: '#4F46E5',
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#111827',
        textSecondary: '#6B7280',
      },
      fonts: {
        heading: 'Poppins, sans-serif',
        body: 'Inter, sans-serif',
        code: 'Fira Code, monospace',
      },
      fontSize: {
        h1: 48,
        h2: 36,
        h3: 28,
        body: 18,
        small: 14,
      },
      spacing: {
        small: 8,
        medium: 16,
        large: 32,
      },
      borderRadius: 8,
      shadowEnabled: true,
    });

    // Professional Theme
    this.themes.set('professional', {
      name: 'professional',
      displayName: 'Professional',
      colors: {
        primary: '#1E40AF',
        secondary: '#059669',
        accent: '#D97706',
        background: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#4B5563',
      },
      fonts: {
        heading: 'IBM Plex Sans, sans-serif',
        body: 'IBM Plex Sans, sans-serif',
        code: 'IBM Plex Mono, monospace',
      },
      fontSize: {
        h1: 44,
        h2: 32,
        h3: 24,
        body: 16,
        small: 12,
      },
      spacing: {
        small: 10,
        medium: 20,
        large: 40,
      },
      borderRadius: 4,
      shadowEnabled: false,
    });

    // Minimal Theme
    this.themes.set('minimal', {
      name: 'minimal',
      displayName: 'Minimal',
      colors: {
        primary: '#000000',
        secondary: '#374151',
        accent: '#6B7280',
        background: '#FFFFFF',
        text: '#111827',
        textSecondary: '#9CA3AF',
      },
      fonts: {
        heading: 'Helvetica Neue, sans-serif',
        body: 'Helvetica Neue, sans-serif',
      },
      fontSize: {
        h1: 52,
        h2: 38,
        h3: 28,
        body: 18,
        small: 14,
      },
      spacing: {
        small: 12,
        medium: 24,
        large: 48,
      },
      borderRadius: 0,
      shadowEnabled: false,
    });

    // Bold Theme
    this.themes.set('bold', {
      name: 'bold',
      displayName: 'Bold',
      colors: {
        primary: '#DC2626',
        secondary: '#7C3AED',
        accent: '#F59E0B',
        background: '#FAFAFA',
        text: '#000000',
        textSecondary: '#525252',
      },
      fonts: {
        heading: 'Montserrat, sans-serif',
        body: 'Open Sans, sans-serif',
      },
      fontSize: {
        h1: 56,
        h2: 40,
        h3: 30,
        body: 20,
        small: 16,
      },
      spacing: {
        small: 10,
        medium: 20,
        large: 40,
      },
      borderRadius: 12,
      shadowEnabled: true,
    });

    // Corporate Theme
    this.themes.set('corporate', {
      name: 'corporate',
      displayName: 'Corporate',
      colors: {
        primary: '#0F172A',
        secondary: '#1E3A8A',
        accent: '#3B82F6',
        background: '#FFFFFF',
        text: '#1E293B',
        textSecondary: '#64748B',
      },
      fonts: {
        heading: 'Arial, sans-serif',
        body: 'Arial, sans-serif',
      },
      fontSize: {
        h1: 42,
        h2: 32,
        h3: 24,
        body: 16,
        small: 12,
      },
      spacing: {
        small: 8,
        medium: 16,
        large: 32,
      },
      borderRadius: 4,
      shadowEnabled: false,
    });

    // Creative Theme
    this.themes.set('creative', {
      name: 'creative',
      displayName: 'Creative',
      colors: {
        primary: '#EC4899',
        secondary: '#8B5CF6',
        accent: '#F59E0B',
        background: '#FEFCE8',
        text: '#1F2937',
        textSecondary: '#6B7280',
      },
      fonts: {
        heading: 'Playfair Display, serif',
        body: 'Source Sans Pro, sans-serif',
      },
      fontSize: {
        h1: 54,
        h2: 38,
        h3: 28,
        body: 18,
        small: 14,
      },
      spacing: {
        small: 10,
        medium: 20,
        large: 40,
      },
      borderRadius: 16,
      shadowEnabled: true,
    });

    // Tech Theme
    this.themes.set('tech', {
      name: 'tech',
      displayName: 'Tech',
      colors: {
        primary: '#06B6D4',
        secondary: '#8B5CF6',
        accent: '#10B981',
        background: '#0F172A',
        text: '#F1F5F9',
        textSecondary: '#94A3B8',
      },
      fonts: {
        heading: 'Space Grotesk, sans-serif',
        body: 'Inter, sans-serif',
        code: 'JetBrains Mono, monospace',
      },
      fontSize: {
        h1: 50,
        h2: 36,
        h3: 26,
        body: 18,
        small: 14,
      },
      spacing: {
        small: 8,
        medium: 16,
        large: 32,
      },
      borderRadius: 8,
      shadowEnabled: true,
    });

    this.logger.log(`Initialized ${this.themes.size} themes`);
  }

  /**
   * Get all available themes
   */
  getAllThemes(): ThemeConfig[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get theme by name
   */
  getTheme(name: string): ThemeConfig | undefined {
    return this.themes.get(name);
  }

  /**
   * Add custom theme
   */
  addTheme(theme: ThemeConfig): void {
    this.themes.set(theme.name, theme);
    this.logger.log(`Added custom theme: ${theme.name}`);
  }

  /**
   * Generate color palette from primary color
   */
  generateColorPalette(primaryColor: string): {
    primary: string;
    secondary: string;
    accent: string;
  } {
    // Simple color generation - in production, use a proper color theory library
    return {
      primary: primaryColor,
      secondary: this.adjustColor(primaryColor, 30),
      accent: this.adjustColor(primaryColor, -30),
    };
  }

  /**
   * Adjust color hue (simplified)
   */
  private adjustColor(hex: string, amount: number): string {
    // Remove # if present
    hex = hex.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Adjust each component
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
}
