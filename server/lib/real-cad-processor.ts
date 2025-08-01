import { ProcessedFloorPlan, Wall, Door, Window, RestrictedArea, SpaceAnalysis, Bounds, Point } from "@shared/schema";
import fs from 'fs';
import path from 'path';

export class RealCADProcessor {
  async processFile(fileBuffer: Buffer, fileName: string): Promise<ProcessedFloorPlan> {
    const extension = path.extname(fileName).toLowerCase();
    
    try {
      switch (extension) {
        case '.dxf':
          return await this.processDXF(fileBuffer);
        case '.dwg':
          return await this.processDWG(fileBuffer);
        case '.pdf':
          return await this.processPDF(fileBuffer);
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.tiff':
          return await this.processImage(fileBuffer);
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      console.error(`Error processing ${extension} file:`, error);
      throw new Error(`Failed to process ${extension} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processDXF(fileBuffer: Buffer): Promise<ProcessedFloorPlan> {
    try {
      // Parse DXF content using real parser
      const dxfContent = fileBuffer.toString('utf-8');
      const parsedData = this.parseDXFContent(dxfContent);
      
      return this.extractGeometryFromDXF(parsedData);
    } catch (error) {
      throw new Error(`DXF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseDXFContent(content: string) {
    const lines = content.split('\n').map(line => line.trim());
    const entities: any[] = [];
    const blocks: any[] = [];
    const layers: any[] = [];
    
    let currentSection = '';
    let currentEntity: any = null;
    let inEntitiesSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for section markers
      if (line === '0' && lines[i + 1] === 'SECTION') {
        currentSection = lines[i + 3] || '';
        inEntitiesSection = currentSection === 'ENTITIES';
        i += 3;
        continue;
      }
      
      if (line === '0' && lines[i + 1] === 'ENDSEC') {
        inEntitiesSection = false;
        continue;
      }
      
      // Parse entities in ENTITIES section
      if (inEntitiesSection && line === '0') {
        if (currentEntity) {
          entities.push(currentEntity);
        }
        
        const entityType = lines[i + 1];
        currentEntity = {
          type: entityType,
          layer: '',
          points: [],
          properties: {}
        };
        i++;
        continue;
      }
      
      // Parse entity data
      if (currentEntity && inEntitiesSection) {
        const code = parseInt(line);
        const value = lines[i + 1];
        
        if (isNaN(code)) continue;
        
        switch (code) {
          case 8: // Layer
            currentEntity.layer = value;
            break;
          case 10: // X coordinate
            if (!currentEntity.currentPoint) currentEntity.currentPoint = {};
            currentEntity.currentPoint.x = parseFloat(value);
            break;
          case 20: // Y coordinate
            if (!currentEntity.currentPoint) currentEntity.currentPoint = {};
            currentEntity.currentPoint.y = parseFloat(value);
            if (currentEntity.currentPoint.x !== undefined) {
              currentEntity.points.push({ ...currentEntity.currentPoint });
              currentEntity.currentPoint = {};
            }
            break;
          case 11: // End X coordinate for lines
            currentEntity.endX = parseFloat(value);
            break;
          case 21: // End Y coordinate for lines
            currentEntity.endY = parseFloat(value);
            break;
          case 40: // Radius for circles/arcs
            currentEntity.radius = parseFloat(value);
            break;
          case 50: // Start angle for arcs
            currentEntity.startAngle = parseFloat(value);
            break;
          case 51: // End angle for arcs
            currentEntity.endAngle = parseFloat(value);
            break;
        }
        i++;
      }
    }
    
    if (currentEntity) {
      entities.push(currentEntity);
    }
    
    return { entities, blocks, layers };
  }

  private extractGeometryFromDXF(parsedData: any): ProcessedFloorPlan {
    const walls: Wall[] = [];
    const doors: Door[] = [];
    const windows: Window[] = [];
    const restrictedAreas: RestrictedArea[] = [];
    
    let wallId = 1;
    let doorId = 1;
    let windowId = 1;
    let restrictedId = 1;
    
    parsedData.entities.forEach((entity: any) => {
      const layer = entity.layer?.toLowerCase() || '';
      
      if (entity.type === 'LINE') {
        // Classify lines as walls, doors, or windows based on layer names
        if (this.isWallLayer(layer)) {
          if (entity.points.length >= 2 || (entity.endX !== undefined && entity.endY !== undefined)) {
            const startPoint = entity.points[0] || { x: entity.points[0]?.x || 0, y: entity.points[0]?.y || 0 };
            const endPoint = entity.points[1] || { x: entity.endX || 0, y: entity.endY || 0 };
            
            walls.push({
              id: `wall_${wallId++}`,
              type: 'wall',
              points: [startPoint, endPoint],
              thickness: this.estimateWallThickness(layer),
              layer: entity.layer
            });
          }
        } else if (this.isDoorLayer(layer)) {
          const center = entity.points[0] || { x: 0, y: 0 };
          doors.push({
            id: `door_${doorId++}`,
            type: 'door',
            center,
            radius: this.estimateDoorSize(layer),
            layer: entity.layer
          });
        } else if (this.isWindowLayer(layer)) {
          const bounds = this.calculateLineBounds(entity);
          windows.push({
            id: `window_${windowId++}`,
            type: 'window',
            bounds,
            layer: entity.layer
          });
        }
      } else if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
        if (this.isDoorLayer(layer)) {
          const center = entity.points[0] || { x: 0, y: 0 };
          doors.push({
            id: `door_${doorId++}`,
            type: 'door',
            center,
            radius: entity.radius || 80,
            layer: entity.layer
          });
        } else if (this.isRestrictedLayer(layer)) {
          const bounds = this.calculateCircleBounds(entity);
          restrictedAreas.push({
            id: `restricted_${restrictedId++}`,
            type: 'restricted',
            bounds,
            layer: entity.layer
          });
        }
      } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        if (this.isWallLayer(layer) && entity.points.length >= 2) {
          // Convert polyline to individual wall segments
          for (let i = 0; i < entity.points.length - 1; i++) {
            walls.push({
              id: `wall_${wallId++}`,
              type: 'wall',
              points: [entity.points[i], entity.points[i + 1]],
              thickness: this.estimateWallThickness(layer),
              layer: entity.layer
            });
          }
        }
      } else if (entity.type === 'INSERT' && this.isRestrictedLayer(layer)) {
        // Handle block inserts (columns, equipment, etc.)
        const center = entity.points[0] || { x: 0, y: 0 };
        restrictedAreas.push({
          id: `restricted_${restrictedId++}`,
          type: 'restricted',
          bounds: {
            x: center.x - 50,
            y: center.y - 50,
            width: 100,
            height: 100
          },
          layer: entity.layer
        });
      }
    });
    
    const bounds = this.calculateOverallBounds(walls, doors, windows, restrictedAreas);
    const spaceAnalysis = this.calculateRealSpaceAnalysis(walls, doors, windows, bounds);
    
    return {
      walls,
      doors,
      windows,
      restrictedAreas,
      spaceAnalysis,
      bounds
    };
  }

  private isWallLayer(layer: string): boolean {
    const wallKeywords = ['wall', 'mur', 'partition', 'structure', 'arch'];
    return wallKeywords.some(keyword => layer.includes(keyword));
  }

  private isDoorLayer(layer: string): boolean {
    const doorKeywords = ['door', 'porte', 'opening', 'entrance'];
    return doorKeywords.some(keyword => layer.includes(keyword));
  }

  private isWindowLayer(layer: string): boolean {
    const windowKeywords = ['window', 'fenetre', 'glazing'];
    return windowKeywords.some(keyword => layer.includes(keyword));
  }

  private isRestrictedLayer(layer: string): boolean {
    const restrictedKeywords = ['column', 'pillar', 'equipment', 'hvac', 'stair', 'elevator', 'toilet'];
    return restrictedKeywords.some(keyword => layer.includes(keyword));
  }

  private estimateWallThickness(layer: string): number {
    // Estimate wall thickness based on layer name or default values
    if (layer.includes('exterior') || layer.includes('external')) return 200; // 20cm
    if (layer.includes('interior') || layer.includes('internal')) return 100; // 10cm
    if (layer.includes('partition')) return 75; // 7.5cm
    return 150; // Default 15cm
  }

  private estimateDoorSize(layer: string): number {
    // Standard door opening radius in mm
    return 800; // 80cm opening
  }

  private calculateLineBounds(entity: any): { x: number; y: number; width: number; height: number } {
    const points = entity.points;
    if (points.length < 2) {
      return { x: 0, y: 0, width: 100, height: 20 };
    }
    
    const minX = Math.min(...points.map((p: Point) => p.x));
    const maxX = Math.max(...points.map((p: Point) => p.x));
    const minY = Math.min(...points.map((p: Point) => p.y));
    const maxY = Math.max(...points.map((p: Point) => p.y));
    
    return {
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 20),
      height: Math.max(maxY - minY, 20)
    };
  }

