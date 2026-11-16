import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';

const router = Router();

// Public Authentication Endpoint
router.post('/login', (req, res, next) => authController.login(req, res, next));

// Protected User Endpoints
router.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

router.get('/me', authenticate, (req, res, next) =>
  authController.getMe(req, res, next)
);

router.post('/change-password', authenticate, (req, res, next) =>
  authController.changePassword(req, res, next)
);

// Admin-Only Registration (No public self-registration)
router.post('/register', authenticate, requireRole('ADMIN'), (req, res, next) =>
  authController.register(req, res, next)
);

export const authRoutes = router;
