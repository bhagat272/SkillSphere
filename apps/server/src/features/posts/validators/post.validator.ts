import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string().min(1, 'Post content is required').max(3000),
  tags: z.array(z.string().max(30).toLowerCase()).max(10).default([]),
  visibility: z.enum(['public', 'connections', 'private']).default('public'),
  isAIGenerated: z.boolean().default(false),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(3000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  visibility: z.enum(['public', 'connections', 'private']).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
  parentComment: z.string().optional(), // ObjectId string for replies
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
