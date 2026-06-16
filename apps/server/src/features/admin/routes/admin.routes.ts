import { Router } from 'express';
import { adminController } from '../controller/admin.controller';
import { authenticate, authorize } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', adminController.getPlatformStats);
router.get('/users', adminController.listUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.get('/moderation/feed', adminController.listModerationFeed);
router.delete('/moderation/posts/:postId', adminController.moderatePost);

export default router;
