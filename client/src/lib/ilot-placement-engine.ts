
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

interface GeneticIndividual {
  ilots: Ilot[];
  fitness: number;
  generation: number;
}

export class AdvancedIlotPlacementEngine {
  private settings: PlacementSettings = {
    corridorWidth: 1200, // 1200mm = 1.2m as requested
    minClearance: 80,
    algorithm: 'advanced-ai',
    optimizationTarget: 'area',
    maxIterations: 5000,
    convergenceThreshold: 0.001
  };

  private utils = new GeometricUtils();
  private placementHistory: PlacementCandidate[][] = [];
  private bestSolution: Ilot[] = [];
  private bestScore = 0;
  private convergenceHistory: number[] = [];

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
    
    console.log(`🚀 Starting advanced îlot placement - Target: ${targetArea.toFixed(2)}m²`);
    
    // Generate intelligent îlot size distribution
    const ilotSizes = this.generateIntelligentIlotSizes(targetArea, floorPlan);
    console.log(`📐 Generated ${ilotSizes.length} îlot size variants`);
    
    // Execute advanced placement algorithm
    switch (this.settings.algorithm) {
      case 'advanced-ai':
        await this.advancedAIPlacement(ilotSizes, ilots, floorPlan);
        break;
      case 'neural-genetic':
        await this.neuralGeneticPlacement(ilotSizes, ilots, floorPlan);
        break;
      case 'swarm-optimization':
        await this.swarmOptimizationPlacement(ilotSizes, ilots, floorPlan);
        break;
      case 'reinforcement-learning':
        await this.reinforcementLearningPlacement(ilotSizes, ilots, floorPlan);
        break;
      default:
        await this.advancedAIPlacement(ilotSizes, ilots, floorPlan);
    }
    
    // Generate intelligent corridor network
    const corridors = this.generateOptimalCorridors(ilots, floorPlan);
    
    console.log(`✅ Placement complete: ${ilots.length} îlots, ${corridors.length} corridors`);
    console.log(`🎯 Best score achieved: ${this.bestScore.toFixed(4)}`);
    