  private calculateCircleBounds(entity: any): { x: number; y: number; width: number; height: number } {
    const center = entity.points[0] || { x: 0, y: 0 };
    const radius = entity.radius || 50;
    
    return {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2
    };
  }

  private calculateOverallBounds(walls: Wall[], doors: Door[], windows: Window[], restrictedAreas: RestrictedArea[]): Bounds {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Include wall points
    walls.forEach(wall => {
      wall.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });
    
    // Include door centers
    doors.forEach(door => {
      minX = Math.min(minX, door.center.x - door.radius);
      minY = Math.min(minY, door.center.y - door.radius);
      maxX = Math.max(maxX, door.center.x + door.radius);
      maxY = Math.max(maxY, door.center.y + door.radius);
    });
    
    // Include window bounds
    windows.forEach(window => {
      minX = Math.min(minX, window.bounds.x);
      minY = Math.min(minY, window.bounds.y);
      maxX = Math.max(maxX, window.bounds.x + window.bounds.width);
      maxY = Math.max(maxY, window.bounds.y + window.bounds.height);
    });
    
    // Include restricted areas
    restrictedAreas.forEach(area => {
      minX = Math.min(minX, area.bounds.x);
      minY = Math.min(minY, area.bounds.y);
      maxX = Math.max(maxX, area.bounds.x + area.bounds.width);
      maxY = Math.max(maxY, area.bounds.y + area.bounds.height);
    });
    
    // Fallback if no elements found
    if (!isFinite(minX)) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    }
    
