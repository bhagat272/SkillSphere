import { Router } from 'express';
import { postController } from '../controller/post.controller';
import { authenticate, optionalAuth } from '../../../shared/middleware/auth.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createPostSchema, updatePostSchema, createCommentSchema } from '../validators/post.validator';

const router = Router();

// Public trending (no auth needed)
router.get('/trending', optionalAuth, postController.getTrending);

// All other routes require auth
router.use(authenticate);

router.get('/', postController.getFeed);
router.get('/saved', postController.getSavedPosts);
router.post('/', validate(createPostSchema), postController.createPost);
router.put('/:id', validate(updatePostSchema), postController.updatePost);
router.delete('/:id', postController.deletePost);
router.post('/:id/like', postController.toggleLike);
router.post('/:id/save', postController.toggleSave);
router.post('/:id/comments', validate(createCommentSchema), postController.addComment);
router.get('/:id/comments', postController.getComments);

export default router;
