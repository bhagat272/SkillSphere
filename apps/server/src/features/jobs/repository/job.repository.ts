import mongoose from 'mongoose';
import { Job, IJobDocument, IApplication } from '../../../models/Job';
import { CreateJobInput } from '../validators/job.validator';

export class JobRepository {
  async create(recruiterId: string, data: CreateJobInput): Promise<IJobDocument> {
    const job = new Job({
      postedBy: new mongoose.Types.ObjectId(recruiterId),
      title: data.title,
      description: data.description,
      company: data.company,
      location: data.location,
      isRemote: data.isRemote,
      jobType: data.jobType,
      salary: data.salary,
      skills: data.skills.map((s) => s.toLowerCase().trim()),
    });
    return job.save();
  }

  async findById(jobId: string): Promise<IJobDocument | null> {
    return Job.findById(jobId)
      .populate('postedBy', 'profile.firstName profile.lastName profile.avatar profile.headline role')
      .exec();
  }

  async update(
    jobId: string,
    recruiterId: string,
    data: Partial<CreateJobInput>
  ): Promise<IJobDocument | null> {
    const updateFields: Record<string, any> = {};

    if (data.title) updateFields.title = data.title;
    if (data.description) updateFields.description = data.description;
    if (data.company) updateFields.company = data.company;
    if (data.location) updateFields.location = data.location;
    if (data.isRemote !== undefined) updateFields.isRemote = data.isRemote;
    if (data.jobType) updateFields.jobType = data.jobType;
    if (data.salary) updateFields.salary = data.salary;
    if (data.skills) updateFields.skills = data.skills.map((s) => s.toLowerCase().trim());

    return Job.findOneAndUpdate(
      { _id: jobId, postedBy: recruiterId },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).exec();
  }

  async delete(jobId: string, recruiterId: string): Promise<boolean> {
    const result = await Job.deleteOne({ _id: jobId, postedBy: recruiterId });
    return result.deletedCount > 0;
  }

  async listJobs(
    searchParams: {
      q?: string;
      location?: string;
      isRemote?: boolean;
      jobType?: string;
      skills?: string[];
    },
    skip: number,
    limit: number
  ): Promise<{ jobs: IJobDocument[]; total: number }> {
    const filter: Record<string, any> = { status: 'active' };

    // Search query using full-text search index if provided
    if (searchParams.q) {
      filter.$text = { $search: searchParams.q };
    }

    if (searchParams.location) {
      filter.location = { $regex: searchParams.location, $options: 'i' };
    }

    if (searchParams.isRemote !== undefined) {
      filter.isRemote = searchParams.isRemote;
    }

    if (searchParams.jobType) {
      filter.jobType = searchParams.jobType;
    }

    if (searchParams.skills && searchParams.skills.length > 0) {
      filter.skills = { $in: searchParams.skills.map((s) => s.toLowerCase().trim()) };
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort(searchParams.q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('postedBy', 'profile.firstName profile.lastName profile.avatar profile.headline company')
        .exec(),
      Job.countDocuments(filter),
    ]);

    return { jobs, total };
  }

  async apply(
    jobId: string,
    userId: string,
    resumeUrl: string,
    coverLetter?: string
  ): Promise<IJobDocument | null> {
    const application: Partial<IApplication> = {
      user: new mongoose.Types.ObjectId(userId),
      resumeUrl,
      coverLetter,
      status: 'pending',
      appliedAt: new Date(),
    };

    return Job.findByIdAndUpdate(
      jobId,
      { $push: { applications: application } },
      { new: true }
    ).exec();
  }

  async updateApplicationStatus(
    jobId: string,
    applicationId: string,
    status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired',
    notes?: string
  ): Promise<IJobDocument | null> {
    const updateFields: Record<string, any> = {
      'applications.$.status': status,
    };
    if (notes) {
      updateFields['applications.$.notes'] = notes;
    }

    return Job.findOneAndUpdate(
      { _id: jobId, 'applications._id': applicationId },
      { $set: updateFields },
      { new: true }
    ).exec();
  }

  async getRecruiterJobs(recruiterId: string): Promise<IJobDocument[]> {
    return Job.find({ postedBy: new mongoose.Types.ObjectId(recruiterId) })
      .sort({ createdAt: -1 })
      .populate('applications.user', 'profile.firstName profile.lastName profile.avatar email skills resume')
      .exec();
  }

  async getCandidateApplications(userId: string): Promise<IJobDocument[]> {
    return Job.find({ 'applications.user': new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate('postedBy', 'profile.firstName profile.lastName profile.avatar company')
      .exec();
  }

  async toggleSave(jobId: string, userId: string): Promise<{ saved: boolean }> {
    const job = await Job.findById(jobId).select('savedBy').exec();
    if (!job) throw new Error('Job not found');

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const alreadySaved = job.savedBy.some((id) => id.equals(userObjectId));

    const update = alreadySaved
      ? { $pull: { savedBy: userObjectId } }
      : { $addToSet: { savedBy: userObjectId } };

    await Job.findByIdAndUpdate(jobId, update);
    return { saved: !alreadySaved };
  }

  async getSavedJobs(userId: string, skip: number, limit: number): Promise<{ jobs: IJobDocument[]; total: number }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [jobs, total] = await Promise.all([
      Job.find({ savedBy: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('postedBy', 'profile.firstName profile.lastName profile.avatar company')
        .exec(),
      Job.countDocuments({ savedBy: userObjectId }),
    ]);

    return { jobs, total };
  }
}

export const jobRepository = new JobRepository();