    return { minX, minY, maxX, maxY };
  }

  private calculateRealSpaceAnalysis(walls: Wall[], doors: Door[], windows: Window[], bounds: Bounds): SpaceAnalysis {
    // Calculate total area in square meters
    const totalArea = ((bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)) / 1000000; // Convert mm² to m²
    
    // Calculate wall area
    let wallArea = 0;
    walls.forEach(wall => {
      const length = Math.sqrt(
        Math.pow(wall.points[1].x - wall.points[0].x, 2) +
        Math.pow(wall.points[1].y - wall.points[0].y, 2)
      );
      // Assume wall height of 2.5m for area calculation
      wallArea += (length * 2.5) / 1000000; // Convert mm² to m²
    });
    
    // Calculate door and window areas (openings reduce wall area)
    let openingArea = 0;
    doors.forEach(door => {
      // Assume door height of 2.1m
      openingArea += (door.radius * 2 * 2.1) / 1000000;
    });
    
    windows.forEach(window => {
      openingArea += (window.bounds.width * window.bounds.height) / 1000000;
    });
    
    const usableArea = Math.max(0, totalArea - (wallArea * 0.1)); // Approximate usable area
    const efficiency = totalArea > 0 ? (usableArea / totalArea) * 100 : 0;
    
    return {
      totalArea,
      usableArea,
      wallArea,
      efficiency,
      bounds
    };
  }

  private async processDWG(fileBuffer: Buffer): Promise<ProcessedFloorPlan> {
    // DWG files are proprietary Autodesk format - would need specialized library
    // For now, throw error suggesting DXF conversion
    throw new Error('DWG files require conversion to DXF format. Please save your file as DXF and try again.');
  }

  private async processPDF(fileBuffer: Buffer): Promise<ProcessedFloorPlan> {
    // PDF processing would require OCR and vector extraction
    throw new Error('PDF processing requires advanced OCR capabilities. Please convert your PDF to DXF format for best results.');
  }

  private async processImage(fileBuffer: Buffer): Promise<ProcessedFloorPlan> {
    // Image processing would require computer vision
    throw new Error('Image processing requires computer vision analysis. Please use DXF format for accurate results.');
  }
}