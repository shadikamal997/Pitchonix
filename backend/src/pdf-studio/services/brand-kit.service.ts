import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandKit, DEFAULT_BRAND_KIT, BRAND_KIT_PRESETS } from '../types/brand-kit.types';

@Injectable()
export class BrandKitService {
  constructor(private prisma: PrismaService) {}

  /**
   * Apply brand kit to template style
   */
  applyBrandKitToStyle(baseStyle: any, brandKit: BrandKit): any {
    return {
      ...baseStyle,
      colorScheme: {
        primary: brandKit.colors.primary,
        secondary: brandKit.colors.secondary,
        accent: brandKit.colors.accent,
        text: brandKit.colors.text,
        background: brandKit.colors.background,
        surface: brandKit.colors.surface,
      },
      typography: {
        ...baseStyle.typography,
        fontFamily: brandKit.typography.fontFamily,
        headingFont: brandKit.typography.headingFont || brandKit.typography.fontFamily,
        bodyFont: brandKit.typography.bodyFont || brandKit.typography.fontFamily,
        fontSize: brandKit.typography.fontSize,
      },
      spacing: brandKit.spacing,
      borderRadius: brandKit.style.borderRadius,
      shadowStyle: brandKit.style.shadowStyle,
      headerStyle: brandKit.style.headerStyle,
      logo: brandKit.logo.url ? {
        url: brandKit.logo.url,
        position: brandKit.logo.position,
        size: this.getLogoSize(brandKit.logo.size),
        showOnCover: brandKit.logo.showOnCover,
        showOnHeaders: brandKit.logo.showOnHeaders,
        showOnFooters: brandKit.logo.showOnFooters,
      } : null,
      contact: brandKit.contact || null,
    };
  }

  /**
   * Get logo size in pixels
   */
  private getLogoSize(size: string): string {
    const sizes = {
      small: '60px',
      medium: '120px',
      large: '180px',
    };
    return sizes[size as keyof typeof sizes] || sizes.medium;
  }

