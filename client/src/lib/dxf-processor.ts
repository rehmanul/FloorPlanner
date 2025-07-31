import { ProcessedFloorPlan, Wall, Door, Window, RestrictedArea, SpaceAnalysis, Bounds, Point } from "@shared/schema";

// Import dxf-parser from CDN - this would be loaded via script tag in production
declare global {
  interface Window {
    DxfParser: any;
  }
}

export class DXFProcessor {
  private parser: any;

  constructor() {
    // Initialize DXF parser - in production this would come from the CDN
    if (typeof window !== 'undefined' && window.DxfParser) {
      this.parser = new window.DxfParser();
    } else {
      // Fallback for development
      this.parser = {
        parseSync: (content: string) => {
          // Mock parser for development
          return {
            entities: [],
            tables: {
              layers: []
            },
            header: {}
          };
        }
      };
    }
  }

  async processDXF(
    fileContent: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<ProcessedFloorPlan> {
    try {
      onProgress?.('Parsing DXF structure...', 20);
      
      const dxfData = this.parser.parseSync(fileContent);
      
      onProgress?.('Extracting geometric elements...', 40);
      
      const walls = this.extractWalls(dxfData);
      const doors = this.extractDoors(dxfData);
      const windows = this.extractWindows(dxfData);
      
      onProgress?.('Analyzing space usage...', 60);
      
      const bounds = this.calculateBounds(walls);
      const spaceAnalysis = this.analyzeSpaceUsage(walls, doors, windows, bounds);
      
      onProgress?.('Detecting restricted areas...', 80);
      
      const restrictedAreas = this.detectRestrictedAreas(dxfData);
      
      onProgress?.('Finalizing analysis...', 100);
      
      return {
        walls,
        doors,
        windows,
        restrictedAreas,
        spaceAnalysis,
        bounds
      };
      
    } catch (error) {
      console.error('DXF Processing Error:', error);
      throw new Error('Failed to process DXF file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private extractWalls(dxfData: any): Wall[] {
    const walls: Wall[] = [];
    
    if (dxfData.entities) {
      dxfData.entities.forEach((entity: any, index: number) => {
        if (entity.type === 'LINE') {
          const startPoint: Point = { x: entity.vertices[0].x, y: entity.vertices[0].y };
          const endPoint: Point = { x: entity.vertices[1].x, y: entity.vertices[1].y };
          
          walls.push({
            id: `wall_${index}`,
            type: 'wall',
            points: [startPoint, endPoint],
            thickness: entity.lineweight || 5,
            layer: entity.layer
          });
        } else if (entity.type === 'LWPOLYLINE') {
          // Handle polylines as multiple wall segments
          if (entity.vertices && entity.vertices.length > 1) {
            for (let i = 0; i < entity.vertices.length - 1; i++) {
              const startPoint: Point = { x: entity.vertices[i].x, y: entity.vertices[i].y };
              const endPoint: Point = { x: entity.vertices[i + 1].x, y: entity.vertices[i + 1].y };
              
              walls.push({
                id: `wall_${index}_${i}`,
                type: 'wall',
                points: [startPoint, endPoint],
                thickness: entity.lineweight || 5,
                layer: entity.layer
              });
            }
          }
        }
      });
    }
    
    return walls;
  }

  private extractDoors(dxfData: any): Door[] {
    const doors: Door[] = [];
    
    if (dxfData.entities) {
      dxfData.entities.forEach((entity: any, index: number) => {
        if (entity.type === 'CIRCLE' && entity.radius > 30 && entity.radius < 100) {
          doors.push({
            id: `door_${index}`,
            type: 'door',
            center: { x: entity.center.x, y: entity.center.y },
            radius: entity.radius,
            layer: entity.layer
          });
        } else if (entity.type === 'ARC' && entity.radius > 50 && entity.radius < 150) {
          // Door swing arcs
          doors.push({
            id: `door_${index}`,
            type: 'door',
            center: { x: entity.center.x, y: entity.center.y },
            radius: entity.radius,
            layer: entity.layer
          });
        }
      });
    }
    
    return doors;
  }

  private extractWindows(dxfData: any): Window[] {
    const windows: Window[] = [];
    
    if (dxfData.entities) {
      dxfData.entities.forEach((entity: any, index: number) => {
        if (entity.type === 'LWPOLYLINE' && this.isRectangular(entity)) {
          const bounds = this.getPolylineBounds(entity);
          if (bounds.width > 20 && bounds.width < 200 && bounds.height < 50) {
            windows.push({
              id: `window_${index}`,
              type: 'window',
              bounds: bounds,
              layer: entity.layer
            });
          }
        }
      });
    }
    
    return windows;
  }

  private detectRestrictedAreas(dxfData: any): RestrictedArea[] {
    const restrictedAreas: RestrictedArea[] = [];
    
    if (dxfData.entities) {
      dxfData.entities.forEach((entity: any, index: number) => {
        // Look for specific layer names or patterns that indicate restricted areas
        if (entity.layer && (
          entity.layer.toLowerCase().includes('restrict') ||
          entity.layer.toLowerCase().includes('stair') ||
          entity.layer.toLowerCase().includes('elevator') ||
          entity.layer.toLowerCase().includes('toilet')
        )) {
          const bounds = this.getEntityBounds(entity);
          if (bounds.width > 0 && bounds.height > 0) {
            restrictedAreas.push({
              id: `restricted_${index}`,
              type: 'restricted',
              bounds: bounds,
              layer: entity.layer
            });
          }
        }
      });
    }
    
    return restrictedAreas;
  }

  private analyzeSpaceUsage(walls: Wall[], doors: Door[], windows: Window[], bounds: Bounds): SpaceAnalysis {
    // Calculate total area
    const totalArea = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY) / 10000; // Convert to m²
    
    // Estimate wall area
    let wallArea = 0;
    walls.forEach(wall => {
      const length = Math.sqrt(
        Math.pow(wall.points[1].x - wall.points[0].x, 2) +
        Math.pow(wall.points[1].y - wall.points[0].y, 2)
      );
      wallArea += (length * wall.thickness) / 10000; // Convert to m²
    });
    
    const usableArea = totalArea - wallArea;
    const efficiency = usableArea > 0 ? (usableArea / totalArea) * 100 : 0;
    
    return {
      totalArea,
      usableArea,
      wallArea,
      efficiency,
      bounds
    };
  }

  private calculateBounds(walls: Wall[]): Bounds {
    if (walls.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    walls.forEach(wall => {
      wall.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });
    
    return { minX, minY, maxX, maxY };
  }

  private isRectangular(entity: any): boolean {
    return entity.vertices && entity.vertices.length === 4;
  }

  private getPolylineBounds(entity: any) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    entity.vertices.forEach((vertex: any) => {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private getEntityBounds(entity: any) {
    if (entity.vertices) {
      return this.getPolylineBounds(entity);
    } else if (entity.center && entity.radius) {
      return {
        x: entity.center.x - entity.radius,
        y: entity.center.y - entity.radius,
        width: entity.radius * 2,
        height: entity.radius * 2
      };
    }
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}
