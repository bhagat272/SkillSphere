import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type UserRole = 'user' | 'recruiter' | 'admin';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';

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
  uploadedAt: Date;
}

export interface IRefreshToken {
  tokenId: string;
  token: string;
  device: string;
  ip: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
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
  email: string;
  password?: string;
  googleId?: string;
  role: UserRole;
  profile: IProfile;
  skills: ISkill[];
  portfolio: IPortfolioItem[];
  resume?: IResume;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  isEmailVerified: boolean;
  isActive: boolean;
  isPremium: boolean;
  subscriptionTier: 'free' | 'premium' | 'pro';
  profileCompletion: number;
  refreshTokens: IRefreshToken[];
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): Partial<IUser>;
  calculateProfileCompletion(): number;
}

export interface IUserDocument extends IUser, Document {}

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const skillSchema = new Schema<ISkill>(
  {
    name: { type: String, required: true, trim: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'beginner',
    },
    endorsed: { type: Number, default: 0 },
  },
  { _id: false }
);

const portfolioSchema = new Schema<IPortfolioItem>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    url: { type: String },
    image: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

const resumeSchema = new Schema<IResume>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    originalName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenId: { type: String, required: true },
    token: { type: String, required: true },
    device: { type: String, default: 'unknown' },
    ip: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const socialLinksSchema = new Schema<ISocialLinks>(
  {
    github: String,
    linkedin: String,
    twitter: String,
    website: String,
  },
  { _id: false }
);

const profileSchema = new Schema<IProfile>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatar: String,
    avatarPublicId: String,
    bio: { type: String, maxlength: 500 },
    headline: { type: String, maxlength: 120 },
    location: String,
    socialLinks: { type: socialLinksSchema, default: {} },
  },
  { _id: false }
);

// ─── Main User Schema ─────────────────────────────────────────────────────────
// Schema Design Decisions:
//   - refreshTokens embedded (max 5) — avoids collection join for auth hot path
//   - followers/following as ObjectId arrays — suitable for <10K connections per user
//   - skills array with endorsed count — supports skill endorsement without extra collection
//   - profileCompletion computed field — updated on profile change via middleware

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // Compound index: email + isActive for auth queries
      index: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false, // Never returned in queries by default
    },
    googleId: {
      type: String,
      sparse: true, // Sparse index: only indexed when present
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'recruiter', 'admin'],
      default: 'user',
    },
    profile: {
      type: profileSchema,
      required: true,
    },
    skills: {
      type: [skillSchema],
      default: [],
      validate: {
        validator: (skills: ISkill[]) => skills.length <= 50,
        message: 'Cannot have more than 50 skills',
      },
    },
    portfolio: {
      type: [portfolioSchema],
      default: [],
    },
    resume: resumeSchema,
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isPremium: { type: Boolean, default: false },
    subscriptionTier: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free',
    },
    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      // Max 5 active sessions per user
      validate: {
        validator: (tokens: IRefreshToken[]) => tokens.length <= 5,
        message: 'Max 5 active sessions allowed',
      },
    },
    lastSeen: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    // Virtual fields are included in JSON output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Interview insight: Indexes are the #1 performance optimization for MongoDB.
// Compound index on role + isActive for admin queries; text index for search.
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'profile.firstName': 'text', 'profile.lastName': 'text', email: 'text' });
userSchema.index({ createdAt: -1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

userSchema.virtual('followersCount').get(function () {
  return this.followers.length;
});

userSchema.virtual('followingCount').get(function () {
  return this.following.length;
});

// ─── Pre-Save Middleware ──────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Hash password only if modified
  if (this.isModified('password') && this.password) {
    const saltRounds = 12; // bcrypt cost factor — higher = slower brute force
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  // Recalculate profile completion
  if (this.isModified('profile') || this.isModified('skills') || this.isModified('resume')) {
    this.profileCompletion = this.calculateProfileCompletion();
  }

  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.calculateProfileCompletion = function (): number {
  let score = 0;
  const { profile, skills, resume } = this;

  if (profile.firstName && profile.lastName) score += 20;
  if (profile.bio) score += 15;
  if (profile.headline) score += 10;
  if (profile.avatar) score += 10;
  if (profile.location) score += 5;
  if (skills.length >= 3) score += 15;
  if (resume?.url) score += 15;
  if (profile.socialLinks?.github || profile.socialLinks?.linkedin) score += 10;

  return score;
};

userSchema.methods.getPublicProfile = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model<IUserDocument>('User', userSchema);
