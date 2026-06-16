import mongoose from 'mongoose';
import { Notification, INotificationDocument } from '../../../models/Notification';

export class NotificationRepository {
  async getNotifications(
    userId: string,
    skip: number,
    limit: number
  ): Promise<{ notifications: INotificationDocument[]; total: number }> {
    const recipientId = new mongoose.Types.ObjectId(userId);
    const [notifications, total] = await Promise.all([
      Notification.find({ recipient: recipientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'profile.firstName profile.lastName profile.avatar profile.headline role')
        .exec(),
      Notification.countDocuments({ recipient: recipientId }),
    ]);

    return { notifications, total };
  }

  async countUnread(userId: string): Promise<number> {
    return Notification.countDocuments({
      recipient: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { recipient: new mongoose.Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } }
    ).exec();
  }

  async markRead(userId: string, notificationId: string): Promise<INotificationDocument | null> {
    return Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        recipient: new mongoose.Types.ObjectId(userId),
      },
      { $set: { isRead: true } },
      { new: true }
    ).exec();
  }
}

export const notificationRepository = new NotificationRepository();
