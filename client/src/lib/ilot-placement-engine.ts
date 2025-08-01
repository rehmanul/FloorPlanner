
import { ProcessedFloorPlan, Ilot, Corridor, Rectangle } from "@shared/schema";
import { GeometricUtils } from "./geometric-utils";

interface IlotSize {
  type: 'small' | 'medium' | 'large' | 'xlarge';
  width: number;
  height: number;
  weight: number;
  priority: number;
}

interface PlacementSettings {
  corridorWidth: number;
  minClearance: number;
  algorithm: string;
  optimizationTarget: 'area' | 'accessibility' | 'fire' | 'flow';
  maxIterations: number;
  convergenceThreshold: number;
}

interface PlacementCandidate {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  score: number;
  type: string;
}

interface OptimizationMetrics {
  areaUtilization: number;
  accessibilityScore: number;
  fireComplianceScore: number;
  flowEfficiencyScore: number;
  overallScore: number;
}

export class IlotPlacementEngine {
  private settings: PlacementSettings = {
    corridorWidth: 120,
    minClearance: 80,
    algorithm: 'intelligent',
    optimizationTarget: 'area',
    maxIterations: 2000,
    convergenceThreshold: 0.001
  };

  private utils = new GeometricUtils();
  private placementHistory: PlacementCandidate[][] = [];
  private bestSolution: Ilot[] = [];
  private bestScore = 0;

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
    
    // Generate îlot size distribution based on real space planning principles
    const ilotSizes = this.generateOptimalIlotSizes(targetArea, floorPlan);
    
    // Select and execute placement algorithm
    switch (this.settings.algorithm) {
      case 'intelligent':
        await this.placeIlotsIntelligentAI(ilotSizes, ilots, floorPlan);
        break;
      case 'genetic':
        await this.placeIlotsGeneticAlgorithm(ilotSizes, ilots, floorPlan);
        break;
      case 'annealing':
        await this.placeIlotsSimulatedAnnealing(ilotSizes, ilots, floorPlan);
        break;
      case 'grid':
        await this.placeIlotsAdaptiveGrid(ilotSizes, ilots, floorPlan);
        break;
      default:
        await this.placeIlotsIntelligentAI(ilotSizes, ilots, floorPlan);
    }
    
    // Generate intelligent corridor network
    const corridors = this.generateIntelligentCorridors(ilots, floorPlan);
    
