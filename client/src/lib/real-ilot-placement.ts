import { ProcessedFloorPlan, Ilot, Corridor, Point } from "@shared/schema";

export interface IlotPlacementSettings {
  density: number; // îlots per 100m²
  corridorWidth: number; // mm
  minClearance: number; // mm
  algorithm: 'intelligent' | 'grid' | 'genetic' | 'simulated_annealing';
}

export class RealIlotPlacementEngine {
  private floorPlan: ProcessedFloorPlan;
  private settings: IlotPlacementSettings;

  constructor(floorPlan: ProcessedFloorPlan, settings: IlotPlacementSettings) {
    this.floorPlan = floorPlan;
    this.settings = settings;
  }

  public generateLayout(): { ilots: Ilot[], corridors: Corridor[] } {
    switch (this.settings.algorithm) {
      case 'intelligent':
        return this.intelligentPlacement();
      case 'grid':
        return this.gridPlacement();
      case 'genetic':
        return this.geneticAlgorithmPlacement();
      case 'simulated_annealing':
        return this.simulatedAnnealingPlacement();
      default:
        return this.intelligentPlacement();
    }
  }

  private intelligentPlacement(): { ilots: Ilot[], corridors: Corridor[] } {
    const ilots: Ilot[] = [];
    const corridors: Corridor[] = [];
    
    // Calculate available space
    const bounds = this.floorPlan.bounds;
    const totalArea = ((bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)) / 1000000; // Convert to m²
    
    // Calculate target number of îlots based on density
    const targetIlotCount = Math.floor(totalArea * this.settings.density / 100);
    
    // Define îlot sizes (in mm)
    const ilotSizes = [
      { width: 1200, height: 800, type: 'small' as const },   // 1.2m x 0.8m
      { width: 1600, height: 1200, type: 'medium' as const }, // 1.6m x 1.2m
      { width: 2000, height: 1600, type: 'large' as const },  // 2.0m x 1.6m
      { width: 2400, height: 2000, type: 'xlarge' as const }  // 2.4m x 2.0m
    ];
    
    // Create placement grid
    const gridSpacing = this.settings.corridorWidth + 1200; // Minimum spacing between îlots
    const startX = bounds.minX + this.settings.minClearance;
    const startY = bounds.minY + this.settings.minClearance;
    const endX = bounds.maxX - this.settings.minClearance;
    const endY = bounds.maxY - this.settings.minClearance;
    
    let placedCount = 0;
    let ilotId = 1;
    
    // Place îlots using intelligent spacing
    for (let y = startY; y < endY && placedCount < targetIlotCount; y += gridSpacing) {
      for (let x = startX; x < endX && placedCount < targetIlotCount; x += gridSpacing) {
        // Select îlot size based on available space and variety
        const sizeIndex = this.selectOptimalSize(x, y, endX, endY, ilotSizes, placedCount);
        const selectedSize = ilotSizes[sizeIndex];
        
        // Check if îlot fits without collisions
        if (this.canPlaceIlot(x, y, selectedSize.width, selectedSize.height)) {
          const area = (selectedSize.width * selectedSize.height) / 1000000; // Convert to m²
          
          ilots.push({
            id: `ilot_${ilotId++}`,
            x,
            y,
            width: selectedSize.width,
            height: selectedSize.height,
            area,
            type: selectedSize.type
          });
          
          placedCount++;
        }
      }
    }
    
    // Generate corridor network
    this.generateCorridorNetwork(ilots, corridors);
    
    return { ilots, corridors };
  }

  private selectOptimalSize(x: number, y: number, maxX: number, maxY: number, sizes: any[], placedCount: number): number {
    const availableWidth = maxX - x;
    const availableHeight = maxY - y;
    
    // Filter sizes that fit in available space
    const fittingSizes = sizes.filter(size => 
      size.width <= availableWidth - this.settings.minClearance &&
      size.height <= availableHeight - this.settings.minClearance
    );
    
    if (fittingSizes.length === 0) return 0; // Default to smallest
    
    // Create variety by cycling through sizes
    const sizeIndex = placedCount % fittingSizes.length;
    return sizes.indexOf(fittingSizes[sizeIndex]);
  }

  private canPlaceIlot(x: number, y: number, width: number, height: number): boolean {
    // Check collision with walls
    for (const wall of this.floorPlan.walls) {
      if (this.rectangleIntersectsLine(x, y, width, height, wall.points[0], wall.points[1])) {
        return false;
      }
    }
    
    // Check collision with restricted areas
    for (const restricted of this.floorPlan.restrictedAreas) {
      if (this.rectanglesOverlap(
        x, y, width, height,
        restricted.bounds.x, restricted.bounds.y, restricted.bounds.width, restricted.bounds.height
      )) {
        return false;
      }
    }
    
    // Check minimum distance from doors
    for (const door of this.floorPlan.doors) {
      const distance = this.distanceFromPointToRectangle(door.center, x, y, width, height);
      if (distance < this.settings.minClearance) {
        return false;
      }
    }
    
    return true;
  }

