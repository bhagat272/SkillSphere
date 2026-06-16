import OpenAI from 'openai';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { AppError } from '../../../shared/utils/asyncHandler';

// Lazy initialize OpenAI client
let openai: OpenAI | null = null;
const isOpenAIConfigured =
  env.OPENAI_API_KEY &&
  env.OPENAI_API_KEY !== 'sk-your_openai_api_key' &&
  env.OPENAI_API_KEY.trim() !== '';

if (isOpenAIConfigured) {
  openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  logger.info('OpenAI SDK initialized successfully.');
} else {
  logger.warn('OPENAI_API_KEY is missing or placeholder. Running in AI Simulation Mode.');
}

export class AIService {
  // ─── Resume Analyzer ─────────────────────────────────────────────
  // Scan candidate resume to generate structural improvement notes.
  async analyzeResume(
    fileName: string,
    fileBuffer: Buffer
  ): Promise<{
    score: number;
    skills: string[];
    missingKeywords: string[];
    improvements: string[];
    atsCompatible: boolean;
  }> {
    if (!isOpenAIConfigured || !openai) {
      // ─── Simulation Fallback ──────────────────────────────────────
      logger.info(`Analyzing resume (simulated): ${fileName}`);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate latency
      
      const fileLower = fileName.toLowerCase();
      const isMobile = fileLower.includes('mobile') || fileLower.includes('native') || fileLower.includes('ios');
      
      return {
        score: isMobile ? 88 : 82,
        skills: isMobile 
          ? ['React Native', 'React.js', 'Redux', 'JavaScript', 'TypeScript', 'iOS', 'Android']
          : ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'REST APIs', 'Redux', 'JavaScript'],
        missingKeywords: isMobile
          ? ['Fastlane', 'Objective-C', 'SwiftUI', 'App Store Deployment', 'CI/CD']
          : ['Docker', 'Redis', 'BullMQ', 'Jest', 'Stripe', 'Websockets'],
        improvements: [
          'Quantify your accomplishments (e.g. "Increased rendering speed by 25%") rather than listing tasks.',
          'Add a dedicated section for Cloud Platforms and DevOps tooling (e.g. AWS, Docker).',
          'Make sure your contact links (GitHub, LinkedIn) are active hyper-links.',
          'Optimize resume formatting to make it more friendly to ATS scanner parsers.'
        ],
        atsCompatible: true,
      };
    }

