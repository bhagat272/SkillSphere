import { Request, Response } from 'express';
import { jobService } from '../service/job.service';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { getPagination } from '../../../shared/utils/pagination';

export class JobController {
  // POST /api/v1/jobs
  createJob = asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.createJob(req.user!.userId, req.body, req.user!.role);
    sendResponse.created(res, { job }, 'Job posted successfully');
  });

  // GET /api/v1/jobs/:id
  getJobDetails = asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getJobDetails(req.params.id);
    sendResponse.success(res, { job });
  });

  // PUT /api/v1/jobs/:id
  updateJob = asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.updateJob(req.params.id, req.user!.userId, req.body);
    sendResponse.success(res, { job }, 'Job updated successfully');
  });

  // DELETE /api/v1/jobs/:id
  deleteJob = asyncHandler(async (req: Request, res: Response) => {
    await jobService.deleteJob(req.params.id, req.user!.userId);
    sendResponse.success(res, null, 'Job deleted successfully');
  });

  // GET /api/v1/jobs
  listJobs = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const { q, location, isRemote, jobType, skills } = req.query as {
      q?: string;
      location?: string;
      isRemote?: string;
      jobType?: string;
      skills?: string;
    };

    const filters = {
      q,
      location,
      isRemote: isRemote !== undefined ? isRemote === 'true' : undefined,
      jobType,
      skills: skills ? skills.split(',') : undefined,
    };

    const { jobs, total } = await jobService.listJobs(filters, page, limit);
    sendResponse.paginated(res, jobs, total, page, limit);
  });

  // POST /api/v1/jobs/:id/apply
  applyToJob = asyncHandler(async (req: Request, res: Response) => {
    const { coverLetter } = req.body;
    const job = await jobService.applyToJob(req.params.id, req.user!.userId, coverLetter);
    sendResponse.success(res, { job }, 'Application submitted successfully');
  });

  // PATCH /api/v1/jobs/:id/applications/:appId/status
  updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status, notes } = req.body;
    if (!status) {
      sendResponse.badRequest(res, 'Status is required');
      return;
    }
    const job = await jobService.updateApplicationStatus(
      req.params.id,
      req.user!.userId,
      req.params.appId,
      status,
      notes
    );
    sendResponse.success(res, { job }, 'Application status updated');
  });

  // GET /api/v1/jobs/recruiter/dashboard
  getRecruiterDashboard = asyncHandler(async (req: Request, res: Response) => {
    const jobs = await jobService.getRecruiterDashboard(req.user!.userId);
    sendResponse.success(res, { jobs });
  });

  // GET /api/v1/jobs/candidate/dashboard
  getCandidateDashboard = asyncHandler(async (req: Request, res: Response) => {
    const jobs = await jobService.getCandidateDashboard(req.user!.userId);
    sendResponse.success(res, { jobs });
  });

  // POST /api/v1/jobs/:id/save
  toggleSaveJob = asyncHandler(async (req: Request, res: Response) => {
    const result = await jobService.toggleSaveJob(req.params.id, req.user!.userId);
    sendResponse.success(res, result, result.saved ? 'Job saved to bookmarks' : 'Job removed from bookmarks');
  });

  // GET /api/v1/jobs/saved
  getSavedJobs = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const { jobs, total } = await jobService.getSavedJobs(req.user!.userId, page, limit);
    sendResponse.paginated(res, jobs, total, page, limit);
  });

  // GET /api/v1/jobs/recommendations
  getJobRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const jobs = await jobService.getRecommendedJobs(req.user!.userId);
    sendResponse.success(res, { jobs });
  });
}

export const jobController = new JobController();
