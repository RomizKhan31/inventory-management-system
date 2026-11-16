import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { MasterDataController } from './masterData.controller';

const router = Router();

// ALL Master Data routes require authentication + MASTER_DATA_MANAGE permission (ADMIN only)
router.use(authenticate);
router.use(requirePermission('MASTER_DATA_MANAGE'));

// System overview statistics
router.get('/stats', MasterDataController.getStats);

// -------------------------------------------------------------
// Products Master Data
// -------------------------------------------------------------
router.get('/products', MasterDataController.listProducts);
router.post('/products', MasterDataController.createProduct);
router.get('/products/:id', MasterDataController.getProduct);
router.put('/products/:id', MasterDataController.updateProduct);
router.patch('/products/:id', MasterDataController.updateProduct);
router.delete('/products/:id', MasterDataController.deleteProduct);

// -------------------------------------------------------------
// Components Master Data
// -------------------------------------------------------------
router.get('/components', MasterDataController.listComponents);
router.post('/components', MasterDataController.createComponent);
router.get('/components/:id', MasterDataController.getComponent);
router.put('/components/:id', MasterDataController.updateComponent);
router.patch('/components/:id', MasterDataController.updateComponent);
router.delete('/components/:id', MasterDataController.deleteComponent);

// -------------------------------------------------------------
// Receive Points
// -------------------------------------------------------------
router.get('/receive-points', MasterDataController.listReceivePoints);
router.post('/receive-points', MasterDataController.createReceivePoint);
router.get('/receive-points/:id', MasterDataController.getReceivePoint);
router.put('/receive-points/:id', MasterDataController.updateReceivePoint);
router.patch('/receive-points/:id', MasterDataController.updateReceivePoint);
router.delete('/receive-points/:id', MasterDataController.deleteReceivePoint);

// -------------------------------------------------------------
// Delivery Points
// -------------------------------------------------------------
router.get('/delivery-points', MasterDataController.listDeliveryPoints);
router.post('/delivery-points', MasterDataController.createDeliveryPoint);
router.get('/delivery-points/:id', MasterDataController.getDeliveryPoint);
router.put('/delivery-points/:id', MasterDataController.updateDeliveryPoint);
router.patch('/delivery-points/:id', MasterDataController.updateDeliveryPoint);
router.delete('/delivery-points/:id', MasterDataController.deleteDeliveryPoint);

export const masterDataRoutes = router;
