import { postRepository } from '../repository/post.repository';
import { AppError } from '../../../shared/utils/asyncHandler';
import { User } from '../../../models/User';
import { notificationQueue } from '../../../queues/notification.queue';
import { CreatePostInput, UpdatePostInput, CreateCommentInput } from '../validators/post.validator';
import mongoose from 'mongoose';

export class PostService {
  async createPost(authorId: string, data: CreatePostInput, imageUrls: string[] = []) {
    return postRepository.create(authorId, data, imageUrls);
  }

  async getPost(postId: string) {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('Post not found', 404);
    return post;
  }

  async getFeed(userId: string, page: number, limit: number) {
    const user = await User.findById(userId).select('following').exec();
    const following = user?.following ?? [];
    const skip = (page - 1) * limit;
    return postRepository.getFeed(userId, following as mongoose.Types.ObjectId[], skip, limit);
  }

  async updatePost(postId: string, authorId: string, data: UpdatePostInput) {
    const post = await postRepository.update(postId, authorId, data);
    if (!post) throw new AppError('Post not found or unauthorized', 404);
    return post;
  }

  async deletePost(postId: string, authorId: string, role: string) {
    const deleted = await postRepository.delete(postId, authorId, role);
    if (!deleted) throw new AppError('Post not found or unauthorized', 404);
  }

  async toggleLike(postId: string, userId: string) {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('Post not found', 404);

    const result = await postRepository.toggleLike(postId, userId);

    // Send notification only when liking (not unliking)
    if (result.liked && post.author.toString() !== userId) {
      await notificationQueue.add('send-notification', {
        recipientId: post.author.toString(),
        senderId: userId,
        type: 'like',
        title: 'New Like',
        message: 'liked your post',
        data: { postId },
      });
    }
    return result;
  }

  async toggleSave(postId: string, userId: string) {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('Post not found', 404);
    return postRepository.toggleSave(postId, userId);
  }

  async getTrending() {
    return postRepository.getTrending(10);
  }

  async addComment(postId: string, authorId: string, data: CreateCommentInput) {
    const post = await postRepository.findById(postId);
    if (!post) throw new AppError('Post not found', 404);

    const comment = await postRepository.addComment(postId, authorId, data);

    // Notify post author of new comment
    if (post.author.toString() !== authorId) {
      await notificationQueue.add('send-notification', {
        recipientId: post.author.toString(),
        senderId: authorId,
        type: data.parentComment ? 'reply' : 'comment',
        title: data.parentComment ? 'New Reply' : 'New Comment',
        message: data.parentComment ? 'replied to a comment on your post' : 'commented on your post',
        data: { postId, commentId: comment._id.toString() },
      });
    }
    return comment;
  }

  async getComments(postId: string, parentComment: string | null, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return postRepository.getComments(postId, parentComment, skip, limit);
  }

  async getSavedPosts(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return postRepository.getSavedPosts(userId, skip, limit);
  }
}

export const postService = new PostService();