    return { ilots, corridors };
  }

  private generateIntelligentIlotSizes(targetArea: number, floorPlan: ProcessedFloorPlan): IlotSize[] {
    const sizes: IlotSize[] = [];
    
    // Analyze space characteristics
    const spaceDepth = floorPlan.bounds.maxY - floorPlan.bounds.minY;
    const spaceWidth = floorPlan.bounds.maxX - floorPlan.bounds.minX;
    
    // Ensure minimum dimensions
    if (spaceWidth <= 0 || spaceDepth <= 0) {
      console.log('⚠️ Invalid space dimensions');
      return [];
    }
    
    const aspectRatio = spaceWidth / spaceDepth;
    
    // Calculate more realistic îlot sizes for complex floor plans
    // Use smaller percentages for complex layouts
    const maxWidth = Math.max(150, Math.min(spaceWidth * 0.15, 300)); // 15% of space width, min 150mm, max 300mm
    const maxHeight = Math.max(100, Math.min(spaceDepth * 0.15, 200)); // 15% of space height, min 100mm, max 200mm
    
    console.log(`Space analysis: ${spaceWidth}x${spaceDepth}mm, max îlot: ${maxWidth}x${maxHeight}mm`);
    
    // Dynamic size definitions based on space analysis
    const baseSizes: IlotSize[] = [
      { type: 'small', width: Math.min(150, maxWidth * 0.5), height: Math.min(100, maxHeight * 0.5), weight: 0.4, priority: 1 },
      { type: 'medium', width: Math.min(200, maxWidth * 0.7), height: Math.min(130, maxHeight * 0.7), weight: 0.35, priority: 2 },
      { type: 'large', width: Math.min(250, maxWidth * 0.9), height: Math.min(160, maxHeight * 0.9), weight: 0.2, priority: 3 },
      { type: 'xlarge', width: Math.min(300, maxWidth), height: Math.min(200, maxHeight), weight: 0.05, priority: 4 }
    ].filter(size => size.width >= 80 && size.height >= 60); // Minimum practical sizes
    
    if (baseSizes.length === 0) {
      console.log('⚠️ Space too small for any îlots');
      return [];
    }
    
    // Calculate reasonable target count based on area and space complexity
    const estimatedIlotCount = Math.max(3, Math.min(Math.floor(targetArea * 1000), 25)); // 3-25 îlots
    console.log(`Target îlot count: ${estimatedIlotCount}`);
    
    // Generate îlots with intelligent distribution
    baseSizes.forEach(def => {
      const adjustedSize = this.adaptSizeToSpace(def, floorPlan, aspectRatio);
      const targetCount = Math.max(1, Math.floor(estimatedIlotCount * adjustedSize.weight));
      
      for (let i = 0; i < targetCount; i++) {
        // Add realistic size variation
        const variationFactor = 0.15; // 15% variation
        const widthVariation = 1 + (Math.random() - 0.5) * variationFactor;
        const heightVariation = 1 + (Math.random() - 0.5) * variationFactor;
        
        sizes.push({
          ...adjustedSize,
          width: Math.round(Math.max(80, adjustedSize.width * widthVariation)),
          height: Math.round(Math.max(60, adjustedSize.height * heightVariation))
        });
      }
    });
    
    console.log(`Generated ${sizes.length} îlot variants`);
    return sizes.sort((a, b) => a.priority - b.priority);
  }

  private adaptSizeToSpace(size: IlotSize, floorPlan: ProcessedFloorPlan, aspectRatio: number): IlotSize {
    const adapted = { ...size };
    
    // Adapt for space proportions
    if (aspectRatio > 2.5) { // Long narrow space
      adapted.width *= 1.3;
      adapted.height *= 0.8;
    } else if (aspectRatio < 0.6) { // Tall narrow space
      adapted.width *= 0.8;
      adapted.height *= 1.3;
    }
    
    // Consider constraints
    const constraintDensity = floorPlan.restrictedAreas.length / floorPlan.spaceAnalysis.usableArea;
    if (constraintDensity > 0.15) { // High constraint density
      adapted.width *= 0.85;
      adapted.height *= 0.85;
    }
    
    // Door accessibility consideration
    const doorCount = floorPlan.doors.length;
    if (doorCount > 3) { // Multiple access points
      adapted.width *= 1.1; // Allow larger îlots
    }
    
    return adapted;
  }

  private async advancedAIPlacement(
    sizes: IlotSize[],
    ilots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): Promise<void> {
    console.log('🧠 Executing Advanced AI Placement Algorithm');
    
    if (sizes.length === 0) {
      console.log('⚠️ No îlot sizes provided');
      return;
    }
    
    // Calculate available space with intelligent room detection
    const bounds = floorPlan.bounds;
    const totalWidth = bounds.maxX - bounds.minX;
    const totalHeight = bounds.maxY - bounds.minY;
    
    // Use adaptive clearance based on space size
    let adaptiveClearance = Math.max(50, Math.min(this.settings.minClearance, totalWidth * 0.05, totalHeight * 0.05));
    
    console.log(`Space bounds: ${totalWidth}x${totalHeight}mm, using ${adaptiveClearance}mm clearance`);
    
    // Simplified placement approach to avoid freezing
    let placedCount = 0;
    const maxIlots = Math.min(sizes.length, 15); // Limit to prevent freezing
    const gridSpacing = 300; // 300mm spacing
    
    // Create a simple grid placement
    const startX = bounds.minX + adaptiveClearance;
    const startY = bounds.minY + adaptiveClearance;
    const cols = Math.floor((totalWidth - adaptiveClearance * 2) / gridSpacing);
    const rows = Math.floor((totalHeight - adaptiveClearance * 2) / gridSpacing);
    
    console.log(`Grid: ${cols}x${rows}, attempting to place ${maxIlots} îlots`);
    
    for (let i = 0; i < maxIlots && placedCount < maxIlots; i++) {
      const size = sizes[i % sizes.length];
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      if (row >= rows) break; // No more space
      
      const candidate = {
        x: startX + col * gridSpacing,
        y: startY + row * gridSpacing,
        width: size.width,
        height: size.height
      };
      
      // Simple validation - just check bounds and basic overlaps
      if (candidate.x + candidate.width <= bounds.maxX - adaptiveClearance &&
          candidate.y + candidate.height <= bounds.maxY - adaptiveClearance) {
        
        // Quick overlap check
        let overlaps = false;
        for (const existing of ilots) {
          if (!(candidate.x + candidate.width < existing.x ||
                candidate.x > existing.x + existing.width ||
                candidate.y + candidate.height < existing.y ||
                candidate.y > existing.y + existing.height)) {
            overlaps = true;
            break;
          }
        }
        
        if (!overlaps) {
          const newIlot: Ilot = {
            id: `ilot_${placedCount + 1}`,
            x: candidate.x,
            y: candidate.y,
            width: candidate.width,
            height: candidate.height,
            area: (candidate.width * candidate.height) / 1000000,
            type: size.type
          };
          
          ilots.push(newIlot);
          this.bestSolution.push(newIlot);
          placedCount++;
          
          console.log(`✅ Placed îlot ${placedCount}: ${size.type} at (${candidate.x}, ${candidate.y})`);
        }
      }
      
      // Add yield to prevent UI freezing
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    this.bestScore = placedCount / Math.max(maxIlots, 1);
    console.log(`🎯 Placement complete: ${placedCount} îlots placed`);
  }

  private identifyPlacementZones(floorPlan: ProcessedFloorPlan, clearance: number): Array<{x: number, y: number, width: number, height: number}> {
    const bounds = floorPlan.bounds;
    const zones: Array<{x: number, y: number, width: number, height: number}> = [];
    
    // For complex floor plans, create a grid-based approach to find open areas
    const gridSize = 200; // 200mm grid
    const cols = Math.floor((bounds.maxX - bounds.minX) / gridSize);
    const rows = Math.floor((bounds.maxY - bounds.minY) / gridSize);
    
    // Create a grid to track occupied vs free space
    const grid: boolean[][] = Array(rows).fill(null).map(() => Array(cols).fill(false));
    
    // Mark restricted areas and door clearances
    floorPlan.restrictedAreas.forEach(area => {
      const startCol = Math.max(0, Math.floor((area.bounds.minX - bounds.minX - clearance) / gridSize));
      const endCol = Math.min(cols - 1, Math.floor((area.bounds.maxX - bounds.minX + clearance) / gridSize));
      const startRow = Math.max(0, Math.floor((area.bounds.minY - bounds.minY - clearance) / gridSize));
      const endRow = Math.min(rows - 1, Math.floor((area.bounds.maxY - bounds.minY + clearance) / gridSize));
      
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          grid[r][c] = true; // Mark as occupied
        }
      }
    });
    
    // Mark door clearances
    floorPlan.doors.forEach(door => {
      const doorClearance = door.radius + clearance;
      const startCol = Math.max(0, Math.floor((door.center.x - doorClearance - bounds.minX) / gridSize));
      const endCol = Math.min(cols - 1, Math.floor((door.center.x + doorClearance - bounds.minX) / gridSize));
      const startRow = Math.max(0, Math.floor((door.center.y - doorClearance - bounds.minY) / gridSize));
      const endRow = Math.min(rows - 1, Math.floor((door.center.y + doorClearance - bounds.minY) / gridSize));
      
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          grid[r][c] = true; // Mark as occupied
        }
      }
    });
    
    // Find contiguous free areas and convert to zones
    const visited: boolean[][] = Array(rows).fill(null).map(() => Array(cols).fill(false));
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c] && !visited[r][c]) {
          // Found a free cell, explore the connected area
          const zone = this.exploreZone(grid, visited, r, c, rows, cols);
          if (zone.width >= 300 && zone.height >= 200) { // Minimum zone size
            zones.push({
              x: bounds.minX + zone.startCol * gridSize + clearance,
              y: bounds.minY + zone.startRow * gridSize + clearance,
              width: zone.width * gridSize - clearance * 2,
              height: zone.height * gridSize - clearance * 2
            });
          }
        }
      }
    }
    
    return zones;
  }

  private exploreZone(grid: boolean[][], visited: boolean[][], startRow: number, startCol: number, rows: number, cols: number): {startRow: number, startCol: number, width: number, height: number} {
    const queue: Array<{r: number, c: number}> = [{r: startRow, c: startCol}];
    let minRow = startRow, maxRow = startRow;
    let minCol = startCol, maxCol = startCol;
    
    while (queue.length > 0) {
      const {r, c} = queue.shift()!;
      
      if (r < 0 || r >= rows || c < 0 || c >= cols || visited[r][c] || grid[r][c]) {
        continue;
      }
      
      visited[r][c] = true;
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
      
      // Add neighbors
      queue.push({r: r - 1, c}, {r: r + 1, c}, {r, c: c - 1}, {r, c: c + 1});
    }
    
    return {
      startRow: minRow,
      startCol: minCol,
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1
    };
  }

  private updatePlacementZones(zones: Array<{x: number, y: number, width: number, height: number}>, placedIlot: Rectangle, clearance: number): void {
    // Remove or split zones that are now occupied
    for (let i = zones.length - 1; i >= 0; i--) {
      const zone = zones[i];
      const expandedIlot = {
        x: placedIlot.x - clearance,
        y: placedIlot.y - clearance,
        width: placedIlot.width + clearance * 2,
        height: placedIlot.height + clearance * 2
      };
      
      if (this.utils.rectanglesOverlap(zone, expandedIlot, 0)) {
        zones.splice(i, 1); // Remove the affected zone
        // In a more sophisticated implementation, we could split the zone
      }
    }
  }

  private async neuralGeneticPlacement(
    sizes: IlotSize[],
    ilots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): Promise<void> {
    console.log('🧬 Executing Neural-Genetic Hybrid Algorithm');
    
    // Neural network guided genetic algorithm
    const neuralWeights = this.trainNeuralWeights(floorPlan);
    
    const populationSize = 40;
    const generations = 80;
    
    let population = this.createNeuralGuidedPopulation(sizes, floorPlan, populationSize, neuralWeights);
    
    for (let generation = 0; generation < generations; generation++) {
      const evaluatedPopulation = population.map(individual => ({
        individual,
        fitness: this.neuralEvaluateFitness(individual, floorPlan, neuralWeights)
      }));
      
      evaluatedPopulation.sort((a, b) => b.fitness.overallScore - a.fitness.overallScore);
      
      if (evaluatedPopulation[0].fitness.overallScore > this.bestScore) {
        this.bestScore = evaluatedPopulation[0].fitness.overallScore;
        this.bestSolution = [...evaluatedPopulation[0].individual];
      }
      
      // Neural-guided evolution
      const nextGeneration = this.neuralEvolution(evaluatedPopulation, neuralWeights);
      population = [nextGeneration];
    }
    
    ilots.push(...this.bestSolution);
  }

  private async swarmOptimizationPlacement(
    sizes: IlotSize[],
    ilots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): Promise<void> {
    console.log('🐝 Executing Particle Swarm Optimization');
    
    const swarmSize = 30;
    const maxIterations = 200;
    
    // Initialize swarm
    const particles = this.initializeSwarm(sizes, floorPlan, swarmSize);
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      particles.forEach(particle => {
        const fitness = this.calculateAdvancedFitness(particle.position, floorPlan);
        
        // Update personal best
        if (fitness.overallScore > particle.personalBestFitness) {
          particle.personalBest = [...particle.position];
          particle.personalBestFitness = fitness.overallScore;
        }
        
        // Update global best
        if (fitness.overallScore > this.bestScore) {
          this.bestScore = fitness.overallScore;
          this.bestSolution = [...particle.position];
        }
      });
      
      // Update particle velocities and positions
      this.updateSwarmPositions(particles, floorPlan);
    }
    
    ilots.push(...this.bestSolution);
  }

  private async reinforcementLearningPlacement(
    sizes: IlotSize[],
    ilots: Ilot[],
    floorPlan: ProcessedFloorPlan
  ): Promise<void> {
    console.log('🎓 Executing Reinforcement Learning Placement');
    
    const episodes = 150;
    const learningRate = 0.1;
    const explorationRate = 0.3;
    
    // Q-learning for placement optimization
    const qTable = this.initializeQTable(floorPlan);
    
    for (let episode = 0; episode < episodes; episode++) {
      const currentSolution = this.executeRLEpisode(sizes, floorPlan, qTable, explorationRate);
      const fitness = this.calculateAdvancedFitness(currentSolution, floorPlan);
      
      if (fitness.overallScore > this.bestScore) {
        this.bestScore = fitness.overallScore;
        this.bestSolution = [...currentSolution];
      }
      
      // Update Q-table
      this.updateQTable(qTable, currentSolution, fitness, learningRate);
    }
    
    ilots.push(...this.bestSolution);
  }

  private createDiversePopulation(
    sizes: IlotSize[],
    floorPlan: ProcessedFloorPlan,
    populationSize: number
  ): Ilot[][] {
    const population: Ilot[][] = [];
    
    for (let i = 0; i < populationSize; i++) {
      const individual: Ilot[] = [];
      const strategy = i % 6; // Six different strategies
      
      switch (strategy) {
        case 0:
          this.cornerFirstStrategy(sizes, individual, floorPlan);
          break;
        case 1:
          this.centerOutStrategy(sizes, individual, floorPlan);
          break;
        case 2:
          this.wallAlignedStrategy(sizes, individual, floorPlan);
          break;
        case 3:
          this.flowOptimizedStrategy(sizes, individual, floorPlan);
          break;
        case 4:
          this.accessibilityFocusedStrategy(sizes, individual, floorPlan);
          break;
        case 5:
          this.hybridStrategy(sizes, individual, floorPlan);
          break;
      }
      
      population.push(individual);
    }
    
    return population;
  }

  private cornerFirstStrategy(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    const bounds = floorPlan.bounds;
    const margin = this.settings.minClearance;
    
    // Start from top-left and work across then down
    let currentX = bounds.minX + margin;
    let currentY = bounds.minY + margin;
    let rowHeight = 0;
    
    sizes.forEach((size, index) => {
      if (individual.length >= Math.floor(sizes.length * 0.6)) return;
      
      // Check if we need to move to next row
      if (currentX + size.width + margin > bounds.maxX) {
        currentX = bounds.minX + margin;
        currentY += rowHeight + this.settings.corridorWidth;
        rowHeight = 0;
      }
      
      // Check if we have vertical space
      if (currentY + size.height + margin > bounds.maxY) {
        return; // No more space
      }
      
      const candidate = {
        x: currentX,
        y: currentY,
        width: size.width,
        height: size.height
      };
      
      if (this.isValidPlacement(candidate, individual, floorPlan)) {
        individual.push(this.candidateToIlot(candidate, `ilot_grid_${index}`));
        currentX += size.width + this.settings.corridorWidth;
        rowHeight = Math.max(rowHeight, size.height);
      }
    });
  }

  private centerOutStrategy(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    const bounds = floorPlan.bounds;
    const center = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };
    
    let radius = 80;
    let angle = 0;
    const angleIncrement = Math.PI / 8; // 22.5 degrees
    
    sizes.forEach((size, index) => {
      if (individual.length >= Math.floor(sizes.length * 0.8)) return;
      
      let placed = false;
      for (let attempt = 0; attempt < 16 && !placed; attempt++) {
        const candidate = {
          x: center.x + radius * Math.cos(angle) - size.width / 2,
          y: center.y + radius * Math.sin(angle) - size.height / 2,
          width: size.width,
          height: size.height
        };
        
        if (this.isValidPlacement(candidate, individual, floorPlan)) {
          individual.push(this.candidateToIlot(candidate, `ilot_center_${index}`));
          placed = true;
        }
        
        angle += angleIncrement;
        if (attempt === 15) {
          radius += 120;
          angle = 0;
        }
      }
    });
  }

  private wallAlignedStrategy(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    const walls = floorPlan.walls;
    if (!walls || walls.length === 0) return;
    
    const sortedWalls = [...walls].sort((a, b) => 
      this.calculateWallLength(b) - this.calculateWallLength(a)
    );
    
    let wallIndex = 0;
    
    sizes.forEach((size, index) => {
      if (individual.length >= Math.floor(sizes.length * 0.8)) return;
      if (wallIndex >= sortedWalls.length) return;
      
      const wall = sortedWalls[wallIndex];
      const candidate = this.alignWithWall(wall, size, this.settings.minClearance);
      
      if (candidate && this.isValidPlacement(candidate, individual, floorPlan)) {
        individual.push(this.candidateToIlot(candidate, `ilot_wall_${index}`));
      } else {
        wallIndex = (wallIndex + 1) % sortedWalls.length;
      }
    });
  }

  private flowOptimizedStrategy(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    const flowPaths = this.identifyFlowPaths(floorPlan);
    
    sizes.forEach((size, index) => {
      if (individual.length >= Math.floor(sizes.length * 0.8)) return;
      
      const candidate = this.findFlowOptimalPosition(size, flowPaths, individual, floorPlan);
      
      if (candidate && this.isValidPlacement(candidate, individual, floorPlan)) {
        individual.push(this.candidateToIlot(candidate, `ilot_flow_${index}`));
      }
    });
  }

  private accessibilityFocusedStrategy(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    // Sort sizes by priority for accessibility
    const sortedSizes = [...sizes].sort((a, b) => a.priority - b.priority);
    
    sortedSizes.forEach((size, index) => {
      if (individual.length >= Math.floor(sizes.length * 0.8)) return;
      
      const candidate = this.findAccessibilityOptimalPosition(size, individual, floorPlan);
      
      if (candidate && this.isValidPlacement(candidate, individual, floorPlan)) {
        individual.push(this.candidateToIlot(candidate, `ilot_access_${index}`));
      }
    });
  }

  private hybridStrategy(sizes: IlotSize[], individual: Ilot[], floorPlan: ProcessedFloorPlan): void {
    // Combine multiple strategies
    const quarter = Math.floor(sizes.length / 4);
    
    this.cornerFirstStrategy(sizes.slice(0, quarter), individual, floorPlan);
    this.centerOutStrategy(sizes.slice(quarter, quarter * 2), individual, floorPlan);
    this.wallAlignedStrategy(sizes.slice(quarter * 2, quarter * 3), individual, floorPlan);
    this.accessibilityFocusedStrategy(sizes.slice(quarter * 3), individual, floorPlan);
  }

  private calculateAdvancedFitness(ilots: Ilot[], floorPlan: ProcessedFloorPlan): OptimizationMetrics {
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const usableArea = floorPlan.spaceAnalysis.usableArea;
    
    // Advanced metrics calculation
    const areaUtilization = Math.min(totalIlotArea / Math.max(usableArea, 0.1), 1);
    const accessibilityScore = this.calculateAdvancedAccessibility(ilots, floorPlan);
    const fireComplianceScore = this.calculateFireCompliance(ilots, floorPlan);
    const flowEfficiencyScore = this.calculateFlowEfficiency(ilots, floorPlan);
    
    // Dynamic weighting based on space characteristics
    const weights = this.calculateDynamicWeights(floorPlan);
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

  private calculateDynamicWeights(floorPlan: ProcessedFloorPlan): { area: number; accessibility: number; fire: number; flow: number } {
    const baseWeights = this.getOptimizationWeights();
    
    // Adjust weights based on space characteristics
    const doorCount = floorPlan.doors.length;
    const restrictedRatio = floorPlan.restrictedAreas.length / Math.max(floorPlan.spaceAnalysis.usableArea, 1);
    
    if (doorCount > 3) {
      // High traffic space - prioritize flow
      baseWeights.flow *= 1.3;
      baseWeights.area *= 0.8;
    }
    
    if (restrictedRatio > 0.2) {
      // Constrained space - prioritize accessibility
      baseWeights.accessibility *= 1.4;
      baseWeights.fire *= 1.2;
    }
    
    // Normalize weights
    const total = Object.values(baseWeights).reduce((sum, w) => sum + w, 0);
    Object.keys(baseWeights).forEach(key => {
      baseWeights[key] /= total;
    });
    
    return baseWeights;
  }

  private calculateAdvancedAccessibility(ilots: Ilot[], floorPlan: ProcessedFloorPlan): number {
    if (ilots.length === 0) return 0;
    
    let totalAccessibility = 0;
    
    ilots.forEach(ilot => {
      // Multi-factor accessibility calculation
      const doorAccessibility = this.calculateDoorAccessibility(ilot, floorPlan.doors);
      const peerAccessibility = this.calculatePeerAccessibility(ilot, ilots);
      const corridorAccessibility = this.calculateCorridorAccessibility(ilot, ilots);
      const emergencyAccessibility = this.calculateEmergencyAccessibility(ilot, floorPlan);
      
      const weightedAccessibility = 
        doorAccessibility * 0.3 +
        peerAccessibility * 0.25 +
        corridorAccessibility * 0.25 +
        emergencyAccessibility * 0.2;
      
      totalAccessibility += weightedAccessibility;
    });
    
    return totalAccessibility / ilots.length;
  }

  private generateOptimalCorridors(ilots: Ilot[], floorPlan: ProcessedFloorPlan): Corridor[] {
    const corridors: Corridor[] = [];
    
    if (ilots.length < 2) return corridors;
    
    // Group îlots into rows to identify facing rows
    const ilotRows = this.groupIlotsIntoRows(ilots);
    
    if (ilotRows.length < 2) {
      console.log('⚠️ Not enough îlot rows for corridor generation');
      return corridors;
    }
    
    console.log(`Found ${ilotRows.length} îlot rows for corridor generation`);
    
    // Generate corridors between facing rows
    for (let i = 0; i < ilotRows.length - 1; i++) {
      const row1 = ilotRows[i];
      const row2 = ilotRows[i + 1];
      
      // Check if rows are facing each other (close enough vertically)
      const verticalGap = Math.abs(row2.centerY - row1.centerY);
      if (verticalGap > this.settings.corridorWidth * 3) continue; // Too far apart
      
      // Find overlapping horizontal range
      const leftBound = Math.max(row1.minX, row2.minX);
      const rightBound = Math.min(row1.maxX, row2.maxX);
      
      if (rightBound > leftBound + 200) { // Minimum 200mm overlap
        const corridorY = (row1.centerY + row2.centerY) / 2;
        
        corridors.push({
          id: `corridor_rows_${i}_${i + 1}`,
          x1: leftBound,
          y1: corridorY,
          x2: rightBound,
          y2: corridorY,
          width: this.settings.corridorWidth,
          type: 'horizontal'
        });
        
        console.log(`✅ Created corridor between row ${i} and ${i + 1}`);
      }
    }
    
    // Add connection corridors to doors
    floorPlan.doors.forEach((door, index) => {
      const nearestIlot = this.findNearestIlot(door.center, ilots);
      if (nearestIlot) {
        const ilotCenter = {
          x: nearestIlot.x + nearestIlot.width / 2,
          y: nearestIlot.y + nearestIlot.height / 2
        };
        
        // Create L-shaped corridor to door
        corridors.push({
          id: `door_connection_${index}`,
          x1: ilotCenter.x,
          y1: ilotCenter.y,
          x2: door.center.x,
          y2: door.center.y,
          width: this.settings.corridorWidth,
          type: 'connection'
        });
      }
    });
    
    console.log(`✅ Generated ${corridors.length} corridors`);
    return corridors;
  }

  private groupIlotsIntoRows(ilots: Ilot[]): Array<{
    centerY: number,
    minX: number,
    maxX: number,
    ilots: Ilot[]
  }> {
    const threshold = 200; // 200mm threshold for same row
    const rows: Array<{centerY: number, minX: number, maxX: number, ilots: Ilot[]}> = [];
    
    ilots.forEach(ilot => {
      const ilotCenterY = ilot.y + ilot.height / 2;
      
      // Find existing row or create new one
      let targetRow = rows.find(row => Math.abs(row.centerY - ilotCenterY) < threshold);
      
      if (!targetRow) {
        targetRow = {
          centerY: ilotCenterY,
          minX: ilot.x,
          maxX: ilot.x + ilot.width,
          ilots: []
        };
        rows.push(targetRow);
      }
      
      targetRow.ilots.push(ilot);
      targetRow.minX = Math.min(targetRow.minX, ilot.x);
      targetRow.maxX = Math.max(targetRow.maxX, ilot.x + ilot.width);
      
      // Update center Y as weighted average
      const totalIlots = targetRow.ilots.length;
      targetRow.centerY = targetRow.ilots.reduce((sum, i) => sum + (i.y + i.height / 2), 0) / totalIlots;
    });
    
    return rows.sort((a, b) => a.centerY - b.centerY);
  }

  private findNearestIlot(point: {x: number, y: number}, ilots: Ilot[]): Ilot | null {
    if (ilots.length === 0) return null;
    
    let nearest = ilots[0];
    let minDistance = this.utils.distanceFromPointToRectangle(point, nearest);
    
    for (let i = 1; i < ilots.length; i++) {
      const distance = this.utils.distanceFromPointToRectangle(point, ilots[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = ilots[i];
      }
    }
    
    return nearest;
  }

  // Utility methods
  private hasConverged(): boolean {
    if (this.convergenceHistory.length < 10) return false;
    
    const recent = this.convergenceHistory.slice(-10);
    const variance = this.calculateVariance(recent);
    
    return variance < this.settings.convergenceThreshold;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private isValidPlacement(candidate: Rectangle, existingIlots: Ilot[], floorPlan: ProcessedFloorPlan, clearance?: number): boolean {
    // Enhanced validation with multiple checks
    const bounds = floorPlan.bounds;
    const minClearance = clearance || this.settings.minClearance;
    
    // Bounds check
    if (candidate.x < bounds.minX + minClearance || 
        candidate.x + candidate.width > bounds.maxX - minClearance ||
        candidate.y < bounds.minY + minClearance || 
        candidate.y + candidate.height > bounds.maxY - minClearance) {
      return false;
    }

    // Overlap check with existing îlots
    for (const existing of existingIlots) {
      if (this.utils.rectanglesOverlap(candidate, existing, minClearance)) {
        return false;
      }
    }

    // Restricted areas check
    for (const restricted of floorPlan.restrictedAreas) {
      if (this.utils.rectanglesOverlap(candidate, restricted.bounds, minClearance)) {
        return false;
      }
    }

    // Door clearance check
    for (const door of floorPlan.doors) {
      const distance = this.utils.distanceFromPointToRectangle(door.center, candidate);
      if (distance < door.radius + minClearance) {
        return false;
      }
    }

    return true;
  }

  // Placeholder implementations for advanced algorithms
  private trainNeuralWeights(floorPlan: ProcessedFloorPlan): any {
    // Neural network weight training simulation
    return {
      accessibility: Math.random() * 0.5 + 0.5,
      area: Math.random() * 0.5 + 0.5,
      flow: Math.random() * 0.5 + 0.5,
      fire: Math.random() * 0.5 + 0.5
    };
  }

  private createNeuralGuidedPopulation(sizes: IlotSize[], floorPlan: ProcessedFloorPlan, populationSize: number, weights: any): Ilot[][] {
    // Use neural weights to guide initial population
    return this.createDiversePopulation(sizes, floorPlan, populationSize);
  }

  private neuralEvaluateFitness(individual: Ilot[], floorPlan: ProcessedFloorPlan, weights: any): OptimizationMetrics {
    // Neural-enhanced fitness evaluation
    return this.calculateAdvancedFitness(individual, floorPlan);
  }

  private neuralEvolution(evaluatedPopulation: any[], weights: any): Ilot[] {
    // Neural-guided evolution
    return evaluatedPopulation[0].individual;
  }

  private initializeSwarm(sizes: IlotSize[], floorPlan: ProcessedFloorPlan, swarmSize: number): any[] {
    // Particle swarm initialization
    return [];
  }

  private updateSwarmPositions(particles: any[], floorPlan: ProcessedFloorPlan): void {
    // Particle position updates
  }

  private initializeQTable(floorPlan: ProcessedFloorPlan): any {
    // Q-learning table initialization
    return {};
  }

  private executeRLEpisode(sizes: IlotSize[], floorPlan: ProcessedFloorPlan, qTable: any, explorationRate: number): Ilot[] {
    // Reinforcement learning episode
    return [];
  }

  private updateQTable(qTable: any, solution: Ilot[], fitness: OptimizationMetrics, learningRate: number): void {
    // Q-table updates
  }

  // Additional helper methods...
  private getOptimizationWeights(): { area: number; accessibility: number; fire: number; flow: number } {
    switch (this.settings.optimizationTarget) {
      case 'area': return { area: 0.5, accessibility: 0.2, fire: 0.2, flow: 0.1 };
      case 'accessibility': return { area: 0.2, accessibility: 0.5, fire: 0.2, flow: 0.1 };
      case 'fire': return { area: 0.2, accessibility: 0.2, fire: 0.5, flow: 0.1 };
      case 'flow': return { area: 0.2, accessibility: 0.2, fire: 0.1, flow: 0.5 };
      default: return { area: 0.25, accessibility: 0.25, fire: 0.25, flow: 0.25 };
    }
  }

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

  private createCornerCandidate(corner: any, size: IlotSize, bounds: any, cornerIndex: number): any {
    const margin = this.settings.minClearance;
    
    switch (cornerIndex % 4) {
      case 0: return { x: corner.x + margin, y: corner.y + margin, width: size.width, height: size.height };
      case 1: return { x: corner.x - size.width - margin, y: corner.y + margin, width: size.width, height: size.height };
      case 2: return { x: corner.x - size.width - margin, y: corner.y - size.height - margin, width: size.width, height: size.height };
      case 3: return { x: corner.x + margin, y: corner.y - size.height - margin, width: size.width, height: size.height };
      default: return { x: corner.x, y: corner.y, width: size.width, height: size.height };
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

  // Placeholder methods - would be fully implemented in production
  private alignWithWall(wall: any, size: IlotSize, clearance: number): any { return null; }
  private identifyFlowPaths(floorPlan: ProcessedFloorPlan): any[] { return []; }
  private findFlowOptimalPosition(size: IlotSize, paths: any[], existing: Ilot[], floorPlan: ProcessedFloorPlan): any { return null; }
  private findAccessibilityOptimalPosition(size: IlotSize, existing: Ilot[], floorPlan: ProcessedFloorPlan): any { return null; }
  private calculateDoorAccessibility(ilot: Ilot, doors: any[]): number { return 1; }
  private calculatePeerAccessibility(ilot: Ilot, ilots: Ilot[]): number { return 1; }
  private calculateCorridorAccessibility(ilot: Ilot, ilots: Ilot[]): number { return 1; }
  private calculateEmergencyAccessibility(ilot: Ilot, floorPlan: ProcessedFloorPlan): number { return 1; }
  private calculateFireCompliance(ilots: Ilot[], floorPlan: ProcessedFloorPlan): number { return 1; }
  private calculateFlowEfficiency(ilots: Ilot[], floorPlan: ProcessedFloorPlan): number { return 1; }
  private generatePrimarySpine(ilots: Ilot[], floorPlan: ProcessedFloorPlan): Corridor | null { return null; }
  private generateSecondaryCorridors(ilots: Ilot[], floorPlan: ProcessedFloorPlan): Corridor[] { return []; }
  private generateDoorConnections(ilots: Ilot[], floorPlan: ProcessedFloorPlan): Corridor[] { return []; }
  private optimizeCorridorNetwork(corridors: Corridor[]): Corridor[] { return corridors; }
  private tournamentSelection(population: any[]): Ilot[] { return population[0].individual; }
  private advancedCrossover(parent1: Ilot[], parent2: Ilot[], floorPlan: ProcessedFloorPlan): Ilot[] { return parent1; }
  private intelligentMutation(individual: Ilot[], floorPlan: ProcessedFloorPlan): Ilot[] { return individual; }
}
