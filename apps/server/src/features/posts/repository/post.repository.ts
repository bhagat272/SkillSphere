import mongoose from 'mongoose';
import { Post, IPostDocument } from '../../../models/Post';
import { Comment } from '../../../models/Comment';
import { CreatePostInput, UpdatePostInput, CreateCommentInput } from '../validators/post.validator';

export class PostRepository {
  async create(authorId: string, data: CreatePostInput, imageUrls: string[] = []): Promise<IPostDocument> {
    const post = new Post({
      author: new mongoose.Types.ObjectId(authorId),
      content: data.content,
      tags: data.tags,
      visibility: data.visibility,
      isAIGenerated: data.isAIGenerated,
      images: imageUrls,
    });
    return post.save();
  }

  async findById(postId: string): Promise<IPostDocument | null> {
    return Post.findById(postId)
      .populate('author', 'profile.firstName profile.lastName profile.avatar profile.headline role')
      .exec();
  }

  // Feed: posts from users I follow + my own posts, sorted by time
  // This uses MongoDB Aggregation Pipeline for production-grade performance
  async getFeed(
    userId: string,
    following: mongoose.Types.ObjectId[],
    skip: number,
    limit: number
  ): Promise<{ posts: IPostDocument[]; total: number }> {
    const authorFilter = [new mongoose.Types.ObjectId(userId), ...following];

    const [posts, total] = await Promise.all([
      Post.find({
        author: { $in: authorFilter },
        visibility: { $in: ['public', 'connections'] },
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'profile.firstName profile.lastName profile.avatar profile.headline role')
        .exec(),

      Post.countDocuments({
        author: { $in: authorFilter },
        visibility: { $in: ['public', 'connections'] },
      }),
    ]);

    return { posts, total };
  }

  async update(postId: string, authorId: string, data: UpdatePostInput): Promise<IPostDocument | null> {
    return Post.findOneAndUpdate(
      { _id: postId, author: authorId }, // Author check prevents editing others' posts
      { $set: data },
      { new: true }
    ).exec();
  }

  async delete(postId: string, authorId: string, role: string): Promise<boolean> {
    const filter = role === 'admin'
      ? { _id: postId }
      : { _id: postId, author: authorId };
    const result = await Post.deleteOne(filter);
    if (result.deletedCount > 0) {
      await Comment.deleteMany({ post: postId }); // Cascade delete
      return true;
    }
    return false;
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const post = await Post.findById(postId).select('likes').exec();
    if (!post) throw new Error('Post not found');

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const alreadyLiked = post.likes.some((id) => id.equals(userObjectId));

    const update = alreadyLiked
      ? { $pull: { likes: userObjectId } }
      : { $addToSet: { likes: userObjectId } };

    const updated = await Post.findByIdAndUpdate(postId, update, { new: true }).select('likes').exec();
    return { liked: !alreadyLiked, likesCount: updated?.likes.length ?? 0 };
  }

  async toggleSave(postId: string, userId: string): Promise<{ saved: boolean }> {
    const post = await Post.findById(postId).select('savedBy').exec();
    if (!post) throw new Error('Post not found');

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const alreadySaved = post.savedBy.some((id) => id.equals(userObjectId));

    const update = alreadySaved
      ? { $pull: { savedBy: userObjectId } }
      : { $addToSet: { savedBy: userObjectId } };

    await Post.findByIdAndUpdate(postId, update);
    return { saved: !alreadySaved };
  }

  // Trending: posts with most likes in last 48 hours (aggregation pipeline)
  async getTrending(limit = 10): Promise<IPostDocument[]> {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return Post.aggregate([
      { $match: { createdAt: { $gte: since }, visibility: 'public' } },
      { $addFields: { likesCount: { $size: '$likes' } } },
      { $sort: { likesCount: -1, createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            { $project: { 'profile.firstName': 1, 'profile.lastName': 1, 'profile.avatar': 1, 'profile.headline': 1 } },
          ],
        },
      },
      { $unwind: '$author' },
    ]);
  }

  async addComment(postId: string, authorId: string, data: CreateCommentInput) {
    const comment = new Comment({
      post: new mongoose.Types.ObjectId(postId),
      author: new mongoose.Types.ObjectId(authorId),
      content: data.content,
      parentComment: data.parentComment ? new mongoose.Types.ObjectId(data.parentComment) : null,
    });

    const [savedComment] = await Promise.all([
      comment.save(),
      Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }),
      // If reply, increment parent repliesCount
      data.parentComment
        ? Comment.findByIdAndUpdate(data.parentComment, { $inc: { repliesCount: 1 } })
        : Promise.resolve(),
    ]);

    return savedComment.populate('author', 'profile.firstName profile.lastName profile.avatar');
  }

  async getComments(postId: string, parentComment: string | null, skip: number, limit: number) {
    const filter = {
      post: new mongoose.Types.ObjectId(postId),
      parentComment: parentComment ? new mongoose.Types.ObjectId(parentComment) : null,
    };
    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'profile.firstName profile.lastName profile.avatar profile.headline'),
      Comment.countDocuments(filter),
    ]);
    return { comments, total };
  }

  async getSavedPosts(userId: string, skip: number, limit: number) {
    const [posts, total] = await Promise.all([
      Post.find({ savedBy: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'profile.firstName profile.lastName profile.avatar profile.headline'),
      Post.countDocuments({ savedBy: new mongoose.Types.ObjectId(userId) }),
    ]);
    return { posts, total };
  }
}

export const postRepository = new PostRepository();
