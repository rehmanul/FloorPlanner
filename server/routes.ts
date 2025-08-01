import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { insertFloorPlanSchema, insertIlotLayoutSchema, insertProjectExportSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.dxf', '.dwg', '.pdf', '.jpg', '.jpeg', '.png'];
    const fileExt = '.' + file.originalname.split('.').pop()?.toLowerCase();

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Upload and process floor plan
  app.post('/api/floor-plans', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const fileType = '.' + req.file.originalname.split('.').pop()?.toLowerCase();

      // Create initial floor plan record
      const floorPlanData = insertFloorPlanSchema.parse({
        name: req.body.name || req.file.originalname,
        originalFileName: req.file.originalname,
        fileType: fileType,
        fileContent: fileContent
      });

      const floorPlan = await storage.createFloorPlan(floorPlanData);

      // Process the file based on type
      let processedData;
      if (fileType === '.dxf' || fileType === '.dwg') {
        const { DXFProcessor } = await import('./lib/dxf-processor');
        const processor = new DXFProcessor();
        processedData = await processor.processDXF(fileContent);
      } else if (fileType === '.pdf') {
        // TODO: Implement PDF processing
        throw new Error('PDF processing not yet implemented');
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Update floor plan with processed data
      const updatedFloorPlan = await storage.updateFloorPlanStatus(
        floorPlan.id,
        'completed',
        processedData,
        processedData.spaceAnalysis
      );

      res.json(updatedFloorPlan);
    } catch (error) {
      console.error('Floor plan upload error:', error);
      res.status(500).json({ 
        message: 'Failed to process floor plan',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get floor plan by ID
  app.get('/api/floor-plans/:id', async (req, res) => {
    try {
      const floorPlan = await storage.getFloorPlan(req.params.id);
      if (!floorPlan) {
        return res.status(404).json({ message: 'Floor plan not found' });
      }
      res.json(floorPlan);
    } catch (error) {
      console.error('Get floor plan error:', error);
      res.status(500).json({ message: 'Failed to retrieve floor plan' });
    }
  });

  // List all floor plans
  app.get('/api/floor-plans', async (req, res) => {
    try {
      const floorPlans = await storage.listFloorPlans();
      res.json(floorPlans);
    } catch (error) {
      console.error('List floor plans error:', error);
      res.status(500).json({ message: 'Failed to list floor plans' });
    }
  });

  // Update floor plan processing status
  app.patch('/api/floor-plans/:id/status', async (req, res) => {
    try {
      const { status, geometryData, spaceAnalysis } = req.body;

      const updatedFloorPlan = await storage.updateFloorPlanStatus(
        req.params.id,
        status,
        geometryData,
        spaceAnalysis
      );

      if (!updatedFloorPlan) {
        return res.status(404).json({ message: 'Floor plan not found' });
      }

      res.json(updatedFloorPlan);
    } catch (error) {
      console.error('Update floor plan status error:', error);
      res.status(500).json({ message: 'Failed to update floor plan status' });
    }
  });

  // Create îlot layout
  app.post('/api/ilot-layouts', async (req, res) => {
    try {
      const layoutData = insertIlotLayoutSchema.parse(req.body);
      const layout = await storage.createIlotLayout(layoutData);
      res.json(layout);
    } catch (error) {
      console.error('Create îlot layout error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid layout data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create îlot layout' });
    }
  });

  // Get îlot layout by ID
  app.get('/api/ilot-layouts/:id', async (req, res) => {
    try {
      const layout = await storage.getIlotLayout(req.params.id);
      if (!layout) {
        return res.status(404).json({ message: 'Îlot layout not found' });
      }
      res.json(layout);
    } catch (error) {
      console.error('Get îlot layout error:', error);
      res.status(500).json({ message: 'Failed to retrieve îlot layout' });
    }
  });

  // List îlot layouts for a floor plan
  app.get('/api/floor-plans/:floorPlanId/layouts', async (req, res) => {
    try {
      const layouts = await storage.listIlotLayoutsForFloorPlan(req.params.floorPlanId);
      res.json(layouts);
    } catch (error) {
      console.error('List îlot layouts error:', error);
      res.status(500).json({ message: 'Failed to list îlot layouts' });
    }
  });

  // Update îlot layout
  app.put('/api/ilot-layouts/:id', async (req, res) => {
    try {
      const layoutData = insertIlotLayoutSchema.parse(req.body);
      const updatedLayout = await storage.updateIlotLayout(req.params.id, layoutData);

      if (!updatedLayout) {
        return res.status(404).json({ message: 'Îlot layout not found' });
      }

      res.json(updatedLayout);
    } catch (error) {
      console.error('Update îlot layout error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid layout data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update îlot layout' });
    }
  });

  // Delete îlot layout
  app.delete('/api/ilot-layouts/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteIlotLayout(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Îlot layout not found' });
      }
      res.json({ message: 'Îlot layout deleted successfully' });
    } catch (error) {
      console.error('Delete îlot layout error:', error);
      res.status(500).json({ message: 'Failed to delete îlot layout' });
    }
  });

  // Export project
  app.post('/api/exports', async (req, res) => {
    try {
      const exportData = insertProjectExportSchema.parse(req.body);
      const exportRecord = await storage.createProjectExport(exportData);
      res.json(exportRecord);
    } catch (error) {
      console.error('Create export error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid export data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create export' });
    }
  });

  // Get export by ID
  app.get('/api/exports/:id', async (req, res) => {
    try {
      const exportRecord = await storage.getProjectExport(req.params.id);
      if (!exportRecord) {
        return res.status(404).json({ message: 'Export not found' });
      }
      res.json(exportRecord);
    } catch (error) {
      console.error('Get export error:', error);
      res.status(500).json({ message: 'Failed to retrieve export' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        storage: 'active',
        fileProcessor: 'ready',
        cadEngine: 'initialized'
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}