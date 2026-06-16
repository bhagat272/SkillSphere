import { Request, Response } from 'express';
import { aiService } from '../service/ai.service';
import { User } from '../../../models/User';
import { Job } from '../../../models/Job';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler, AppError } from '../../../shared/utils/asyncHandler';

export class AIController {
  // POST /api/v1/ai/analyze-resume
  // Expects file upload via multer
  analyzeResume = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      sendResponse.badRequest(res, 'No resume file uploaded');
      return;
    }

    const result = await aiService.analyzeResume(req.file.originalname, req.file.buffer);
    sendResponse.success(res, result, 'Resume analyzed successfully');
  });

  // POST /api/v1/ai/profile-summary
  generateProfileSummary = asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      sendResponse.notFound(res, 'User profile not found');
      return;
    }

    const skillNames = user.skills.map((s) => s.name);
    const summary = await aiService.generateProfileSummary(
      user.profile.firstName,
      user.profile.headline || '',
      skillNames
    );

    sendResponse.success(res, { summary }, 'Profile summary generated');
  });

  // GET /api/v1/ai/recommend-skills
  recommendSkills = asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!.userId).select('skills');
    if (!user) {
      sendResponse.notFound(res, 'User not found');
      return;
    }

    const currentSkillNames = user.skills.map((s) => s.name);
    const recommendations = await aiService.recommendSkills(currentSkillNames);
    sendResponse.success(res, { recommendations });
  });

  // POST /api/v1/ai/match-job/:jobId
  matchJob = asyncHandler(async (req: Request, res: Response) => {
    const [user, job] = await Promise.all([
      User.findById(req.user!.userId).select('skills'),
      Job.findById(req.params.jobId).select('title description'),
    ]);

    if (!user) throw new AppError('User profile not found', 404);
    if (!job) throw new AppError('Job position not found', 404);

    const skillNames = user.skills.map((s) => s.name);
    const match = await aiService.matchJob(skillNames, job.title, job.description);
    sendResponse.success(res, match, 'Job compatibility analysis complete');
  });

  // POST /api/v1/ai/generate-post
  generatePost = asyncHandler(async (req: Request, res: Response) => {
    const { prompt, tone = 'professional' } = req.body;
    if (!prompt) {
      sendResponse.badRequest(res, 'Prompt text is required');
      return;
    }

    const postContent = await aiService.generatePost(prompt, tone);
    sendResponse.success(res, { postContent }, 'Social post generated successfully');
  });
}

export const aiController = new AIController();
