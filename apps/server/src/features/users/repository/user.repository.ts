import mongoose from 'mongoose';
import { User, IUserDocument } from '../../../models/User';
import { UpdateProfileInput } from '../validators/user.validator';

// ─── User Repository ──────────────────────────────────────────────────────────

export class UserRepository {
  async findById(id: string): Promise<IUserDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return User.findById(id).select('-password -refreshTokens -__v').exec();
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<IUserDocument | null> {
    const updateData: Record<string, unknown> = {};

    if (data.firstName) updateData['profile.firstName'] = data.firstName;
    if (data.lastName) updateData['profile.lastName'] = data.lastName;
    if (data.bio !== undefined) updateData['profile.bio'] = data.bio;
    if (data.headline !== undefined) updateData['profile.headline'] = data.headline;
    if (data.location !== undefined) updateData['profile.location'] = data.location;
    if (data.socialLinks) {
      Object.entries(data.socialLinks).forEach(([key, val]) => {
        updateData[`profile.socialLinks.${key}`] = val;
      });
    }

    return User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true })
      .select('-password -refreshTokens -__v')
      .exec();
  }

  async addSkill(userId: string, skill: { name: string; level: string }): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { skills: skill } }, // $addToSet prevents duplicates
      { new: true }
    )
      .select('-password -refreshTokens')
      .exec();
  }

  async removeSkill(userId: string, skillName: string): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { skills: { name: skillName } } },
      { new: true }
    )
      .select('-password -refreshTokens')
      .exec();
  }

  async updateAvatar(userId: string, avatarUrl: string, publicId: string): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      { $set: { 'profile.avatar': avatarUrl, 'profile.avatarPublicId': publicId } },
      { new: true }
    )
      .select('-password -refreshTokens')
      .exec();
  }

  async updateResume(
    userId: string,
    resumeData: { url: string; publicId: string; originalName: string }
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          resume: { ...resumeData, uploadedAt: new Date() },
        },
      },
      { new: true }
    )
      .select('-password -refreshTokens')
      .exec();
  }

  // Follow/Unfollow uses MongoDB transactions for data consistency
  async follow(followerId: string, targetId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await User.findByIdAndUpdate(
        followerId,
        { $addToSet: { following: new mongoose.Types.ObjectId(targetId) } },
        { session }
      );
      await User.findByIdAndUpdate(
        targetId,
        { $addToSet: { followers: new mongoose.Types.ObjectId(followerId) } },
        { session }
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async unfollow(followerId: string, targetId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await User.findByIdAndUpdate(
        followerId,
        { $pull: { following: new mongoose.Types.ObjectId(targetId) } },
        { session }
      );
      await User.findByIdAndUpdate(
        targetId,
        { $pull: { followers: new mongoose.Types.ObjectId(followerId) } },
        { session }
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Text search using MongoDB $text index
  async searchUsers(
    query: string,
    filters: { role?: string },
    skip: number,
    limit: number
  ): Promise<{ users: IUserDocument[]; total: number }> {
    const searchFilter: Record<string, unknown> = {
      $text: { $search: query },
      isActive: true,
    };
    if (filters.role) searchFilter.role = filters.role;

    const [users, total] = await Promise.all([
      User.find(searchFilter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .select('-password -refreshTokens -__v')
        .exec(),
      User.countDocuments(searchFilter),
    ]);

    return { users, total };
  }

  // Recommendations: users followed by your connections (2nd degree)
  async getRecommendations(userId: string, limit = 10): Promise<IUserDocument[]> {
    const user = await User.findById(userId).select('following').exec();
    if (!user) return [];

    // Aggregate: find users followed by people I follow, exclude myself + already following
    return User.aggregate([
      { $match: { _id: { $in: user.following } } },
      { $project: { following: 1 } },
      { $unwind: '$following' },
      {
        $match: {
          following: {
            $nin: [
              new mongoose.Types.ObjectId(userId),
              ...user.following,
            ],
          },
        },
      },
      { $group: { _id: '$following', mutualCount: { $sum: 1 } } },
      { $sort: { mutualCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $replaceRoot: { newRoot: '$user' } },
      { $project: { password: 0, refreshTokens: 0 } },
    ]);
  }
}

export const userRepository = new UserRepository();
