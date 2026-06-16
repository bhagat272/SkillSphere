import { userRepository } from '../repository/user.repository';
import { AppError } from '../../../shared/utils/asyncHandler';
import { cloudinary, cloudinaryFolders } from '../../../config/cloudinary';
import { UpdateProfileInput, AddSkillInput, AddPortfolioInput } from '../validators/user.validator';
import { IUserDocument } from '../../../models/User';
import { notificationQueue } from '../../../queues/notification.queue';

export class UserService {
  async getUserById(userId: string): Promise<IUserDocument> {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<IUserDocument> {
    const user = await userRepository.updateProfile(userId, data);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async uploadAvatar(userId: string, fileBuffer: Buffer, mimetype: string): Promise<IUserDocument> {
    // Delete old avatar from Cloudinary first
    const existingUser = await userRepository.findById(userId);
    if (existingUser?.profile.avatarPublicId) {
      await cloudinary.uploader.destroy(existingUser.profile.avatarPublicId);
    }

    // Upload new avatar
    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: cloudinaryFolders.avatars,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        uploadStream.end(fileBuffer);
      }
    );

    const user = await userRepository.updateAvatar(userId, result.secure_url, result.public_id);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async uploadResume(
    userId: string,
    fileBuffer: Buffer,
    originalName: string
  ): Promise<IUserDocument> {
    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: cloudinaryFolders.resumes,
            resource_type: 'raw',
            format: 'pdf',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        uploadStream.end(fileBuffer);
      }
    );

    const user = await userRepository.updateResume(userId, {
      url: result.secure_url,
      publicId: result.public_id,
      originalName,
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async addSkill(userId: string, skill: AddSkillInput): Promise<IUserDocument> {
    const user = await userRepository.addSkill(userId, skill);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async removeSkill(userId: string, skillName: string): Promise<IUserDocument> {
    const user = await userRepository.removeSkill(userId, skillName);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async followUser(followerId: string, targetId: string): Promise<void> {
    if (followerId === targetId) {
      throw new AppError('You cannot follow yourself', 400);
    }
    const target = await userRepository.findById(targetId);
    if (!target) throw new AppError('User not found', 404);

    await userRepository.follow(followerId, targetId);

    // Queue follow notification (non-blocking)
    await notificationQueue.add('send-notification', {
      recipientId: targetId,
      senderId: followerId,
      type: 'follow',
      title: 'New Follower',
      message: 'started following you',
    });
  }

  async unfollowUser(followerId: string, targetId: string): Promise<void> {
    if (followerId === targetId) throw new AppError('You cannot unfollow yourself', 400);
    await userRepository.unfollow(followerId, targetId);
  }

  async searchUsers(
    query: string,
    filters: { role?: string },
    page: number,
    limit: number
  ) {
    const skip = (page - 1) * limit;
    return userRepository.searchUsers(query, filters, skip, limit);
  }

  async getRecommendations(userId: string): Promise<IUserDocument[]> {
    return userRepository.getRecommendations(userId);
  }
}

export const userService = new UserService();
