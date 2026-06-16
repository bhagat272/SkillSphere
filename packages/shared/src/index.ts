export type UserRole = 'user' | 'recruiter' | 'admin';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';
export type SubscriptionTier = 'free' | 'premium' | 'pro';
export type PostVisibility = 'public' | 'connections' | 'private';
export type MessageType = 'text' | 'image' | 'file' | 'system';
export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface ISkill {
  name: string;
  level: SkillLevel;
  endorsed: number;
}

export interface IPortfolioItem {
  title: string;
  description: string;
  url?: string;
  image?: string;
  tags: string[];
}

export interface IResume {
  url: string;
  publicId: string;
  originalName: string;
  uploadedAt: Date | string;
}

export interface IRefreshToken {
  tokenId: string;
  token: string;
  device: string;
  ip: string;
  userAgent: string;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export interface ISocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
}

export interface IProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  avatarPublicId?: string;
  bio?: string;
  headline?: string;
  location?: string;
  socialLinks: ISocialLinks;
}

export interface IUser {
  _id: string;
  email: string;
  role: UserRole;
  profile: IProfile;
  skills: ISkill[];
  portfolio: IPortfolioItem[];
  resume?: IResume;
  followers: string[];
  following: string[];
  isEmailVerified: boolean;
  isActive: boolean;
  isPremium: boolean;
  subscriptionTier: SubscriptionTier;
  profileCompletion: number;
  lastSeen: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  fullName?: string;
  followersCount?: number;
  followingCount?: number;
}

export interface IPost {
  _id: string;
  author: IUser | string;
  content: string;
  images: string[];
  likes: string[];
  savedBy: string[];
  commentsCount: number;
  sharesCount: number;
  tags: string[];
  visibility: PostVisibility;
  isAIGenerated: boolean;
  isPinned: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  likesCount?: number;
  isLiked?: boolean;
}

export interface IComment {
  _id: string;
  post: string;
  author: IUser;
  content: string;
  parentComment?: string | null;
  likes: string[];
  repliesCount: number;
  isEdited: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  likesCount?: number;
}

export interface IConversation {
  _id: string;
  participants: IUser[];
  lastMessage?: IMessage | string;
  lastMessageAt: Date | string;
  unreadCount: Record<string, number>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IMessage {
  _id: string;
  conversation: string;
  sender: IUser | string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  readBy: { user: string; readAt: Date | string }[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IApplication {
  _id: string;
  user: IUser | string;
  resumeUrl: string;
  coverLetter?: string;
  status: ApplicationStatus;
  appliedAt: Date | string;
  notes?: string;
}

export interface IJob {
  _id: string;
  postedBy: IUser | string;
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
  savedBy: string[];
  expiresAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  applicationsCount?: number;
}

export interface INotification {
  _id: string;
  recipient: string;
  sender?: IUser;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'job_application' | 'application_update' | 'message' | 'mention' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date | string;
}

export interface ISubscription {
  _id: string;
  user: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  cancelAtPeriodEnd: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPayment {
  _id: string;
  user: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded';
  stripePaymentIntentId: string;
  description: string;
  metadata?: Record<string, string>;
  createdAt: Date | string;
}
