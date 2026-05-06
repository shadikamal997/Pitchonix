export interface BrandKit {
  id?: string;
  name: string;
  userId?: string;
  
  // Colors
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
    surface: string;
  };
  
  // Typography
  typography: {
    fontFamily: string;
    headingFont?: string;
    bodyFont?: string;
    fontSize: {
      h1: string;
      h2: string;
      h3: string;
      body: string;
      small: string;
    };
  };
  
  // Logo
  logo: {
    url: string;
    position: 'left' | 'center' | 'right';
    size: 'small' | 'medium' | 'large';
    showOnCover: boolean;
    showOnHeaders: boolean;
    showOnFooters: boolean;
  };
  
  // Spacing & Layout
  spacing: {
    page: {
      marginTop: string;
      marginBottom: string;
      marginLeft: string;
      marginRight: string;
    };
    section: {
      gap: string;
      padding: string;
    };
  };
  
  // Style Preferences
  style: {
    borderRadius: string;
    shadowStyle: 'none' | 'light' | 'medium' | 'heavy';
    headerStyle: 'solid' | 'gradient' | 'minimal';
    buttonStyle: 'rounded' | 'square' | 'pill';
  };
  
  // Contact Information
  contact?: {
    companyName?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  name: 'Default Brand Kit',
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#10B981',
    text: '#1F2937',
    background: '#FFFFFF',
    surface: '#F9FAFB',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      h1: '36px',
      h2: '28px',
      h3: '24px',
      body: '16px',
      small: '14px',
    },
  },
  logo: {
    url: '',
    position: 'left',
    size: 'medium',
    showOnCover: true,
    showOnHeaders: false,
    showOnFooters: true,
  },
  spacing: {
    page: {
      marginTop: '20mm',
      marginBottom: '20mm',
      marginLeft: '15mm',
      marginRight: '15mm',
    },
    section: {
      gap: '24px',
      padding: '16px',
    },
  },
  style: {
    borderRadius: '8px',
    shadowStyle: 'light',
    headerStyle: 'solid',
    buttonStyle: 'rounded',
  },
};

// Pre-defined brand kit presets
export const BRAND_KIT_PRESETS: Record<string, Partial<BrandKit>> = {
  professional: {
    name: 'Professional',
    colors: {
      primary: '#1E3A8A',
      secondary: '#3B82F6',
      accent: '#10B981',
      text: '#1F2937',
      background: '#FFFFFF',
      surface: '#F3F4F6',
    },
    style: {
      borderRadius: '4px',
      shadowStyle: 'light',
      headerStyle: 'solid',
      buttonStyle: 'square',
    },
  },
  modern: {
    name: 'Modern',
    colors: {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      accent: '#F59E0B',
      text: '#111827',
      background: '#FFFFFF',
      surface: '#FAFAFA',
    },
    style: {
      borderRadius: '12px',
      shadowStyle: 'medium',
      headerStyle: 'gradient',
      buttonStyle: 'rounded',
    },
  },
  minimal: {
    name: 'Minimal',
    colors: {
      primary: '#000000',
      secondary: '#4B5563',
      accent: '#6B7280',
      text: '#1F2937',
      background: '#FFFFFF',
      surface: '#F9FAFB',
    },
    style: {
      borderRadius: '2px',
      shadowStyle: 'none',
      headerStyle: 'minimal',
      buttonStyle: 'square',
    },
  },
  vibrant: {
    name: 'Vibrant',
    colors: {
      primary: '#EF4444',
      secondary: '#F59E0B',
      accent: '#10B981',
      text: '#1F2937',
      background: '#FFFFFF',
      surface: '#FEF3C7',
    },
    style: {
      borderRadius: '16px',
      shadowStyle: 'heavy',
      headerStyle: 'gradient',
      buttonStyle: 'pill',
    },
  },
  corporate: {
    name: 'Corporate',
    colors: {
      primary: '#1E40AF',
      secondary: '#1E3A8A',
      accent: '#3B82F6',
      text: '#1F2937',
      background: '#FFFFFF',
      surface: '#EFF6FF',
    },
    style: {
      borderRadius: '4px',
      shadowStyle: 'light',
      headerStyle: 'solid',
      buttonStyle: 'square',
    },
  },
};
