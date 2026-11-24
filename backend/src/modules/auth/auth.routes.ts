import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate operator & receive JWT token
 *     description: |
 *       Authenticates a user via their unique **User Code** (e.g., `ADMIN01`, `66798`, `58877`, `54671`, `VIEW01`) 
 *       or official email address with password.
 *       Returns a signed JWT bearer token and user clearance permissions.
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: ADMIN01
 *                 description: Operator User Code (e.g. ADMIN01, 66798) or Email
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Walton@2026
 *                 description: Account secret password
 *     responses:
 *       200:
 *         description: Login successful. Returns JWT token and user profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Invalid credentials or password mismatch.
 *       403:
 *         description: Operator account is soft-deactivated.
 *       422:
 *         description: Request payload validation failure.
 */
router.post('/login', (req, res, next) => authController.login(req, res, next));

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Terminate active operator session
 *     description: Logs out the authenticated user and closes the active session.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out.
 *       401:
 *         description: Authentication required or token invalid.
 */
router.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get currently authenticated user profile
 *     description: Retrieves the profile details, active single role, and permissions of the logged-in operator.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operator profile retrieved successfully.
 *       401:
 *         description: Missing or expired bearer token.
 */
router.get('/me', authenticate, (req, res, next) =>
  authController.getMe(req, res, next)
);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change operator password
 *     description: |
 *       Allows the authenticated operator to change their login password.
 *       Requires current password and a new strong password (min 8 chars, 1 uppercase, 1 lowercase, 1 number).
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: Walton@2026
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: Walton@2027Secure
 *     responses:
 *       200:
 *         description: Password updated successfully.
 *       401:
 *         description: Current password incorrect.
 *       422:
 *         description: New password does not meet complexity requirements.
 */
router.post('/change-password', authenticate, (req, res, next) =>
  authController.changePassword(req, res, next)
);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new operator (ADMIN only)
 *     description: |
 *       Administrative endpoint to provision a new manufacturing operator account.
 *       Enforces strictly single-role RBAC clearance.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userCode
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               userCode:
 *                 type: string
 *                 example: OP_88991
 *               name:
 *                 type: string
 *                 example: Asif Iqbal
 *               email:
 *                 type: string
 *                 format: email
 *                 example: asif.iqbal@waltonbd.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Walton@2026
 *               role:
 *                 type: string
 *                 enum: [ADMIN, COMPONENT_TRACKER, RECEIVE_USER, DELIVERY_USER, REPORT_VIEWER]
 *                 example: COMPONENT_TRACKER
 *     responses:
 *       201:
 *         description: Operator successfully created.
 *       400:
 *         description: Duplicate User Code or Email.
 *       403:
 *         description: Forbidden - Requires ADMIN role.
 *       422:
 *         description: Validation error.
 */
router.post('/register', authenticate, requireRole('ADMIN'), (req, res, next) =>
  authController.register(req, res, next)
);

export const authRoutes = router;
