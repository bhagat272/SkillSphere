import { Request, Response } from 'express';
import { adminService } from '../service/admin.service';
import { postService } from '../../posts/service/post.service';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { getPagination } from '../../../shared/utils/pagination';

export class AdminController {
  // GET /api/v1/admin/stats
  getPlatformStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await adminService.getPlatformStats();
    sendResponse.success(res, stats, 'Platform statistics retrieved successfully');
  });

  // GET /api/v1/admin/users
  listUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const { users, total } = await adminService.listUsers(page, limit);
    sendResponse.paginated(res, users, total, page, limit);
  });

  // PATCH /api/v1/admin/users/:id/status
  toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.body;
    if (isActive === undefined) {
      sendResponse.badRequest(res, 'isActive status is required');
      return;
    }
    await adminService.toggleUserStatus(req.params.id, isActive);
    sendResponse.success(
      res,
      null,
      `User account status updated to ${isActive ? 'Active' : 'Suspended'}`
    );
  });

  // GET /api/v1/admin/moderation/feed
  listModerationFeed = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const { posts, total } = await adminService.listModerationFeed(page, limit);
    sendResponse.paginated(res, posts, total, page, limit);
  });

  // DELETE /api/v1/admin/moderation/posts/:postId
  moderatePost = asyncHandler(async (req: Request, res: Response) => {
    // Invoke deletion, role = admin will override post ownership checks
    await postService.deletePost(req.params.postId, req.user!.userId, req.user!.role);
    sendResponse.success(res, null, 'Post removed by administrator moderation');
  });
}

export const adminController = new AdminController();
