import { jobRepository } from '../repository/job.repository';
import { User } from '../../../models/User';
import { Job, IJobDocument } from '../../../models/Job';
import { AppError } from '../../../shared/utils/asyncHandler';
import { notificationQueue } from '../../../queues/notification.queue';
import { CreateJobInput } from '../validators/job.validator';
import mongoose from 'mongoose';

export class JobService {
  async createJob(recruiterId: string, data: CreateJobInput, role: string): Promise<IJobDocument> {
    if (role !== 'recruiter' && role !== 'admin') {
      throw new AppError('Only recruiters are allowed to post jobs', 403);
    }
    return jobRepository.create(recruiterId, data);
  }

  async getJobDetails(jobId: string): Promise<IJobDocument> {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new AppError('Job not found', 404);
    
    // Increment views (non-blocking)
    Job.findByIdAndUpdate(jobId, { $inc: { views: 1 } }).exec();
    
    return job;
  }

  async updateJob(
    jobId: string,
    recruiterId: string,
    data: Partial<CreateJobInput>
  ): Promise<IJobDocument> {
    const job = await jobRepository.update(jobId, recruiterId, data);
    if (!job) throw new AppError('Job not found or unauthorized', 404);
    return job;
  }

  async deleteJob(jobId: string, recruiterId: string): Promise<void> {
    const deleted = await jobRepository.delete(jobId, recruiterId);
    if (!deleted) throw new AppError('Job not found or unauthorized', 404);
  }

  async listJobs(
    filters: {
      q?: string;
      location?: string;
      isRemote?: boolean;
      jobType?: string;
      skills?: string[];
    },
    page: number,
    limit: number
  ) {
    const skip = (page - 1) * limit;
    return jobRepository.listJobs(filters, skip, limit);
  }

  async applyToJob(
    jobId: string,
    userId: string,
    coverLetter?: string
  ): Promise<IJobDocument> {
    const [job, user] = await Promise.all([
      Job.findById(jobId),
      User.findById(userId),
    ]);

    if (!job) throw new AppError('Job not found', 404);
    if (!user) throw new AppError('User not found', 404);

    // Verify candidate has uploaded a resume
    if (!user.resume?.url) {
      throw new AppError('Please upload a resume in your profile settings before applying', 400);
    }

    // Verify user hasn't already applied
    const alreadyApplied = job.applications.some((app) => app.user.toString() === userId);
    if (alreadyApplied) {
      throw new AppError('You have already applied to this job position', 400);
    }

    const updatedJob = await jobRepository.apply(jobId, userId, user.resume.url, coverLetter);
    if (!updatedJob) throw new AppError('Failed to apply for the job', 500);

    // Queue recruiter notification (non-blocking)
    await notificationQueue.add('send-notification', {
      recipientId: job.postedBy.toString(),
      senderId: userId,
      type: 'job_application',
      title: 'New Application',
      message: `submitted an application for ${job.title}`,
      data: { jobId, recruiterId: job.postedBy.toString() },
    });

    return updatedJob;
  }

  async updateApplicationStatus(
    jobId: string,
    recruiterId: string,
    applicationId: string,
    status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired',
    notes?: string
  ): Promise<IJobDocument> {
    const job = await Job.findOne({ _id: jobId, postedBy: recruiterId });
    if (!job) {
      throw new AppError('Job not found or unauthorized access', 403);
    }

    const application = job.applications.find((app) => {
      const applicationSubdoc = app as typeof app & { _id?: mongoose.Types.ObjectId };
      return applicationSubdoc._id?.toString() === applicationId;
    });
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const updatedJob = await jobRepository.updateApplicationStatus(
      jobId,
      applicationId,
      status,
      notes
    );
    if (!updatedJob) throw new AppError('Failed to update application status', 500);

    // Queue candidate notification (non-blocking)
    await notificationQueue.add('send-notification', {
      recipientId: application.user.toString(),
      senderId: recruiterId,
      type: 'application_update',
      title: 'Application Update',
      message: `updated your application status for ${job.title} to: ${status}`,
      data: { jobId, applicationId },
    });

    return updatedJob;
  }

  async getRecruiterDashboard(recruiterId: string): Promise<IJobDocument[]> {
    return jobRepository.getRecruiterJobs(recruiterId);
  }

  async getCandidateDashboard(userId: string): Promise<IJobDocument[]> {
    return jobRepository.getCandidateApplications(userId);
  }

  async toggleSaveJob(jobId: string, userId: string) {
    const job = await Job.findById(jobId);
    if (!job) throw new AppError('Job not found', 404);
    return jobRepository.toggleSave(jobId, userId);
  }

  async getSavedJobs(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return jobRepository.getSavedJobs(userId, skip, limit);
  }

  // AI Recommendation Engine using MongoDB Aggregation Pipeline:
  // Evaluates candidate's skill sets matching active job requirements.
  async getRecommendedJobs(userId: string, limit = 10): Promise<IJobDocument[]> {
    const user = await User.findById(userId).select('skills').exec();
    if (!user || user.skills.length === 0) {
      // Return standard active jobs if user has no skills listed
      return Job.find({ status: 'active' }).sort({ createdAt: -1 }).limit(limit).exec();
    }

    const skillNames = user.skills.map((s) => s.name.toLowerCase().trim());

    // Aggregate query scoring matches:
    // Adds a score weight for every matching skill user has.
    return Job.aggregate([
      { $match: { status: 'active', 'applications.user': { $ne: new mongoose.Types.ObjectId(userId) } } },
      {
        $addFields: {
          matchingSkills: { $setIntersection: ['$skills', skillNames] },
        },
      },
      {
        $addFields: {
          matchCount: { $size: '$matchingSkills' },
        },
      },
      { $match: { matchCount: { $gt: 0 } } },
      { $sort: { matchCount: -1, createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'postedBy',
          pipeline: [
            { $project: { 'profile.firstName': 1, 'profile.lastName': 1, 'profile.avatar': 1, company: 1 } },
          ],
        },
      },
      { $unwind: '$postedBy' },
    ]);
  }
}

export const jobService = new JobService();
