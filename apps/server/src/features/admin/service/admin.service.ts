import { User } from '../../../models/User';
import { Post } from '../../../models/Post';
import { Job } from '../../../models/Job';
import { Payment } from '../../../models/Payment';
import { Message } from '../../../models/Chat';
import { AppError } from '../../../shared/utils/asyncHandler';

export class AdminService {
  // platform statistics using MongoDB Aggregations
  // Interview tip: "How do you fetch multiple complex stats in a single query?"
  // → We use MongoDB Facets ($facet) to run independent pipelines concurrently in one database roundtrip.
  async getPlatformStats() {
    const statsFacet = await User.aggregate([
      {
        $facet: {
          userCounts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                premium: { $sum: { $cond: [{ $eq: ['$isPremium', true] }, 1, 0] } },
                recruiters: { $sum: { $cond: [{ $eq: ['$role', 'recruiter'] }, 1, 0] } },
              },
            },
          ],
          userGrowth: [
            {
              $match: {
                createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }, // Last 6 months
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const postCount = await Post.countDocuments();
    const jobCount = await Job.countDocuments();
    const messageCount = await Message.countDocuments();

    // Aggregate payment revenue metrics
    const revenueStats = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const userStats = statsFacet[0]?.userCounts[0] || { total: 0, premium: 0, recruiters: 0 };
    const growth = statsFacet[0]?.userGrowth || [];
    const rev = revenueStats[0] || { totalRevenue: 0, transactionCount: 0 };

    return {
      metrics: {
        totalUsers: userStats.total,
        premiumUsers: userStats.premium,
        recruiters: userStats.recruiters,
        totalPosts: postCount,
        totalJobs: jobCount,
        totalMessages: messageCount,
        totalRevenue: rev.totalRevenue,
        totalTransactions: rev.transactionCount,
      },
      userGrowth: growth.map((g: any) => ({
        month: g._id,
        users: g.count,
      })),
    };
  }

  async listUsers(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password -refreshTokens')
        .exec(),
      User.countDocuments(),
    ]);

    return { users, total };
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    const user = await User.findByIdAndUpdate(userId, { $set: { isActive } });
    if (!user) throw new AppError('User not found', 404);
  }

  async listModerationFeed(page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    // Simulate moderation list containing flagged content.
    // In production, we filter by a post "flagged" flag. We sort by comment counts.
    const [posts, total] = await Promise.all([
      Post.find()
        .sort({ commentsCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'profile.firstName profile.lastName email role')
        .exec(),
      Post.countDocuments(),
    ]);

    // Attach mock reports count dynamically for UI display
    const formattedPosts = posts.map((post) => {
      const doc = post.toObject();
      return {
        ...doc,
        reportsCount: Math.max(0, Math.floor(Math.sin(post.content.length) * 5) + 1), // deterministic mock reports count
      };
    });

    return { posts: formattedPosts, total };
  }
}

export const adminService = new AdminService();
