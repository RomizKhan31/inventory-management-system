import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import {
  stockDetailsQuerySchema,
  dateRangeSummaryQuerySchema,
  barcodeHistoryQuerySchema,
  exportReportQuerySchema,
} from './reports.validation';
import { sendResponse } from '../../utils/response';
import { AppError } from '../../utils/AppError';

export class ReportsController {
  /**
   * GET /api/v1/reports/stock-details
   */
  static async getStockDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = stockDetailsQuerySchema.parse(req.query);
      const result = await ReportsService.getStockDetailsReport(validated);

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Stock details report generated successfully',
        data: result.data,
        pagination: result.pagination,
        kpiSummary: result.kpiSummary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/summary
   */
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = dateRangeSummaryQuerySchema.parse(req.query);
      const result = await ReportsService.getDateRangeSummaryReport(validated);

      return sendResponse(res, 200, 'Date-range summary report generated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/barcode-history/:barcode
   */
  static async getBarcodeHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const rawBarcode = Array.isArray(req.params.barcode) ? req.params.barcode[0] : req.params.barcode;
      if (!rawBarcode || typeof rawBarcode !== 'string' || rawBarcode.trim().length < 3) {
        throw AppError.badRequest('Valid product barcode is required');
      }

      const result = await ReportsService.getBarcodeHistoryReport(rawBarcode.trim().toUpperCase());
      return sendResponse(res, 200, `Barcode lifecycle history retrieved for '${rawBarcode}'`, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/export
   */
  static async exportReport(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = exportReportQuerySchema.parse(req.query);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (validated.reportType === 'stock-details') {
        const csv = await ReportsService.exportStockDetailsCsv({
          search: validated.search,
          status: validated.status,
          pointName: validated.pointName,
          startDate: validated.startDate,
          endDate: validated.endDate,
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="walton_stock_details_${timestamp}.csv"`
        );
        return res.status(200).send(csv);
      } else if (validated.reportType === 'summary') {
        const csv = await ReportsService.exportSummaryCsv({
          startDate: validated.startDate,
          endDate: validated.endDate,
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="walton_summary_report_${timestamp}.csv"`
        );
        return res.status(200).send(csv);
      } else if (validated.reportType === 'barcode-history') {
        if (!validated.barcode) {
          throw AppError.badRequest('Barcode parameter is required for barcode-history export');
        }

        const csv = await ReportsService.exportBarcodeHistoryCsv(validated.barcode);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="walton_barcode_${validated.barcode}_${timestamp}.csv"`
        );
        return res.status(200).send(csv);
      } else {
        throw AppError.badRequest('Invalid reportType specified');
      }
    } catch (error) {
      next(error);
    }
  }
}
