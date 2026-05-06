import { z } from 'zod';

/**
 * Validation schemas for wizard forms
 */

export const documentTypeSchema = z.object({
  documentType: z.enum([
    'pitch_deck',
    'business_plan',
    'proposal',
    'sales_deck',
    'company_profile',
    'executive_summary',
    'marketing_plan',
    'financial_projection',
    'case_study',
    'internal_report',
    'partnership_proposal',
    'one_pager',
    'board_meeting_deck',
    'training_presentation',
    'product_launch',
    'strategy_presentation',
  ], {
    errorMap: () => ({ message: 'Please select a document type' })
  }),
});

export const businessInfoSchema = z.object({
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters'),
  
  industry: z.string()
    .min(1, 'Industry is required'),
  
  businessStage: z.string().optional(),
  
  country: z.string()
    .max(100, 'Country must be less than 100 characters')
    .optional(),
  
  website: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  
  productService: z.string()
    .max(200, 'Product/Service description must be less than 200 characters')
    .optional(),
  
  shortDescription: z.string()
    .min(10, 'Description should be at least 10 characters')
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

export const businessDetailsSchema = z.object({
  problem: z.string()
    .min(20, 'Please provide at least 20 characters describing the problem')
    .max(2000, 'Problem description is too long (max 2000 characters)'),
  
  solution: z.string()
    .min(20, 'Please provide at least 20 characters describing the solution')
    .max(2000, 'Solution description is too long (max 2000 characters)'),
  
  targetCustomers: z.string()
    .max(1000, 'Target customers description is too long (max 1000 characters)')
    .optional(),
  
  differentiation: z.string()
    .max(1000, 'Differentiation description is too long (max 1000 characters)')
    .optional(),
  
  marketOpportunity: z.string()
    .max(1000, 'Market opportunity description is too long (max 1000 characters)')
    .optional(),
  
  competitors: z.string()
    .max(1000, 'Competitors description is too long (max 1000 characters)')
    .optional(),
  
  revenueModel: z.string()
    .max(1000, 'Revenue model description is too long (max 1000 characters)')
    .optional(),
  
  pricing: z.string()
    .max(1000, 'Pricing description is too long (max 1000 characters)')
    .optional(),
  
  traction: z.string()
    .max(1000, 'Traction description is too long (max 1000 characters)')
    .optional(),
  
  team: z.string()
    .max(1000, 'Team description is too long (max 1000 characters)')
    .optional(),
  
  fundingAsk: z.string()
    .max(1000, 'Funding ask description is too long (max 1000 characters)')
    .optional(),
  
  roadmap: z.string()
    .max(1000, 'Roadmap description is too long (max 1000 characters)')
    .optional(),
});

export const designPreferencesSchema = z.object({
  colorScheme: z.enum(['professional', 'vibrant', 'minimal', 'bold'], {
    errorMap: () => ({ message: 'Please select a color scheme' })
  }),
  
  fontStyle: z.enum(['modern', 'classic', 'playful', 'elegant'], {
    errorMap: () => ({ message: 'Please select a font style' })
  }),
  
  imageStyle: z.enum(['photos', 'illustrations', 'minimal'], {
    errorMap: () => ({ message: 'Please select an image style' })
  }),
});

export const generationSettingsSchema = z.object({
  deckLength: z.enum(['short', 'medium', 'long'], {
    errorMap: () => ({ message: 'Please select a deck length' })
  }),
  
  includeCharts: z.boolean(),
  
  tone: z.enum(['professional', 'casual', 'technical', 'persuasive'], {
    errorMap: () => ({ message: 'Please select a tone' })
  }),
});

/**
 * Combine all wizard schemas for full validation
 */
export const wizardDataSchema = documentTypeSchema
  .merge(businessInfoSchema)
  .merge(businessDetailsSchema)
  .merge(designPreferencesSchema)
  .merge(generationSettingsSchema);

/**
 * Validation helper function
 */
export function validateWizardStep(
  stepNumber: number,
  data: any
): { success: boolean; errors?: Record<string, string> } {
  let schema: z.ZodSchema;

  switch (stepNumber) {
    case 1:
      schema = documentTypeSchema;
      break;
    case 2:
      schema = businessInfoSchema;
      break;
    case 4:
      schema = businessDetailsSchema;
      break;
    case 5:
      schema = designPreferencesSchema;
      break;
    case 6:
      schema = generationSettingsSchema;
      break;
    default:
      return { success: true };
  }

  try {
    schema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _form: 'Validation failed' } };
  }
}

/**
 * File upload validation
 */
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' })
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      'File size must be less than 5MB'
    )
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type),
      'File must be a JPEG, PNG, or WebP image'
    ),
});

/**
 * Login validation
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address'),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters'),
});

/**
 * Register validation
 */
export const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  
  email: z.string()
    .email('Please enter a valid email address'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type WizardData = z.infer<typeof wizardDataSchema>;