  private rectangleIntersectsLine(rectX: number, rectY: number, rectW: number, rectH: number, p1: Point, p2: Point): boolean {
    // Check if line intersects with any of the rectangle's edges
    const rectEdges = [
      [{ x: rectX, y: rectY }, { x: rectX + rectW, y: rectY }],
      [{ x: rectX + rectW, y: rectY }, { x: rectX + rectW, y: rectY + rectH }],
      [{ x: rectX + rectW, y: rectY + rectH }, { x: rectX, y: rectY + rectH }],
      [{ x: rectX, y: rectY + rectH }, { x: rectX, y: rectY }]
    ];
    
    return rectEdges.some(edge => this.linesIntersect(p1, p2, edge[0], edge[1]));
  }

  private linesIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
    const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denominator === 0) return false; // Lines are parallel
    
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  private rectanglesOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
  }

  private distanceFromPointToRectangle(point: Point, rectX: number, rectY: number, rectW: number, rectH: number): number {
    const dx = Math.max(0, Math.max(rectX - point.x, point.x - (rectX + rectW)));
    const dy = Math.max(0, Math.max(rectY - point.y, point.y - (rectY + rectH)));
    return Math.sqrt(dx * dx + dy * dy);
  }

  private generateCorridorNetwork(ilots: Ilot[], corridors: Corridor[]): void {
    // Generate main horizontal corridors
    const bounds = this.floorPlan.bounds;
    let corridorId = 1;
    
    // Create horizontal corridors between îlot rows
    const rowYPositions = Array.from(new Set(ilots.map(ilot => ilot.y))).sort((a, b) => a - b);
    
    for (let i = 0; i < rowYPositions.length - 1; i++) {
      const y1 = rowYPositions[i];
      const y2 = rowYPositions[i + 1];
      const corridorY = y1 + 1200 + (this.settings.corridorWidth / 2); // Middle of corridor space
      
      corridors.push({
        id: `corridor_h_${corridorId++}`,
        x1: bounds.minX + this.settings.minClearance,
        y1: corridorY,
        x2: bounds.maxX - this.settings.minClearance,
        y2: corridorY,
        width: this.settings.corridorWidth,
        type: 'horizontal'
      });
    }
    
    // Create vertical corridors between îlot columns
    const colXPositions = Array.from(new Set(ilots.map(ilot => ilot.x))).sort((a, b) => a - b);
    
    for (let i = 0; i < colXPositions.length - 1; i++) {
      const x1 = colXPositions[i];
      const x2 = colXPositions[i + 1];
      const corridorX = x1 + 1600 + (this.settings.corridorWidth / 2); // Middle of corridor space
      
      corridors.push({
        id: `corridor_v_${corridorId++}`,
        x1: corridorX,
        y1: bounds.minY + this.settings.minClearance,
        x2: corridorX,
        y2: bounds.maxY - this.settings.minClearance,
        width: this.settings.corridorWidth,
        type: 'vertical'
      });
    }
  }

  private gridPlacement(): { ilots: Ilot[], corridors: Corridor[] } {
    // Simplified grid-based placement
    const ilots: Ilot[] = [];
    const corridors: Corridor[] = [];
    
    const bounds = this.floorPlan.bounds;
    const ilotSize = { width: 1600, height: 1200 }; // Standard size for grid
    const spacing = this.settings.corridorWidth + 200; // Extra spacing for grid
    
    let ilotId = 1;
    
    for (let y = bounds.minY + this.settings.minClearance; y < bounds.maxY - ilotSize.height - this.settings.minClearance; y += ilotSize.height + spacing) {
      for (let x = bounds.minX + this.settings.minClearance; x < bounds.maxX - ilotSize.width - this.settings.minClearance; x += ilotSize.width + spacing) {
        if (this.canPlaceIlot(x, y, ilotSize.width, ilotSize.height)) {
          const area = (ilotSize.width * ilotSize.height) / 1000000;
          
          ilots.push({
            id: `ilot_grid_${ilotId++}`,
            x,
            y,
            width: ilotSize.width,
            height: ilotSize.height,
            area,
            type: 'medium'
          });
        }
      }
    }
    
    this.generateCorridorNetwork(ilots, corridors);
    return { ilots, corridors };
  }

  private geneticAlgorithmPlacement(): { ilots: Ilot[], corridors: Corridor[] } {
    // Simplified genetic algorithm - would need more sophisticated implementation
    return this.intelligentPlacement();
  }

  private simulatedAnnealingPlacement(): { ilots: Ilot[], corridors: Corridor[] } {
    // Simplified simulated annealing - would need more sophisticated implementation
    return this.intelligentPlacement();
  }
}