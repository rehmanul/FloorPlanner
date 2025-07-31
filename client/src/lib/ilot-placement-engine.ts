import { ProcessedFloorPlan, Ilot, Corridor, Rectangle } from "@shared/schema";
import { GeometricUtils } from "./geometric-utils";

interface IlotSize {
  type: 'small' | 'medium' | 'large' | 'xlarge';
  width: number;
  height: number;
  weight: number;
}

interface PlacementSettings {
  corridorWidth: number;
  minClearance: number;
  algorithm: string;
}

export class IlotPlacementEngine {
  private settings: PlacementSettings = {
    corridorWidth: 120,
    minClearance: 80,
    algorithm: 'intelligent'
  };

  private utils = new GeometricUtils();

  setSettings(settings: Partial<PlacementSettings>) {
    this.settings = { ...this.settings, ...settings };
  }

  async generateIlots(
    floorPlan: ProcessedFloorPlan,
    density: number
  ): Promise<{ ilots: Ilot[]; corridors: Corridor[] }> {
    const ilots: Ilot[] = [];
    const usableArea = floorPlan.spaceAnalysis.usableArea;
    const targetArea = usableArea * (density / 100);
    
    // Generate different sized îlots
    const ilotSizes = this.getIlotSizes(targetArea);
    
    // Place îlots using the selected algorithm
    switch (this.settings.algorithm) {
      case 'intelligent':
        await this.placeIlotsIntelligent(ilotSizes, ilots, floorPlan);
        break;
      case 'grid':
        await this.placeIlotsGrid(ilotSizes, ilots, floorPlan);
        break;
      case 'genetic':
        await this.placeIlotsGenetic(ilotSizes, ilots, floorPlan);
        break;
      default:
        await this.placeIlotsIntelligent(ilotSizes, ilots, floorPlan);
    }
    
    // Generate corridors between facing îlot rows
    const corridors = this.generateCorridors(ilots);
    
    return { ilots, corridors };
  }

  private getIlotSizes(targetArea: number): IlotSize[] {
    const sizes: IlotSize[] = [];
    const sizeDefinitions: IlotSize[] = [
      { type: 'small', width: 80, height: 60, weight: 0.4 },
      { type: 'medium', width: 120, height: 80, weight: 0.35 },
      { type: 'large', width: 160, height: 100, weight: 0.2 },
      { type: 'xlarge', width: 200, height: 120, weight: 0.05 }
    ];
    
    sizeDefinitions.forEach(def => {
      const count = Math.floor((targetArea * def.weight) / ((def.width * def.height) / 10000));
      for (let i = 0; i < count; i++) {
        sizes.push({
          ...def,
          width: def.width + (Math.random() - 0.5) * 20, // Add variation
          height: def.height + (Math.random() - 0.5) * 15
        });
      }
    });
    
    return sizes;
  }

