import { Router } from 'express';
import { healthRoutes } from './health.routes';

const router = Router();

// Base Health Check
router.use('/', healthRoutes);

export const apiRouter = router;
