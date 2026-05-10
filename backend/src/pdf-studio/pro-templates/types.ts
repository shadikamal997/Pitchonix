export type ProPageArchetype =
  | 'cover'
  | 'introduction'
  | 'section-divider'
  | 'content'
  | 'feature-list'
  | 'stats'
  | 'timeline'
  | 'swot-grid'
  | 'image-text'
  | 'closing';

export interface ProTemplateTokens {
  colors: {
    paper: string;
    ink: string;
    muted: string;
    charcoal: string;
    accent: string;
    accentSoft: string;
    line: string;
  };
}

export interface ProTemplateDefinition {
  id: string;
  name: string;
  family: string;
  category: string;
  description: string;
  tags: string[];
  archetypes: ProPageArchetype[];
  tokens: ProTemplateTokens;
}
