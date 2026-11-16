import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { sendResponse } from '../../utils/response';
import { Product, Component, ReceivePoint, DeliveryPoint } from '../../database/models';

const router = Router();

// ALL Master Data routes require authentication + MASTER_DATA_MANAGE permission (ADMIN only)
router.use(authenticate);
router.use(requirePermission('MASTER_DATA_MANAGE'));

// Products Master Data
router.get('/products', async (req: Request, res: Response) => {
  const products = await Product.find({ isDeleted: false }).sort({ name: 1 });
  sendResponse(res, 200, 'Products retrieved successfully', products);
});

router.post('/products', async (req: Request, res: Response) => {
  const product = await Product.create(req.body);
  sendResponse(res, 201, 'Product created successfully', product);
});

// Components Master Data
router.get('/components', async (req: Request, res: Response) => {
  const components = await Component.find({ isDeleted: false }).sort({ name: 1 });
  sendResponse(res, 200, 'Components retrieved successfully', components);
});

router.post('/components', async (req: Request, res: Response) => {
  const component = await Component.create(req.body);
  sendResponse(res, 201, 'Component created successfully', component);
});

// Receive Points
router.get('/receive-points', async (req: Request, res: Response) => {
  const points = await ReceivePoint.find({ isDeleted: false }).sort({ name: 1 });
  sendResponse(res, 200, 'Receive points retrieved successfully', points);
});

router.post('/receive-points', async (req: Request, res: Response) => {
  const point = await ReceivePoint.create(req.body);
  sendResponse(res, 201, 'Receive point created successfully', point);
});

// Delivery Points
router.get('/delivery-points', async (req: Request, res: Response) => {
  const points = await DeliveryPoint.find({ isDeleted: false }).sort({ name: 1 });
  sendResponse(res, 200, 'Delivery points retrieved successfully', points);
});

router.post('/delivery-points', async (req: Request, res: Response) => {
  const point = await DeliveryPoint.create(req.body);
  sendResponse(res, 201, 'Delivery point created successfully', point);
});

export const masterDataRoutes = router;
