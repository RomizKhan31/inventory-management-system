import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from '../modules/auth/auth.routes';
import { masterDataRoutes } from '../modules/masterData/masterData.routes';
import { inventoryRoutes } from '../modules/inventory/inventory.routes';
import { reportsRoutes } from '../modules/reports/reports.routes';
import { userRoutes } from '../modules/users/user.routes';

const router = Router();

// Base Health Check
router.use('/', healthRoutes);

// Authentication Module
router.use('/auth', authRoutes);

// Master Data Management Module (Admin Only)
router.use('/master', masterDataRoutes);

// Inventory Operations Module (Role-gated)
router.use('/inventory', inventoryRoutes);

// Reports & Analytics Module (Role-gated)
router.use('/reports', reportsRoutes);

// User & Role Management Module (Admin Only)
router.use('/users', userRoutes);

export const apiRouter = router;