  private async placeIlotsIntelligent(
    sizes: IlotSize[],
    ilots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): Promise<void> {
    const bounds = floorPlan.bounds;
    const attempts = 1000; // Increased for better placement
    
    // Sort sizes by area (largest first) for better packing
    sizes.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      let placed = false;
      
      for (let attempt = 0; attempt < attempts && !placed; attempt++) {
        const candidate = this.generateCandidatePosition(size, bounds, floorPlan, attempt);
        
        if (this.isValidPlacement(candidate, ilots, floorPlan)) {
          ilots.push({
            id: `ilot_${i}`,
            x: candidate.x,
            y: candidate.y,
            width: candidate.width,
            height: candidate.height,
            area: (candidate.width * candidate.height) / 10000, // Convert to m²
            type: size.type
          });
          placed = true;
        }
      }
    }
  }

  private async placeIlotsGrid(
    sizes: IlotSize[],
    ilots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): Promise<void> {
    const bounds = floorPlan.bounds;
    const gridSize = 100; // Grid spacing in cm
    let sizeIndex = 0;
    
    for (let y = bounds.minY; y < bounds.maxY && sizeIndex < sizes.length; y += gridSize) {
      for (let x = bounds.minX; x < bounds.maxX && sizeIndex < sizes.length; x += gridSize) {
        const size = sizes[sizeIndex];
        const candidate = {
          x,
          y,
          width: size.width,
          height: size.height
        };
        
        if (this.isValidPlacement(candidate, ilots, floorPlan)) {
          ilots.push({
            id: `ilot_${sizeIndex}`,
            x: candidate.x,
            y: candidate.y,
            width: candidate.width,
            height: candidate.height,
            area: (candidate.width * candidate.height) / 10000,
            type: size.type
          });
          sizeIndex++;
        }
      }
    }
  }

  private async placeIlotsGenetic(
    sizes: IlotSize[],
    ilots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): Promise<void> {
    // Simplified genetic algorithm implementation
    const populationSize = 50;
    const generations = 100;
    const bounds = floorPlan.bounds;
    
    let bestSolution: Ilot[] = [];
    let bestFitness = 0;
    
    for (let gen = 0; gen < generations; gen++) {
      const population: Ilot[][] = [];
      
      // Generate population
      for (let i = 0; i < populationSize; i++) {
        const individual: Ilot[] = [];
        sizes.forEach((size, index) => {
          const candidate = this.generateCandidatePosition(size, bounds, floorPlan, i + index);
          if (this.isValidPlacement(candidate, individual, floorPlan)) {
            individual.push({
              id: `ilot_${index}`,
              x: candidate.x,
              y: candidate.y,
              width: candidate.width,
              height: candidate.height,
              area: (candidate.width * candidate.height) / 10000,
              type: size.type
            });
          }
        });
        population.push(individual);
      }
      
      // Evaluate fitness (area utilization + accessibility)
      population.forEach(individual => {
        const fitness = this.evaluateFitness(individual, floorPlan);
        if (fitness > bestFitness) {
          bestFitness = fitness;
          bestSolution = individual;
        }
      });
    }
    
    ilots.push(...bestSolution);
  }

  private generateCandidatePosition(
    size: IlotSize,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    floorPlan: ProcessedFloorPlan,
    seed: number
  ) {
    // Use seed for more deterministic placement in later attempts
    const randomX = bounds.minX + (Math.sin(seed) * 0.5 + 0.5) * (bounds.maxX - bounds.minX - size.width);
    const randomY = bounds.minY + (Math.cos(seed) * 0.5 + 0.5) * (bounds.maxY - bounds.minY - size.height);
    
    return {
      x: Math.max(bounds.minX, Math.min(randomX, bounds.maxX - size.width)),
      y: Math.max(bounds.minY, Math.min(randomY, bounds.maxY - size.height)),
      width: size.width,
      height: size.height
    };
  }

  private isValidPlacement(
    candidate: Rectangle,
    existingIlots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): boolean {
    // Check collision with existing îlots
    for (const existing of existingIlots) {
      if (this.utils.rectanglesOverlap(candidate, existing, this.settings.minClearance)) {
        return false;
      }
    }
    
    // Check if within bounds
    const bounds = floorPlan.bounds;
    if (candidate.x < bounds.minX || candidate.x + candidate.width > bounds.maxX ||
        candidate.y < bounds.minY || candidate.y + candidate.height > bounds.maxY) {
      return false;
    }
    
    // Check collision with restricted areas
    for (const restricted of floorPlan.restrictedAreas) {
      if (this.utils.rectanglesOverlap(candidate, restricted.bounds, this.settings.minClearance)) {
        return false;
      }
    }
    
    // Check proximity to walls (should not be too close to entrances)
    for (const door of floorPlan.doors) {
      const distance = this.utils.distanceFromPointToRectangle(door.center, candidate);
      if (distance < door.radius + this.settings.minClearance) {
        return false;
      }
    }
    
    return true;
  }

  private generateCorridors(ilots: Ilot[]): Corridor[] {
    const corridors: Corridor[] = [];
    
    // Group îlots into rows based on Y coordinate
    const rows = this.groupIlotsIntoRows(ilots);
    
    // Create corridors between facing rows
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        if (this.areRowsFacing(rows[i], rows[j])) {
          const corridor = this.createCorridorBetweenRows(rows[i], rows[j]);
          if (corridor) {
            corridors.push(corridor);
          }
        }
      }
    }
    
    return corridors;
  }

  private groupIlotsIntoRows(ilots: Ilot[]): Ilot[][] {
    const rows: Ilot[][] = [];
    const tolerance = 80; // Y-coordinate tolerance for grouping
    
    ilots.forEach(ilot => {
      let addedToRow = false;
      
      for (const row of rows) {
        if (Math.abs(row[0].y - ilot.y) < tolerance) {
          row.push(ilot);
          addedToRow = true;
          break;
        }
      }
      
      if (!addedToRow) {
        rows.push([ilot]);
      }
    });
    
    // Sort îlots within each row by X coordinate
    rows.forEach(row => {
      row.sort((a, b) => a.x - b.x);
    });
    
    return rows;
  }

  private areRowsFacing(row1: Ilot[], row2: Ilot[]): boolean {
    const avgY1 = row1.reduce((sum, ilot) => sum + ilot.y, 0) / row1.length;
    const avgY2 = row2.reduce((sum, ilot) => sum + ilot.y, 0) / row2.length;
    const distance = Math.abs(avgY2 - avgY1);
    
    // Check if rows are parallel and at reasonable distance for corridor
    return distance > this.settings.corridorWidth && distance < 400;
  }

  private createCorridorBetweenRows(row1: Ilot[], row2: Ilot[]): Corridor | null {
    const avgY1 = row1.reduce((sum, ilot) => sum + ilot.y + ilot.height, 0) / row1.length;
    const avgY2 = row2.reduce((sum, ilot) => sum + ilot.y, 0) / row2.length;
    
    // Find overlapping X range
    const minX = Math.max(
      Math.min(...row1.map(ilot => ilot.x)),
      Math.min(...row2.map(ilot => ilot.x))
    );
    const maxX = Math.min(
      Math.max(...row1.map(ilot => ilot.x + ilot.width)),
      Math.max(...row2.map(ilot => ilot.x + ilot.width))
    );
    
    if (maxX > minX + this.settings.corridorWidth) {
      return {
        id: `corridor_${Date.now()}_${Math.random()}`,
        x1: minX,
        y1: avgY1,
        x2: maxX,
        y2: avgY2,
        width: this.settings.corridorWidth,
        type: 'horizontal'
      };
    }
    
    return null;
  }

  private evaluateFitness(ilots: Ilot[], floorPlan: ProcessedFloorPlan): number {
    if (ilots.length === 0) return 0;
    
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const areaUtilization = totalIlotArea / floorPlan.spaceAnalysis.usableArea;
    
    // Calculate accessibility score based on corridor connectivity
    const corridors = this.generateCorridors(ilots);
    const accessibilityScore = corridors.length / Math.max(1, ilots.length / 5);
    
    // Combine metrics (area utilization weighted higher)
    return areaUtilization * 0.7 + Math.min(accessibilityScore, 1) * 0.3;
  }
}
