import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from '../modules/auth/auth.routes';

const router = Router();

// Base Health Check
router.use('/', healthRoutes);

// Authentication Module
router.use('/auth', authRoutes);

export const apiRouter = router;