    return { ilots, corridors };
  }

  private generateOptimalIlotSizes(targetArea: number, floorPlan: ProcessedFloorPlan): IlotSize[] {
    const sizes: IlotSize[] = [];
    
    // Analyze space characteristics to determine optimal size distribution
    const spaceDepth = floorPlan.bounds.maxY - floorPlan.bounds.minY;
    const spaceWidth = floorPlan.bounds.maxX - floorPlan.bounds.minX;
    const aspectRatio = spaceWidth / spaceDepth;
    
    // Adaptive size definitions based on space characteristics
    const baseSizes: IlotSize[] = [
      { type: 'small', width: 60, height: 40, weight: 0.3, priority: 1 },
      { type: 'medium', width: 100, height: 60, weight: 0.4, priority: 2 },
      { type: 'large', width: 140, height: 80, weight: 0.2, priority: 3 },
      { type: 'xlarge', width: 180, height: 100, weight: 0.1, priority: 4 }
    ];
    
    // Adjust sizes based on space constraints
    baseSizes.forEach(def => {
      const adjustedSize = this.adjustSizeForSpace(def, floorPlan, aspectRatio);
      const count = Math.floor((targetArea * adjustedSize.weight) / 
                              ((adjustedSize.width * adjustedSize.height) / 10000));
      
      for (let i = 0; i < count; i++) {
        // Add intelligent size variation
        const variation = 0.1; // 10% variation
        sizes.push({
          ...adjustedSize,
          width: adjustedSize.width * (1 + (Math.random() - 0.5) * variation),
          height: adjustedSize.height * (1 + (Math.random() - 0.5) * variation)
        });
      }
    });
    
    return sizes.sort((a, b) => b.priority - a.priority);
  }

  private adjustSizeForSpace(size: IlotSize, floorPlan: ProcessedFloorPlan, aspectRatio: number): IlotSize {
    const adjusted = { ...size };
    
    // Adjust for narrow spaces
    if (aspectRatio > 3) {
      adjusted.width *= 1.2;
      adjusted.height *= 0.8;
    } else if (aspectRatio < 0.5) {
      adjusted.width *= 0.8;
      adjusted.height *= 1.2;
    }
    
    // Consider restricted areas
    const restrictedDensity = floorPlan.restrictedAreas.length / floorPlan.spaceAnalysis.usableArea;
    if (restrictedDensity > 0.1) {
      adjusted.width *= 0.9;
      adjusted.height *= 0.9;
    }
    
    return adjusted;
  }

  private async placeIlotsIntelligentAI(
    sizes: IlotSize[],
    ilots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): Promise<void> {
    const populationSize = 20;
    const generations = 50;
    
    // Initialize population with diverse placement strategies
    let population = this.initializeIntelligentPopulation(sizes, floorPlan, populationSize);
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness for all individuals
      const evaluatedPopulation = population.map(individual => ({
        individual,
        fitness: this.evaluateAdvancedFitness(individual, floorPlan)
      }));
      
      // Sort by fitness
      evaluatedPopulation.sort((a, b) => b.fitness.overallScore - a.fitness.overallScore);
      
      // Update best solution
      if (evaluatedPopulation[0].fitness.overallScore > this.bestScore) {
        this.bestScore = evaluatedPopulation[0].fitness.overallScore;
        this.bestSolution = [...evaluatedPopulation[0].individual];
      }
      
      // Create next generation
      const nextGeneration: Ilot[] = [];
      
      // Elitism: Keep best 20%
      const eliteCount = Math.floor(populationSize * 0.2);
      for (let i = 0; i < eliteCount; i++) {
        nextGeneration.push(...evaluatedPopulation[i].individual);
      }
      
      // Generate offspring through intelligent crossover and mutation
      while (nextGeneration.length < populationSize) {
        const parent1 = this.selectParent(evaluatedPopulation);
        const parent2 = this.selectParent(evaluatedPopulation);
        const offspring = this.intelligentCrossover(parent1, parent2, floorPlan);
        const mutated = this.intelligentMutation(offspring, floorPlan);
        nextGeneration.push(...mutated);
      }
      
      population = [nextGeneration.slice(0, populationSize)];
    }
    
    ilots.push(...this.bestSolution);
  }

  private initializeIntelligentPopulation(
    sizes: IlotSize[],
    floorPlan: ProcessedFloorPlan,
    populationSize: number
  ): Ilot[][] {
    const population: Ilot[][] = [];
    
    for (let i = 0; i < populationSize; i++) {
      const individual: Ilot[] = [];
      const strategy = i % 4; // Different placement strategies
      
      switch (strategy) {
        case 0: // Corner-first strategy
          this.placeFromCorners(sizes, individual, floorPlan);
          break;
        case 1: // Center-out strategy
          this.placeFromCenter(sizes, individual, floorPlan);
          break;
        case 2: // Wall-aligned strategy
          this.placeAlongWalls(sizes, individual, floorPlan);
          break;
        case 3: // Flow-optimized strategy
          this.placeForFlow(sizes, individual, floorPlan);
          break;
      }
      
      population.push(individual);
    }
    
    return population;
  }

  private placeFromCorners(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    const bounds = floorPlan.bounds;
    const corners = [
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY }
    ];
    
    let cornerIndex = 0;
    
    sizes.forEach((size, index) => {
      if (individual.length >= sizes.length * 0.8) return; // Limit placement
      
      const corner = corners[cornerIndex % corners.length];
      const candidate = this.createCandidateFromCorner(corner, size, bounds, cornerIndex);
      
      if (this.isValidPlacement(candidate, individual, floorPlan)) {
        individual.push(this.candidateToIlot(candidate, `ilot_corner_${index}`));
        cornerIndex++;
      }
    });
  }

  private placeFromCenter(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    const bounds = floorPlan.bounds;
    const center = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };
    
    // Create spiral placement pattern from center
    let radius = 50;
    let angle = 0;
    const angleIncrement = Math.PI / 6; // 30 degrees
    
    sizes.forEach((size, index) => {
      if (individual.length >= sizes.length * 0.8) return;
      
      const attempts = 12; // One full rotation
      for (let attempt = 0; attempt < attempts; attempt++) {
        const candidate = {
          x: center.x + radius * Math.cos(angle) - size.width / 2,
          y: center.y + radius * Math.sin(angle) - size.height / 2,
          width: size.width,
          height: size.height
        };
        
        if (this.isValidPlacement(candidate, individual, floorPlan)) {
          individual.push(this.candidateToIlot(candidate, `ilot_center_${index}`));
          break;
        }
        
        angle += angleIncrement;
        if (attempt === attempts - 1) {
          radius += 80; // Expand spiral
          angle = 0;
        }
      }
    });
  }

  private placeAlongWalls(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    const walls = floorPlan.walls;
    if (walls.length === 0) return;
    
    // Sort walls by length (longest first)
    const sortedWalls = [...walls].sort((a, b) => 
      this.calculateWallLength(b) - this.calculateWallLength(a)
    );
    
    let wallIndex = 0;
    
    sizes.forEach((size, index) => {
      if (individual.length >= sizes.length * 0.8 || wallIndex >= sortedWalls.length) return;
      
      const wall = sortedWalls[wallIndex];
      const candidate = this.placeAlongWall(wall, size, this.settings.minClearance);
      
      if (candidate && this.isValidPlacement(candidate, individual, floorPlan)) {
        individual.push(this.candidateToIlot(candidate, `ilot_wall_${index}`));
      } else {
        wallIndex++;
      }
    });
  }

  private placeForFlow(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    // Identify main circulation paths based on doors and space geometry
    const flowPaths = this.identifyFlowPaths(floorPlan);
    
    sizes.forEach((size, index) => {
      if (individual.length >= sizes.length * 0.8) return;
      
      // Find optimal position that maximizes accessibility while minimizing interference
      const candidate = this.findOptimalFlowPosition(size, flowPaths, individual, floorPlan);
      
      if (candidate && this.isValidPlacement(candidate, individual, floorPlan)) {
        individual.push(this.candidateToIlot(candidate, `ilot_flow_${index}`));
      }
    });
  }

  private evaluateAdvancedFitness(ilots: Ilot[], floorPlan: ProcessedFloorPlan): OptimizationMetrics {
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const usableArea = floorPlan.spaceAnalysis.usableArea;
    
    // Area utilization (0-1)
    const areaUtilization = Math.min(totalIlotArea / usableArea, 1);
    
    // Accessibility score based on corridor connectivity
    const accessibilityScore = this.calculateAccessibilityScore(ilots, floorPlan);
    
    // Fire safety compliance score
    const fireComplianceScore = this.calculateFireComplianceScore(ilots, floorPlan);
    
    // Flow efficiency score
    const flowEfficiencyScore = this.calculateFlowEfficiencyScore(ilots, floorPlan);
    
    // Weighted overall score based on optimization target
    const weights = this.getOptimizationWeights();
    const overallScore = 
      areaUtilization * weights.area +
      accessibilityScore * weights.accessibility +
      fireComplianceScore * weights.fire +
      flowEfficiencyScore * weights.flow;
    
    return {
      areaUtilization,
      accessibilityScore,
      fireComplianceScore,
      flowEfficiencyScore,
      overallScore
    };
  }

  private calculateAccessibilityScore(ilots: Ilot[], floorPlan: ProcessedFloorPlan): number {
    if (ilots.length === 0) return 0;
    
    let totalAccessibility = 0;
    
    ilots.forEach(ilot => {
      // Check accessibility to doors
      const doorAccessibility = this.calculateDoorAccessibility(ilot, floorPlan.doors);
      
      // Check accessibility to other îlots
      const ilotAccessibility = this.calculateIlotAccessibility(ilot, ilots);
      
      // Check corridor connectivity
      const corridorAccessibility = this.calculateCorridorAccessibility(ilot, ilots);
      
      totalAccessibility += (doorAccessibility + ilotAccessibility + corridorAccessibility) / 3;
    });
    
    return totalAccessibility / ilots.length;
  }

  private calculateFireComplianceScore(ilots: Ilot[], floorPlan: ProcessedFloorPlan): number {
    const minCorridorWidth = 120; // cm
    const maxEgressDistance = 3000; // 30m in cm
    const minClearance = this.settings.minClearance;
    
    let complianceScore = 0;
    let totalChecks = 0;
    
    // Check egress distances
    ilots.forEach(ilot => {
      totalChecks++;
      const minDistanceToDoor = Math.min(...floorPlan.doors.map(door => 
        this.utils.distanceFromPointToRectangle(door.center, ilot)
      ));
      
      if (minDistanceToDoor <= maxEgressDistance) {
        complianceScore++;
      }
    });
    
    // Check corridor widths
    const corridors = this.generateIntelligentCorridors(ilots, floorPlan);
    corridors.forEach(corridor => {
      totalChecks++;
      if (corridor.width >= minCorridorWidth) {
        complianceScore++;
      }
    });
    
    // Check clearances
    ilots.forEach(ilot => {
      totalChecks++;
      let hasAdequateClearance = true;
      
      // Check clearance to walls
      floorPlan.walls.forEach(wall => {
        wall.points.forEach(point => {
          const distance = this.utils.distanceFromPointToRectangle(point, ilot);
          if (distance < minClearance) {
            hasAdequateClearance = false;
          }
        });
      });
      
      if (hasAdequateClearance) {
        complianceScore++;
      }
    });
    
    return totalChecks > 0 ? complianceScore / totalChecks : 0;
  }

  private calculateFlowEfficiencyScore(ilots: Ilot[], floorPlan: ProcessedFloorPlan): number {
    const flowPaths = this.identifyFlowPaths(floorPlan);
    let totalInterference = 0;
    let pathCount = 0;
    
    flowPaths.forEach(path => {
      pathCount++;
      let pathInterference = 0;
      
      ilots.forEach(ilot => {
        const interference = this.calculatePathInterference(path, ilot);
        pathInterference += interference;
      });
      
      totalInterference += pathInterference;
    });
    
    // Score is inversely related to interference
    return pathCount > 0 ? Math.max(0, 1 - (totalInterference / pathCount)) : 1;
  }

  private getOptimizationWeights(): { area: number; accessibility: number; fire: number; flow: number } {
    switch (this.settings.optimizationTarget) {
      case 'area':
        return { area: 0.5, accessibility: 0.2, fire: 0.2, flow: 0.1 };
      case 'accessibility':
        return { area: 0.2, accessibility: 0.5, fire: 0.2, flow: 0.1 };
      case 'fire':
        return { area: 0.2, accessibility: 0.2, fire: 0.5, flow: 0.1 };
      case 'flow':
        return { area: 0.2, accessibility: 0.2, fire: 0.1, flow: 0.5 };
      default:
        return { area: 0.25, accessibility: 0.25, fire: 0.25, flow: 0.25 };
    }
  }

  private generateIntelligentCorridors(ilots: Ilot[], floorPlan: ProcessedFloorPlan): Corridor[] {
    const corridors: Corridor[] = [];
    
    // Generate primary circulation spine
    const primarySpine = this.generatePrimaryCirculationSpine(ilots, floorPlan);
    if (primarySpine) corridors.push(primarySpine);
    
    // Generate secondary corridors between îlot clusters
    const clusters = this.clusterIlots(ilots);
    clusters.forEach((cluster, index) => {
      const clusterCorridors = this.generateClusterCorridors(cluster, index);
      corridors.push(...clusterCorridors);
    });
    
    // Generate connection corridors to doors
    floorPlan.doors.forEach(door => {
      const connectionCorridor = this.generateDoorConnectionCorridor(door, ilots);
      if (connectionCorridor) corridors.push(connectionCorridor);
    });
    
    return this.optimizeCorridorNetwork(corridors);
  }

  private generatePrimaryCirculationSpine(ilots: Ilot[], floorPlan: ProcessedFloorPlan): Corridor | null {
    if (ilots.length < 2) return null;
    
    // Find the longest clear path through the space
    const bounds = floorPlan.bounds;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    // Calculate optimal spine position to maximize accessibility
    let optimalY = centerY;
    let maxAccessibility = 0;
    
    for (let y = bounds.minY + 100; y < bounds.maxY - 100; y += 20) {
      const accessibility = this.calculateSpineAccessibility(y, ilots);
      if (accessibility > maxAccessibility) {
        maxAccessibility = accessibility;
        optimalY = y;
      }
    }
    
    return {
      id: `primary_spine_${Date.now()}`,
      x1: bounds.minX + 50,
      y1: optimalY,
      x2: bounds.maxX - 50,
      y2: optimalY,
      width: this.settings.corridorWidth,
      type: 'horizontal'
    };
  }

  private calculateSpineAccessibility(y: number, ilots: Ilot[]): number {
    let accessibility = 0;
    
    ilots.forEach(ilot => {
      const distance = Math.abs(ilot.y + ilot.height / 2 - y);
      accessibility += 1 / (1 + distance / 100); // Inverse distance relationship
    });
    
    return accessibility;
  }

  private clusterIlots(ilots: Ilot[]): Ilot[][] {
    const clusters: Ilot[][] = [];
    const processed = new Set<string>();
    const clusterRadius = 200; // Maximum distance for clustering
    
    ilots.forEach(ilot => {
      if (processed.has(ilot.id)) return;
      
      const cluster = [ilot];
      processed.add(ilot.id);
      
      // Find nearby îlots
      ilots.forEach(otherIlot => {
        if (processed.has(otherIlot.id)) return;
        
        const distance = this.utils.distanceBetweenPoints(
          this.utils.rectangleCenter(ilot),
          this.utils.rectangleCenter(otherIlot)
        );
        
        if (distance <= clusterRadius) {
          cluster.push(otherIlot);
          processed.add(otherIlot.id);
        }
      });
      
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    });
    
    return clusters;
  }

  // Additional utility methods...
  private calculateWallLength(wall: any): number {
    if (wall.points && wall.points.length >= 2) {
      let length = 0;
      for (let i = 1; i < wall.points.length; i++) {
        length += this.utils.distanceBetweenPoints(wall.points[i - 1], wall.points[i]);
      }
      return length;
    }
    return 0;
  }

  private createCandidateFromCorner(corner: any, size: IlotSize, bounds: any, cornerIndex: number): any {
    const margin = this.settings.minClearance;
    
    switch (cornerIndex % 4) {
      case 0: // Bottom-left
        return { x: corner.x + margin, y: corner.y + margin, width: size.width, height: size.height };
      case 1: // Bottom-right
        return { x: corner.x - size.width - margin, y: corner.y + margin, width: size.width, height: size.height };
      case 2: // Top-right
        return { x: corner.x - size.width - margin, y: corner.y - size.height - margin, width: size.width, height: size.height };
      case 3: // Top-left
        return { x: corner.x + margin, y: corner.y - size.height - margin, width: size.width, height: size.height };
      default:
        return { x: corner.x, y: corner.y, width: size.width, height: size.height };
    }
  }

  private candidateToIlot(candidate: any, id: string): Ilot {
    return {
      id,
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
      area: (candidate.width * candidate.height) / 10000,
      type: candidate.type || 'medium'
    };
  }

  private isValidPlacement(candidate: Rectangle, existingIlots: Ilot[], floorPlan: ProcessedFloorPlan): boolean {
    // Check bounds
    const bounds = floorPlan.bounds;
    if (candidate.x < bounds.minX || candidate.x + candidate.width > bounds.maxX ||
        candidate.y < bounds.minY || candidate.y + candidate.height > bounds.maxY) {
      return false;
    }

    // Check overlaps with existing îlots
    for (const existing of existingIlots) {
      if (this.utils.rectanglesOverlap(candidate, existing, this.settings.minClearance)) {
        return false;
      }
    }

    // Check restricted areas
    for (const restricted of floorPlan.restrictedAreas) {
      if (this.utils.rectanglesOverlap(candidate, restricted.bounds, this.settings.minClearance)) {
        return false;
      }
    }

    // Check door clearances
    for (const door of floorPlan.doors) {
      const distance = this.utils.distanceFromPointToRectangle(door.center, candidate);
      if (distance < door.radius + this.settings.minClearance) {
        return false;
      }
    }

    return true;
  }

  // Placeholder methods for advanced algorithms (would be fully implemented)
  private async placeIlotsGeneticAlgorithm(sizes: IlotSize[], ilots: Ilot[], floorPlan: ProcessedFloorPlan): Promise<void> {
    // Full genetic algorithm implementation would go here
    await this.placeIlotsIntelligentAI(sizes, ilots, floorPlan);
  }

  private async placeIlotsSimulatedAnnealing(sizes: IlotSize[], ilots: Ilot[], floorPlan: ProcessedFloorPlan): Promise<void> {
    // Full simulated annealing implementation would go here
    await this.placeIlotsIntelligentAI(sizes, ilots, floorPlan);
  }

  private async placeIlotsAdaptiveGrid(sizes: IlotSize[], ilots: Ilot[], floorPlan: ProcessedFloorPlan): Promise<void> {
    // Adaptive grid algorithm would go here
    await this.placeIlotsIntelligentAI(sizes, ilots, floorPlan);
  }

  // Additional placeholder methods for complete implementation
  private selectParent(population: any[]): Ilot[] { return population[0].individual; }
  private intelligentCrossover(parent1: Ilot[], parent2: Ilot[], floorPlan: ProcessedFloorPlan): Ilot[] { return parent1; }
  private intelligentMutation(individual: Ilot[], floorPlan: ProcessedFloorPlan): Ilot[] { return individual; }
  private identifyFlowPaths(floorPlan: ProcessedFloorPlan): any[] { return []; }
  private findOptimalFlowPosition(size: IlotSize, paths: any[], existing: Ilot[], floorPlan: ProcessedFloorPlan): any { return null; }
  private placeAlongWall(wall: any, size: IlotSize, clearance: number): any { return null; }
  private calculateDoorAccessibility(ilot: Ilot, doors: any[]): number { return 1; }
  private calculateIlotAccessibility(ilot: Ilot, ilots: Ilot[]): number { return 1; }
  private calculateCorridorAccessibility(ilot: Ilot, ilots: Ilot[]): number { return 1; }
  private calculatePathInterference(path: any, ilot: Ilot): number { return 0; }
  private generateClusterCorridors(cluster: Ilot[], index: number): Corridor[] { return []; }
  private generateDoorConnectionCorridor(door: any, ilots: Ilot[]): Corridor | null { return null; }
  private optimizeCorridorNetwork(corridors: Corridor[]): Corridor[] { return corridors; }
}
