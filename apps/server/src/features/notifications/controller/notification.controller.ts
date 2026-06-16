import { Request, Response } from 'express';
import { notificationService } from '../service/notification.service';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { getPagination } from '../../../shared/utils/pagination';

export class NotificationController {
  // GET /api/v1/notifications
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const { notifications, total } = await notificationService.getNotifications(
      req.user!.userId,
      page,
      limit
    );
    sendResponse.paginated(res, notifications, total, page, limit);
  });

  // GET /api/v1/notifications/unread
  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationService.getUnreadCount(req.user!.userId);
    sendResponse.success(res, { count });
  });

  // POST /api/v1/notifications/mark-all-read
  markAllRead = asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllAsRead(req.user!.userId);
    sendResponse.success(res, null, 'All notifications marked as read');
  });

  // PATCH /api/v1/notifications/:id/read
  markRead = asyncHandler(async (req: Request, res: Response) => {
    const notification = await notificationService.markAsRead(req.user!.userId, req.params.id);
    sendResponse.success(res, { notification }, 'Notification marked as read');
  });
}

export const notificationController = new NotificationController();
