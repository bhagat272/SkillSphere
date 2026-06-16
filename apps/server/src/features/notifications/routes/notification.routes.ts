import { Router } from 'express';
import { notificationController } from '../controller/notification.controller';
import { authenticate } from '../../../shared/middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/unread', notificationController.getUnreadCount);
router.post('/mark-all-read', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

export default router;
