import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { UserController } from './user.controller';

const router = Router();

// User management endpoints require authentication + USER_MANAGE permission (ADMIN only)
router.use(authenticate);
router.use(requirePermission('USER_MANAGE'));

// List all users with query filters (search, role, isActive, page, limit)
router.get('/', UserController.listUsers);

// Create user
router.post('/', UserController.createUser);

// Get single user details
router.get('/:id', UserController.getUser);

// Edit user profile (name, email)
router.put('/:id', UserController.updateUser);
router.patch('/:id', UserController.updateUser);

// Change user single role
router.patch('/:id/role', UserController.changeRole);

// Toggle active / deactivated state
router.patch('/:id/status', UserController.toggleStatus);

// Soft delete (sets isActive: false)
router.delete('/:id', UserController.softDelete);

export const userRoutes = router;
