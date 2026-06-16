import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  company: z.string().min(2, 'Company name must be at least 2 characters'),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  isRemote: z.boolean().default(false),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']),
  salary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default('USD'),
  }),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
});

export const applyJobSchema = z.object({
  coverLetter: z.string().max(5000).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type ApplyJobInput = z.infer<typeof applyJobSchema>;
