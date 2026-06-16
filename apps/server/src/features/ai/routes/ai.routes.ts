import { Router } from 'express';
import multer from 'multer';
import { aiController } from '../controller/ai.controller';
import { authenticate } from '../../../shared/middleware/auth.middleware';

const router = Router();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF resumes are supported') as any, false);
    }
  },
});

// All AI endpoints require authentication
router.use(authenticate);

router.post('/analyze-resume', upload.single('resume'), aiController.analyzeResume);
router.post('/profile-summary', aiController.generateProfileSummary);
router.get('/recommend-skills', aiController.recommendSkills);
router.post('/match-job/:jobId', aiController.matchJob);
router.post('/generate-post', aiController.generatePost);

export default router;
