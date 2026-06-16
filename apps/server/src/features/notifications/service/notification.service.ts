import { notificationRepository } from '../repository/notification.repository';
import { INotificationDocument } from '../../../models/Notification';
import { AppError } from '../../../shared/utils/asyncHandler';

export class NotificationService {
  async getNotifications(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ notifications: INotificationDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    return notificationRepository.getNotifications(userId, skip, limit);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await notificationRepository.markAllRead(userId);
  }

  async markAsRead(userId: string, notificationId: string): Promise<INotificationDocument> {
    const notification = await notificationRepository.markRead(userId, notificationId);
    if (!notification) {
      throw new AppError('Notification not found or unauthorized', 404);
    }
    return notification;
  }
}

export const notificationService = new NotificationService();
