import mongoose, { Document, Schema } from 'mongoose';

export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';

export interface IApplication {
  user: mongoose.Types.ObjectId;
  resumeUrl: string;
  coverLetter?: string;
  status: ApplicationStatus;
  appliedAt: Date;
  notes?: string; // Recruiter notes
}

export interface IJob {
  postedBy: mongoose.Types.ObjectId;
  title: string;
  description: string;
  company: string;
  companyLogo?: string;
  location: string;
  isRemote: boolean;
  jobType: JobType;
  salary: { min?: number; max?: number; currency: string };
  skills: string[];
  status: 'active' | 'closed' | 'draft';
  applications: IApplication[];
  views: number;
  savedBy: mongoose.Types.ObjectId[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobDocument extends IJob, Document {}

const applicationSchema = new Schema<IApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resumeUrl: { type: String, required: true },
    coverLetter: String,
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
      default: 'pending',
    },
    appliedAt: { type: Date, default: Date.now },
    notes: String,
  },
  { _id: true }
);

const jobSchema = new Schema<IJobDocument>(
  {
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    company: { type: String, required: true, trim: true },
    companyLogo: String,
    location: { type: String, required: true },
    isRemote: { type: Boolean, default: false },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
      required: true,
    },
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'USD' },
    },
    skills: [{ type: String, lowercase: true, trim: true }],
    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'active',
    },
    applications: [applicationSchema],
    views: { type: Number, default: 0 },
    savedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ 'applications.user': 1 }); // Find jobs user applied to

jobSchema.virtual('applicationsCount').get(function () {
  return this.applications.length;
});

export const Job = mongoose.model<IJobDocument>('Job', jobSchema);
