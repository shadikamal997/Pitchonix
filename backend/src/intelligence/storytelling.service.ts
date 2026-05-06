import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  StoryFramework,
  ToneStyle,
  TransformToStoryDto,
  StoryTransformation,
  StoryElement,
  GenerateMetaphorDto,
  MetaphorSuggestion,
  CreateTensionDto,
  TensionEnhancement,
} from './dto/storytelling.dto';
import { AnalysisType } from './dto/analyze-content.dto';

@Injectable()
export class StorytellingService {
  private readonly logger = new Logger(StorytellingService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Transform dry business content into compelling narrative
   */
  async transformToStory(dto: TransformToStoryDto): Promise<StoryTransformation> {
    this.logger.log(`Transforming content using ${dto.framework} framework`);

    try {
      const prompt = this.buildStoryPrompt(dto);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert storyteller and pitch deck consultant. Your job is to transform dry business content into compelling narratives that engage, persuade, and inspire. Use proven storytelling frameworks and emotional resonance.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8, // Higher creativity for storytelling
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        originalContent: dto.content,
        transformedStory: result.story,
        framework: dto.framework,
        elements: result.elements || [],
        emotionalArc: result.emotionalArc || '',
        hooks: result.hooks || [],
        metaphors: result.metaphors || [],
        tensionPoints: result.tensionPoints || [],
        improvements: result.improvements || [],
      };
    } catch (error) {
      this.logger.error('Story transformation failed', error);
      throw error;
    }
  }

  /**
   * Generate metaphors and analogies to make abstract concepts tangible
   */
  async generateMetaphors(dto: GenerateMetaphorDto): Promise<MetaphorSuggestion[]> {
    this.logger.log(`Generating metaphors for: ${dto.concept}`);

    try {
      const prompt = `Generate 5 creative metaphors/analogies for the following concept: "${dto.concept}"

${dto.industry ? `Industry: ${dto.industry}` : ''}
${dto.targetAudience ? `Target Audience: ${dto.targetAudience}` : ''}

For each metaphor, provide:
1. The metaphor itself
2. Explanation of why it works
3. Example sentence showing usage
4. Effectiveness rating (1-10)

Make metaphors:
- Relatable to the target audience
- Visual and concrete
- Memorable
- Appropriate for professional pitch context

Return as JSON with this structure:
{
  "metaphors": [
    {
      "metaphor": "string",
      "explanation": "string",
      "example": "string",
      "effectiveness": number
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a creative metaphor expert who makes complex ideas accessible through vivid analogies.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9, // Very high creativity
      });

      const result = JSON.parse(completion.choices[0].message.content);
      return result.metaphors || [];
    } catch (error) {
      this.logger.error('Metaphor generation failed', error);
      throw error;
    }
  }

  /**
   * Add tension and conflict to make content more engaging
   */
  async createTension(dto: CreateTensionDto): Promise<TensionEnhancement> {
    this.logger.log('Creating tension in content');

    try {
      const prompt = `Transform this content to create more tension, urgency, and engagement:

"${dto.content}"

${dto.contentType ? `Content Type: ${dto.contentType}` : ''}
${dto.context?.problemIntensity ? `Problem Intensity: ${dto.context.problemIntensity}` : ''}
${dto.context?.targetAudience ? `Target Audience: ${dto.context.targetAudience}` : ''}

Use these tension-building techniques:
1. **Stakes** - What's at risk if this problem isn't solved?
2. **Contrast** - Before/After, Problem/Solution contrasts
3. **Statistics** - Shocking data that demands attention
4. **Questions** - Rhetorical questions that engage
5. **Specificity** - Concrete details that feel real
6. **Time Pressure** - Why now matters
7. **Emotional Words** - Words that trigger feeling

Return JSON:
{
  "enhancedContent": "string",
  "tensionTechniques": ["technique1", "technique2"],
  "emotionalWords": ["word1", "word2"],
  "beforeTension": number (1-10),
  "afterTension": number (1-10),
  "beforeEngagement": number (1-10),
  "afterEngagement": number (1-10)
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a master of creating tension and engagement in business writing. You make content impossible to ignore.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        originalContent: dto.content,
        enhancedContent: result.enhancedContent,
        tensionTechniques: result.tensionTechniques || [],
        emotionalWords: result.emotionalWords || [],
        beforeAfter: {
          tension: result.afterTension || 5,
          engagement: result.afterEngagement || 5,
        },
      };
    } catch (error) {
      this.logger.error('Tension creation failed', error);
      throw error;
    }
  }

