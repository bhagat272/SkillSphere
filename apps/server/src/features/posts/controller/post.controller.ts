import { Request, Response } from 'express';
import { postService } from '../service/post.service';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { getPagination } from '../../../shared/utils/pagination';

export class PostController {
  // GET /api/v1/posts (feed)
  getFeed = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const { posts, total } = await postService.getFeed(req.user!.userId, page, limit);
    sendResponse.paginated(res, posts, total, page, limit);
  });

  // POST /api/v1/posts
  createPost = asyncHandler(async (req: Request, res: Response) => {
    const imageUrls = (req.files as Express.Multer.File[])?.map((f) => f.path) ?? [];
    const post = await postService.createPost(req.user!.userId, req.body, imageUrls);
    sendResponse.created(res, { post }, 'Post created');
  });

  // PUT /api/v1/posts/:id
  updatePost = asyncHandler(async (req: Request, res: Response) => {
    const post = await postService.updatePost(req.params.id, req.user!.userId, req.body);
    sendResponse.success(res, { post }, 'Post updated');
  });

  // DELETE /api/v1/posts/:id
  deletePost = asyncHandler(async (req: Request, res: Response) => {
    await postService.deletePost(req.params.id, req.user!.userId, req.user!.role);
    sendResponse.success(res, null, 'Post deleted');
  });

  // POST /api/v1/posts/:id/like
  toggleLike = asyncHandler(async (req: Request, res: Response) => {
    const result = await postService.toggleLike(req.params.id, req.user!.userId);
    sendResponse.success(res, result);
  });

  // POST /api/v1/posts/:id/save
  toggleSave = asyncHandler(async (req: Request, res: Response) => {
    const result = await postService.toggleSave(req.params.id, req.user!.userId);
    sendResponse.success(res, result);
  });

  // GET /api/v1/posts/trending
  getTrending = asyncHandler(async (req: Request, res: Response) => {
    const posts = await postService.getTrending();
    sendResponse.success(res, { posts });
  });

  // POST /api/v1/posts/:id/comments
  addComment = asyncHandler(async (req: Request, res: Response) => {
    const comment = await postService.addComment(req.params.id, req.user!.userId, req.body);
    sendResponse.created(res, { comment }, 'Comment added');
  });

  // GET /api/v1/posts/:id/comments
  getComments = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const parentComment = (req.query.parentComment as string) || null;
    const { comments, total } = await postService.getComments(
      req.params.id, parentComment, page, limit
    );
    sendResponse.paginated(res, comments, total, page, limit);
  });

  // GET /api/v1/posts/saved
  getSavedPosts = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const { posts, total } = await postService.getSavedPosts(req.user!.userId, page, limit);
    sendResponse.paginated(res, posts, total, page, limit);
  });
}

export const postController = new PostController();
