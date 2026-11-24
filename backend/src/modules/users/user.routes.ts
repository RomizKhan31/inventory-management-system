import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { UserController } from './user.controller';

const router = Router();

// User management endpoints require authentication + USER_MANAGE permission (ADMIN only)
router.use(authenticate);
router.use(requirePermission('USER_MANAGE'));

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List operator user accounts (ADMIN only)
 *     description: Paginated query of employee accounts with role, active status, and search filters.
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or userCode
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ALL, ADMIN, COMPONENT_TRACKER, RECEIVE_USER, DELIVERY_USER, REPORT_VIEWER]
 *           default: ALL
 *         description: Role filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ALL, ACTIVE, INACTIVE]
 *           default: ALL
 *         description: Account status filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated users list.
 *       403:
 *         description: Forbidden - Clearance restricted to ADMIN.
 *   post:
 *     summary: Create operator account with single role (ADMIN only)
 *     description: Provisions a new manufacturing user account with strictly one role assigned.
 *     tags:
 *       - User Management
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
 *                 example: OP_9901
 *               name:
 *                 type: string
 *                 example: Tariqul Islam
 *               email:
 *                 type: string
 *                 format: email
 *                 example: tariqul.islam@waltonbd.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Walton@2026
 *               role:
 *                 type: string
 *                 enum: [ADMIN, COMPONENT_TRACKER, RECEIVE_USER, DELIVERY_USER, REPORT_VIEWER]
 *                 example: RECEIVE_USER
 *     responses:
 *       201:
 *         description: User created successfully.
 *       400:
 *         description: Duplicate User Code or Email.
 *       422:
 *         description: Validation error.
 */
router.get('/', UserController.listUsers);
router.post('/', UserController.createUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get single user profile by ID (ADMIN only)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo ObjectId of user
 *     responses:
 *       200:
 *         description: User profile details.
 *       404:
 *         description: User not found.
 *   put:
 *     summary: Update user profile information (ADMIN only)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tariqul Islam Updated
 *               email:
 *                 type: string
 *                 format: email
 *                 example: tariqul.updated@waltonbd.com
 *     responses:
 *       200:
 *         description: User profile updated successfully.
 *   patch:
 *     summary: Partially update user profile (ADMIN only)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: User profile updated.
 *   delete:
 *     summary: Soft-deactivate user account (ADMIN only)
 *     description: Sets account status to inactive to revoke login access while preserving audit trail history.
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully.
 */
router.get('/:id', UserController.getUser);
router.put('/:id', UserController.updateUser);
router.patch('/:id', UserController.updateUser);
router.delete('/:id', UserController.softDelete);

/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   patch:
 *     summary: Change user single-role assignment (ADMIN only)
 *     description: Enforces discrete single-role transition with automatic permission updates.
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, COMPONENT_TRACKER, RECEIVE_USER, DELIVERY_USER, REPORT_VIEWER]
 *                 example: DELIVERY_USER
 *     responses:
 *       200:
 *         description: User role updated successfully.
 *       400:
 *         description: Cannot remove the last active ADMIN.
 *       422:
 *         description: Invalid role specified.
 */
router.patch('/:id/role', UserController.changeRole);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Toggle operator account active / deactivated state (ADMIN only)
 *     description: When deactivated, existing JWT tokens are immediately blocked with HTTP 403 ACCOUNT_DEACTIVATED.
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: User status updated.
 *       400:
 *         description: Cannot deactivate the primary administrator.
 */
router.patch('/:id/status', UserController.toggleStatus);

export const userRoutes = router;
