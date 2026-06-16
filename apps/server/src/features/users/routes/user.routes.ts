import { Router } from 'express';
import multer from 'multer';
import { userController } from '../controller/user.controller';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { updateProfileSchema, addSkillSchema, userSearchSchema } from '../validators/user.validator';

const router = Router();

// Multer: memory storage — files sent directly to Cloudinary (no disk I/O)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF allowed.'));
    }
  },
});

// All user routes require authentication
router.use(authenticate);

// ─── Profile Routes ───────────────────────────────────────────────────────────
router.get('/recommendations', userController.getRecommendations);
router.get('/search', validate(userSearchSchema, 'query'), userController.searchUsers);
router.get('/:id', userController.getUser);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
router.post('/resume', upload.single('resume'), userController.uploadResume);

// ─── Skills Routes ────────────────────────────────────────────────────────────
router.post('/skills', validate(addSkillSchema), userController.addSkill);
router.delete('/skills/:skillName', userController.removeSkill);

// ─── Follow Routes ────────────────────────────────────────────────────────────
router.post('/:id/follow', userController.follow);
router.delete('/:id/follow', userController.unfollow);

export default router;