  /**
   * Build story transformation prompt based on framework
   */
  private buildStoryPrompt(dto: TransformToStoryDto): string {
    const frameworkGuidance = this.getFrameworkGuidance(dto.framework);
    const toneGuidance = dto.tone ? this.getToneGuidance(dto.tone) : '';

    return `Transform this business content into a compelling story using the ${dto.framework} framework:

"${dto.content}"

${dto.context?.companyName ? `Company: ${dto.context.companyName}` : ''}
${dto.context?.industry ? `Industry: ${dto.context.industry}` : ''}
${dto.context?.targetAudience ? `Target Audience: ${dto.context.targetAudience}` : ''}
${dto.context?.emotionalGoal ? `Emotional Goal: ${dto.context.emotionalGoal}` : ''}
${dto.contentType ? `Content Type: ${dto.contentType}` : ''}

**Framework Guidance:**
${frameworkGuidance}

${toneGuidance ? `**Tone:** ${toneGuidance}` : ''}

**Requirements:**
1. Create a narrative arc with clear emotional progression
2. Use specific, concrete details (not vague generalities)
3. Include sensory language and vivid imagery
4. Create tension and resolution
5. Make it memorable and quotable
6. Keep it appropriate for professional pitch context

Return JSON with this structure:
{
  "story": "string (the transformed narrative)",
  "elements": [
    {
      "element": "Hook|Setup|Conflict|Climax|Resolution",
      "content": "string",
      "purpose": "string"
    }
  ],
  "emotionalArc": "string (description of emotional journey)",
  "hooks": ["string (3-5 alternative opening lines)"],
  "metaphors": ["string (metaphors/analogies used)"],
  "tensionPoints": ["string (where tension is created)"],
  "improvements": [
    {
      "before": "string (dry version)",
      "after": "string (story version)",
      "reason": "string (why it works better)"
    }
  ]
}`;
  }

  /**
   * Get framework-specific guidance
   */
  private getFrameworkGuidance(framework: StoryFramework): string {
    const guidance = {
      [StoryFramework.HERO_JOURNEY]: `**Hero's Journey Structure:**
1. **Ordinary World** - Show the status quo (before problem)
2. **Call to Adventure** - Problem emerges, change is needed
3. **Challenges & Trials** - The struggles and obstacles
4. **Transformation** - Discovery of the solution
5. **Victory & Return** - Success and new world achieved

Make the customer or founder the hero. Show their transformation.`,

      [StoryFramework.PAS]: `**Problem-Agitate-Solution Structure:**
1. **Problem** - Clearly state the pain point
2. **Agitate** - Make it worse - show what happens if not solved
   - Use statistics, consequences, emotional impact
   - Create urgency and tension
3. **Solution** - Present your offering as the relief
   - Show the contrast: before → after
   - Make the transformation clear

This framework creates urgency and desire.`,

      [StoryFramework.BEFORE_AFTER]: `**Before-After-Bridge Structure:**
1. **Before** - Paint the painful current state
   - Be specific about frustrations
   - Use sensory details
2. **After** - Show the ideal future state
   - Make it aspirational and achievable
   - Use contrast effectively
3. **Bridge** - Your solution is the bridge
   - Show how you get from before to after
   - Make it feel inevitable and logical

Focus on the transformation journey.`,

      [StoryFramework.THREE_ACT]: `**Three Act Structure:**
1. **Act 1: Setup (25%)**
   - Introduce the world, characters, situation
   - Establish normal and hint at problem
   - End with inciting incident
2. **Act 2: Conflict (50%)**
   - Escalate challenges and obstacles
   - Show failed attempts and learning
   - Build to climax/crisis point
3. **Act 3: Resolution (25%)**
   - Provide solution/breakthrough
   - Show results and transformation
   - Leave with clear takeaway

Classic narrative arc with rising action.`,

      [StoryFramework.CUSTOMER_STORY]: `**Customer Success Story:**
1. **Meet the Customer** - Relatable character
   - Their role, situation, challenges
   - Make them likeable and credible
2. **The Problem** - Their specific pain
   - What they tried before
   - Why it wasn't working
3. **The Discovery** - Finding your solution
   - How they found you
   - Initial skepticism or hope
4. **The Transformation** - Using your product
   - Specific results (quantify!)
   - Emotional impact
5. **The Outcome** - New reality
   - What's different now
   - Would they recommend it?

Use direct quotes and specific details.`,

      [StoryFramework.FOUNDER_JOURNEY]: `**Founder's Journey:**
1. **The Spark** - Personal moment that inspired the idea
   - What you witnessed or experienced
   - The "aha" moment
2. **The Struggle** - Early challenges
   - What you tried
   - Failures and lessons learned
3. **The Breakthrough** - Key insight or turning point
   - What changed
   - Why it mattered
4. **The Mission** - Why you're doing this
   - Personal stake and passion
   - Vision for impact
5. **The Invitation** - Join us on this journey
   - Call to action
   - Shared purpose

Make it personal, vulnerable, and inspiring.`,
    };

    return guidance[framework] || '';
  }

  /**
   * Get tone-specific guidance
   */
  private getToneGuidance(tone: ToneStyle): string {
    const guidance = {
      [ToneStyle.INSPIRATIONAL]: 'Use uplifting language, focus on possibility and vision. Create hope and excitement.',
      [ToneStyle.PROFESSIONAL]: 'Maintain credibility and sophistication. Use data and logic alongside story.',
      [ToneStyle.CONVERSATIONAL]: 'Write like you speak. Use contractions, simple words, and direct address.',
      [ToneStyle.URGENT]: 'Create time pressure and FOMO. Show what is at stake if they wait.',
      [ToneStyle.CONFIDENT]: 'Be bold and declarative. Show certainty and leadership.',
      [ToneStyle.EMPATHETIC]: 'Show deep understanding of pain. Validate feelings and struggles.',
    };

    return guidance[tone] || '';
  }
}
