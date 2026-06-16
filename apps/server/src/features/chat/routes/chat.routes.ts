import { Router } from 'express';
import { chatController } from '../controller/chat.controller';
import { authenticate } from '../../../shared/middleware/auth.middleware';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.getOrCreateConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);

export default router;
