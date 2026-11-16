import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { sendResponse } from '../../utils/response';
import { User } from '../../database/models/User';
import { AppError } from '../../utils/AppError';
import { AuthService } from '../auth/auth.service';

const router = Router();

// User management endpoints require authentication + USER_MANAGE permission (ADMIN only)
router.use(authenticate);
router.use(requirePermission('USER_MANAGE'));

// List all users
router.get('/', async (req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });
  const sanitized = users.map((u) => AuthService.sanitizeUser(u));
  sendResponse(res, 200, 'Users retrieved successfully', sanitized);
});

// Toggle user active / deactivated state
router.patch('/:id/status', async (req: Request, res: Response, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      throw AppError.badRequest('Field "isActive" must be a boolean');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user?._id.toString() && !isActive) {
      throw AppError.badRequest('Administrators cannot deactivate their own account');
    }

    user.isActive = isActive;
    await user.save();

    sendResponse(
      res,
      200,
      `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      AuthService.sanitizeUser(user)
    );
  } catch (err) {
    next(err);
  }
});

// Change user role (strictly 1 role per user)
router.patch('/:id/role', async (req: Request, res: Response, next) => {
  try {
    const { role } = req.body;
    const validRoles = [
      'ADMIN',
      'COMPONENT_TRACKER',
      'RECEIVE_USER',
      'DELIVERY_USER',
      'REPORT_VIEWER',
    ];

    if (!validRoles.includes(role)) {
      throw AppError.badRequest(`Invalid role '${role}'. Must be one of [${validRoles.join(', ')}]`);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    user.role = role;
    await user.save();

    sendResponse(res, 200, 'User role updated successfully', AuthService.sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

export const userRoutes = router;
