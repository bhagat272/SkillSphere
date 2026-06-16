import { Router } from 'express';
import { jobController } from '../controller/job.controller';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createJobSchema, applyJobSchema } from '../validators/job.validator';

const router = Router();

// All job routes require user authentication
router.use(authenticate);

router.get('/', jobController.listJobs);
router.get('/saved', jobController.getSavedJobs);
router.get('/recruiter/dashboard', jobController.getRecruiterDashboard);
router.get('/candidate/dashboard', jobController.getCandidateDashboard);
router.get('/recommendations', jobController.getJobRecommendations);

router.post('/', validate(createJobSchema), jobController.createJob);
router.get('/:id', jobController.getJobDetails);
router.put('/:id', jobController.updateJob);
router.delete('/:id', jobController.deleteJob);

router.post('/:id/apply', validate(applyJobSchema), jobController.applyToJob);
router.post('/:id/save', jobController.toggleSaveJob);
router.patch('/:id/applications/:appId/status', jobController.updateApplicationStatus);

export default router;