    try {
      // We read basic text strings out of binary buffer as fallback (since pdf-parse is not loaded)
      const bufferText = fileBuffer.toString('ascii').replace(/[^\x20-\x7E]/g, ' ');
      const cleanSnippet = bufferText.slice(0, 4000); // Send context limit snippet

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical recruiter and ATS parser. Analyze the resume text provided and return a JSON evaluation score, parsed skills, missing technical keywords, suggested formatting/content improvements, and a boolean value for ATS compatibility. Follow JSON schema: { "score": number, "skills": string[], "missingKeywords": string[], "improvements": string[], "atsCompatible": boolean }'
          },
          {
            role: 'user',
            content: `Resume Filename: ${fileName}\n\nResume text snippet:\n${cleanSnippet}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const rawContent = response.choices[0].message.content;
      if (!rawContent) throw new Error('Empty response from OpenAI');

      return JSON.parse(rawContent);
    } catch (error: any) {
      logger.error('OpenAI Resume Analyzer failed:', error);
      throw new AppError('AI Resume analysis failed', 500);
    }
  }

  // ─── Profile Summary Generator ──────────────────────────────────
  async generateProfileSummary(
    firstName: string,
    headline: string,
    skills: string[]
  ): Promise<string> {
    const promptContext = `User Name: ${firstName}\nHeadline: ${headline}\nSkills: ${skills.join(', ')}`;

    if (!isOpenAIConfigured || !openai) {
      logger.info('Generating profile summary (simulated)');
      return `Passionate ${headline || 'Software Engineer'} with strong expertise in ${skills.slice(0, 4).join(', ') || 'full-stack technologies'}. Experienced in building scalable web architectures, crafting responsive user interfaces, and implementing secure API integrations. Proven track record of collaborating in agile environments and delivering high-quality, maintainable codebases to drive business product growth.`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional resume writer. Write a concise, 3-sentence professional bio summary for a networking profile based on the details provided. Do not use markdown, keep it in plain text.'
          },
          {
            role: 'user',
            content: promptContext
          }
        ]
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error: any) {
      logger.error('OpenAI Profile Summary Generator failed:', error);
      throw new AppError('AI Summary generation failed', 500);
    }
  }

  // ─── Skill Recommendations ──────────────────────────────────────
  async recommendSkills(currentSkills: string[]): Promise<string[]> {
    if (!isOpenAIConfigured || !openai) {
      logger.info('Generating skill recommendations (simulated)');
      const standardFullStack = ['Docker', 'Redis', 'Kubernetes', 'AWS', 'Next.js', 'GraphQL', 'TailwindCSS', 'Jest'];
      return standardFullStack.filter((s) => !currentSkills.map((c) => c.toLowerCase()).includes(s.toLowerCase())).slice(0, 4);
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a career development coach. Based on the list of skills provided, suggest exactly 4 matching technical skills or tools that are highly valued in the industry and complement the list. Return JSON array format: { "recommendations": string[] }'
          },
          {
            role: 'user',
            content: `Current Skills: ${currentSkills.join(', ')}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return parsed.recommendations || [];
    } catch (error: any) {
      logger.error('OpenAI Skill Recommendations failed:', error);
      return ['Docker', 'Redis', 'AWS', 'Next.js'];
    }
  }

  // ─── AI Job Matching Compatibility ──────────────────────────────
  async matchJob(
    userSkills: string[],
    jobTitle: string,
    jobDescription: string
  ): Promise<{
    compatibilityScore: number;
    matchingSkills: string[];
    missingSkills: string[];
    verdict: string;
  }> {
    if (!isOpenAIConfigured || !openai) {
      logger.info('Matching job compatibility (simulated)');
      const lowercaseUserSkills = userSkills.map((s) => s.toLowerCase());
      const descLower = jobDescription.toLowerCase() + ' ' + jobTitle.toLowerCase();
      
      const potentialSkills = ['react', 'node', 'express', 'mongodb', 'typescript', 'docker', 'redis', 'stripe', 'aws', 'redux', 'socket.io', 'jest'];
      
      const matchingSkills: string[] = [];
      const missingSkills: string[] = [];
      
      potentialSkills.forEach((skill) => {
        if (descLower.includes(skill)) {
          if (lowercaseUserSkills.includes(skill)) {
            matchingSkills.push(skill.toUpperCase());
          } else {
            missingSkills.push(skill.toUpperCase());
          }
        }
      });

      const totalMatching = matchingSkills.length;
      const totalDemanded = matchingSkills.length + missingSkills.length;
      const score = totalDemanded > 0 ? Math.round((totalMatching / totalDemanded) * 100) : 75;

      let verdict = 'Good candidate match, recommended to apply!';
      if (score < 40) verdict = 'Skills mismatch. Consider learning missing tools before applying.';
      else if (score > 85) verdict = 'Excellent candidate fit! You meet almost all technical qualifications.';

      return {
        compatibilityScore: score,
        matchingSkills,
        missingSkills,
        verdict,
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an HR technical filter. Compare the candidate\'s skills with the job description and title. Return a JSON structure containing: a compatibility score (0-100), array of matching skills, array of missing required skills, and a brief career advice verdict. JSON format: { "compatibilityScore": number, "matchingSkills": string[], "missingSkills": string[], "verdict": string }'
          },
          {
            role: 'user',
            content: `Candidate Skills: ${userSkills.join(', ')}\nJob Title: ${jobTitle}\nJob Description:\n${jobDescription}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error: any) {
      logger.error('OpenAI Job Match failed:', error);
      throw new AppError('AI Job match calculation failed', 500);
    }
  }

  // ─── Social Post Generator ──────────────────────────────────────
  async generatePost(prompt: string, tone: 'professional' | 'casual' | 'celebratory'): Promise<string> {
    if (!isOpenAIConfigured || !openai) {
      logger.info('Generating post prompt (simulated)');
      const hashtag = tone === 'professional' ? '#CareerGrowth' : tone === 'casual' ? '#Networking' : '#Achievement';
      return `🚀 Thrilled to share some thoughts on: "${prompt}"\n\nI've been working on expanding my full-stack expertise and focusing on clean architecture practices. Implementing structural models like repositories and services makes scaling applications so much smoother!\n\nWhat are your thoughts on this? Let's connect and collaborate! ${hashtag} #FullStack #DeveloperJourney`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional social media manager. Generate a high-engagement LinkedIn-style post based on the user's prompt. Tone: ${tone}. Use emojis, include relevant hashtags, and write it in plain text without markdown format.`
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error: any) {
      logger.error('OpenAI Post Generator failed:', error);
      throw new AppError('AI Post generation failed', 500);
    }
  }
}

export const aiService = new AIService();
