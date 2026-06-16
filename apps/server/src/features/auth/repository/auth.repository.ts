import mongoose from 'mongoose';
import { User, IUserDocument } from '../../../models/User';
import { RegisterInput } from '../validators/auth.validator';

// ─── Auth Repository ──────────────────────────────────────────────────────────
// Repository Pattern: Abstracts all DB operations from the service layer.
// Benefits:
//   1. Easy to swap DB (MongoDB → PostgreSQL) without changing service logic
//   2. Unit-testable services (mock the repo)
//   3. Single place for DB query optimization
// Interview: "Repository Pattern vs Active Record?"
// Active Record: model contains DB logic (Mongoose default) — simpler for small apps
// Repository: separates concerns — better for large, testable codebases

export class AuthRepository {
  async createUser(data: RegisterInput): Promise<IUserDocument> {
    const user = new User({
      email: data.email,
      password: data.password,
      role: data.role,
      profile: {
        firstName: data.firstName,
        lastName: data.lastName,
        socialLinks: {},
      },
    });
    return user.save();
  }

  async findByEmail(email: string, includePassword = false): Promise<IUserDocument | null> {
    const query = User.findOne({ email, isActive: true });
    if (includePassword) query.select('+password');
    return query.exec();
  }

  async findById(id: string, includePassword = false): Promise<IUserDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const query = User.findById(id);
    if (includePassword) query.select('+password');
    return query.exec();
  }

  async findByGoogleId(googleId: string): Promise<IUserDocument | null> {
    return User.findOne({ googleId, isActive: true }).exec();
  }

  async updateRefreshTokens(
    userId: string,
    tokens: IUserDocument['refreshTokens']
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokens: tokens });
  }

  async verifyEmail(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { isEmailVerified: true });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
  }

  async updateLastSeen(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { googleId });
  }
}

export const authRepository = new AuthRepository();
