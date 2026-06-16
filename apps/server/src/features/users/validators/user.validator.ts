import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).trim().optional(),
  lastName: z.string().min(2).max(50).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  headline: z.string().max(120).trim().optional(),
  location: z.string().max(100).trim().optional(),
  socialLinks: z
    .object({
      github: z.string().url().optional().or(z.literal('')),
      linkedin: z.string().url().optional().or(z.literal('')),
      twitter: z.string().url().optional().or(z.literal('')),
      website: z.string().url().optional().or(z.literal('')),
    })
    .optional(),
});

export const addSkillSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  level: z.enum(['beginner', 'intermediate', 'expert']).default('beginner'),
});

export const addPortfolioSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  url: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

export const userSearchSchema = z.object({
  q: z.string().min(1, 'Search query required'),
  role: z.enum(['user', 'recruiter']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddSkillInput = z.infer<typeof addSkillSchema>;
export type AddPortfolioInput = z.infer<typeof addPortfolioSchema>;