  /**
   * Merge brand kit with preset
   */
  mergeBrandKitWithPreset(presetName: string, customizations: Partial<BrandKit> = {}): BrandKit {
    const preset = BRAND_KIT_PRESETS[presetName];
    if (!preset) {
      return { ...DEFAULT_BRAND_KIT, ...customizations };
    }

    return this.deepMerge(
      DEFAULT_BRAND_KIT,
      preset,
      customizations,
    ) as BrandKit;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(...objects: any[]): any {
    const result: any = {};
    
    for (const obj of objects) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (
            typeof obj[key] === 'object' &&
            obj[key] !== null &&
            !Array.isArray(obj[key])
          ) {
            result[key] = this.deepMerge(result[key] || {}, obj[key]);
          } else {
            result[key] = obj[key];
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Get brand kit from database or use default
   */
  async getBrandKit(userId?: string, brandKitId?: string): Promise<BrandKit> {
    if (!brandKitId) {
      return DEFAULT_BRAND_KIT;
    }

    try {
      const brandKit = await this.prisma.brandKit.findUnique({
        where: { id: brandKitId },
      });

      if (!brandKit) {
        return DEFAULT_BRAND_KIT;
      }

      // Phase 37.2B — Prefer the unified Phase 37 BrandTokens shape when
      // available; fall back to legacy `config` / per-column values so older
      // kits stay rendered correctly. This is the "renderer switch" that
      // makes PDF Studio + presentations share one source of truth.
      const tokens = (brandKit.tokens   as any) || null;
      const identity = (brandKit.identity as any) || null;
      const config  = (brandKit.config   as any) || {};

      const tokenColors    = tokens?.colors     || {};
      const tokenTypo      = tokens?.typography || {};
      const tokenStyle     = tokens?.tokens     || {};

      return {
        id: brandKit.id,
        name: brandKit.name,
        userId: brandKit.userId,
        colors: {
          primary:    tokenColors.primary    ?? config.colors?.primary    ?? brandKit.primaryColor   ?? '#3B82F6',
          secondary:  tokenColors.secondary  ?? config.colors?.secondary  ?? brandKit.secondaryColor ?? '#1D4ED8',
          accent:     tokenColors.accent     ?? config.colors?.accent     ?? '#60A5FA',
          text:       config.colors?.text       ?? '#1F2937',
          background: tokenColors.neutral    ?? config.colors?.background ?? '#FFFFFF',
          surface:    config.colors?.surface    ?? '#F9FAFB',
        } as any,
        typography: {
          fontFamily:  tokenTypo.body?.family    ?? config.typography?.fontFamily  ?? brandKit.fontFamily ?? 'Inter, system-ui, sans-serif',
          headingFont: tokenTypo.heading?.family ?? config.typography?.headingFont ?? brandKit.fontFamily ?? undefined,
          bodyFont:    tokenTypo.body?.family    ?? config.typography?.bodyFont    ?? brandKit.fontFamily ?? undefined,
          fontSize:    config.typography?.fontSize ?? { base: 16, heading: 32, body: 16 },
        } as any,
        logo: config.logo || {
          url: brandKit.logo || '',
          position: 'top-left',
          size: 'medium',
          showOnCover: true,
          showOnHeaders: false,
          showOnFooters: false,
        },
        spacing: config.spacing || DEFAULT_BRAND_KIT.spacing,
        style: {
          ...DEFAULT_BRAND_KIT.style,
          ...config.style,
          borderRadius: tokenStyle.borderRadius ?? (config.style?.borderRadius) ?? DEFAULT_BRAND_KIT.style.borderRadius,
          shadowStyle:  tokenStyle.shadowStyle  ?? (config.style?.shadowStyle)  ?? DEFAULT_BRAND_KIT.style.shadowStyle,
        } as any,
        contact: config.contact || identity ? {
          ...(config.contact || {}),
          ...(identity?.companyName ? { companyName: identity.companyName } : {}),
          ...(identity?.website     ? { website:     identity.website     } : {}),
        } : DEFAULT_BRAND_KIT.contact,
      };
    } catch (error) {
      console.error('Error fetching brand kit:', error);
      return DEFAULT_BRAND_KIT;
    }
  }

  /**
   * Create brand kit
   */
  async createBrandKit(userId: string, data: Partial<BrandKit>): Promise<BrandKit> {
    const brandKit = this.deepMerge(DEFAULT_BRAND_KIT, data);
    
    const created = await this.prisma.brandKit.create({
      data: {
        userId,
        name: brandKit.name,
        logo: brandKit.logo?.url || null,
        primaryColor: brandKit.colors?.primary || '#3B82F6',
        secondaryColor: brandKit.colors?.secondary || '#1D4ED8',
        fontFamily: brandKit.typography?.fontFamily || 'Inter, system-ui, sans-serif',
        config: {
          colors: brandKit.colors,
          typography: brandKit.typography,
          logo: brandKit.logo,
          spacing: brandKit.spacing,
          style: brandKit.style,
          contact: brandKit.contact,
        },
      },
    });

    return {
      id: created.id,
      name: created.name,
      userId: created.userId,
      colors: (created.config as any)?.colors || brandKit.colors,
      typography: (created.config as any)?.typography || brandKit.typography,
      logo: (created.config as any)?.logo || brandKit.logo,
      spacing: (created.config as any)?.spacing || brandKit.spacing,
      style: (created.config as any)?.style || brandKit.style,
      contact: (created.config as any)?.contact || brandKit.contact,
    };
  }

  /**
   * Update brand kit
   */
  async updateBrandKit(brandKitId: string, data: Partial<BrandKit>): Promise<BrandKit> {
    const existing = await this.getBrandKit(undefined, brandKitId);
    const merged = this.deepMerge(existing, data);
    
    const updated = await this.prisma.brandKit.update({
      where: { id: brandKitId },
      data: {
        name: merged.name,
        logo: merged.logo?.url || null,
        primaryColor: merged.colors?.primary,
        secondaryColor: merged.colors?.secondary,
        fontFamily: merged.typography?.fontFamily,
        config: {
          colors: merged.colors,
          typography: merged.typography,
          logo: merged.logo,
          spacing: merged.spacing,
          style: merged.style,
          contact: merged.contact,
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      userId: updated.userId,
      colors: (updated.config as any)?.colors || merged.colors,
      typography: (updated.config as any)?.typography || merged.typography,
      logo: (updated.config as any)?.logo || merged.logo,
      spacing: (updated.config as any)?.spacing || merged.spacing,
      style: (updated.config as any)?.style || merged.style,
      contact: (updated.config as any)?.contact || merged.contact,
    };
  }

  /**
   * List user's brand kits
   */
  async listBrandKits(userId: string): Promise<BrandKit[]> {
    const brandKits = await this.prisma.brandKit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return brandKits.map((brandKit) => {
      const config = (brandKit.config as any) || {};
      return {
        id: brandKit.id,
        name: brandKit.name,
        userId: brandKit.userId,
        colors: config.colors || {
          primary: brandKit.primaryColor || '#3B82F6',
          secondary: brandKit.secondaryColor || '#1D4ED8',
          accent: '#60A5FA',
          text: '#1F2937',
          background: '#FFFFFF',
          surface: '#F9FAFB',
        },
        typography: config.typography || {
          fontFamily: brandKit.fontFamily || 'Inter, system-ui, sans-serif',
          fontSize: { base: 16, heading: 32, body: 16 },
        },
        logo: config.logo || { url: brandKit.logo || '', position: 'top-left', size: 'medium' },
        spacing: config.spacing || DEFAULT_BRAND_KIT.spacing,
        style: config.style || DEFAULT_BRAND_KIT.style,
        contact: config.contact || DEFAULT_BRAND_KIT.contact,
      };
    });
  }

  /**
   * Delete brand kit
   */
  async deleteBrandKit(brandKitId: string): Promise<void> {
    await this.prisma.brandKit.delete({
      where: { id: brandKitId },
    });
  }

  /**
   * Get all available presets
   */
  getPresets(): Array<{ name: string; preview: Partial<BrandKit> }> {
    return Object.entries(BRAND_KIT_PRESETS).map(([key, preset]) => ({
      name: key,
      preview: preset,
    }));
  }
}
