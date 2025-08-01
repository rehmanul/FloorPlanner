
import { ProcessedFloorPlan, Ilot, Corridor, Point, Wall } from '@shared/schema';

export interface IlotPlacementSettings {
  ilotDimensions: { width: number; height: number };
  corridorWidth: number;
  algorithm: 'intelligent' | 'grid' | 'genetic' | 'simulated-annealing';
  density: number;
  spacing: number;
  minClearance: number;
}

export interface PlacementResult {
  ilots: Ilot[];
  corridors: Corridor[];
  analytics: {
    totalArea: number;
    usableArea: number;
    occupancyRate: number;
    corridorLength: number;
    efficiency: number;
  };
}

export class RealIlotPlacementEngine {
  private floorPlan: ProcessedFloorPlan;
  private settings: IlotPlacementSettings;
  private occupiedAreas: { x: number; y: number; width: number; height: number }[] = [];

  constructor(floorPlan: ProcessedFloorPlan, settings: IlotPlacementSettings) {
    this.floorPlan = floorPlan;
    this.settings = settings;
  }

  public generateLayout(): PlacementResult {
    // Clear previous placements
    this.occupiedAreas = [];

    // Mark restricted areas as occupied
    this.markRestrictedAreas();

    let ilots: Ilot[] = [];
    let corridors: Corridor[] = [];

    switch (this.settings.algorithm) {
      case 'intelligent':
        ilots = this.intelligentPlacement();
        break;
      case 'grid':
        ilots = this.gridPlacement();
        break;
      case 'genetic':
        ilots = this.geneticAlgorithmPlacement();
        break;
      case 'simulated-annealing':
        ilots = this.simulatedAnnealingPlacement();
        break;
    }

    // Generate corridor network connecting all îlots
    corridors = this.generateCorridorNetwork(ilots);

    // Calculate analytics
    const analytics = this.calculateAnalytics(ilots, corridors);

    return { ilots, corridors, analytics };
  }

  private markRestrictedAreas(): void {
    if (this.floorPlan.restrictedAreas) {
      this.floorPlan.restrictedAreas.forEach(area => {
        this.occupiedAreas.push({
          x: area.bounds.minX - this.settings.minClearance,
          y: area.bounds.minY - this.settings.minClearance,
          width: (area.bounds.maxX - area.bounds.minX) + (this.settings.minClearance * 2),
          height: (area.bounds.maxY - area.bounds.minY) + (this.settings.minClearance * 2)
        });
      });
    }
  }

  private intelligentPlacement(): Ilot[] {
    const ilots: Ilot[] = [];
    const bounds = this.floorPlan.bounds;
    
    // Create a grid of potential positions
    const gridSpacing = this.settings.spacing + this.settings.ilotDimensions.width;
    const positions: Point[] = [];

    for (let x = bounds.minX + this.settings.minClearance; x < bounds.maxX - this.settings.ilotDimensions.width; x += gridSpacing) {
      for (let y = bounds.minY + this.settings.minClearance; y < bounds.maxY - this.settings.ilotDimensions.height; y += gridSpacing) {
        positions.push({ x, y });
      }
    }

    // Score each position based on multiple criteria
    const scoredPositions = positions.map(pos => ({
      ...pos,
      score: this.calculatePositionScore(pos)
    })).sort((a, b) => b.score - a.score);

    // Place îlots starting with best positions
    let placedCount = 0;
    const maxIlots = Math.floor(positions.length * this.settings.density);

    for (const position of scoredPositions) {
      if (placedCount >= maxIlots) break;

      if (this.canPlaceIlot(position.x, position.y)) {
        const ilot: Ilot = {
          id: `ilot-${placedCount + 1}`,
          x: position.x,
          y: position.y,
          width: this.settings.ilotDimensions.width,
          height: this.settings.ilotDimensions.height,
          area: (this.settings.ilotDimensions.width * this.settings.ilotDimensions.height) / 1000000, // Convert to m²
          type: 'workspace',
          capacity: Math.floor(this.settings.ilotDimensions.width * this.settings.ilotDimensions.height / 6000000) // ~6m² per person
        };

        ilots.push(ilot);
        this.occupiedAreas.push({
          x: ilot.x - this.settings.spacing / 2,
          y: ilot.y - this.settings.spacing / 2,
          width: ilot.width + this.settings.spacing,
          height: ilot.height + this.settings.spacing
        });

        placedCount++;
      }
    }

    return ilots;
  }

  private gridPlacement(): Ilot[] {
    const ilots: Ilot[] = [];
    const bounds = this.floorPlan.bounds;
    
    const ilotWithSpacing = {
      width: this.settings.ilotDimensions.width + this.settings.spacing,
      height: this.settings.ilotDimensions.height + this.settings.spacing
    };

    let ilotCounter = 1;

    for (let x = bounds.minX + this.settings.minClearance; x < bounds.maxX - this.settings.ilotDimensions.width; x += ilotWithSpacing.width) {
      for (let y = bounds.minY + this.settings.minClearance; y < bounds.maxY - this.settings.ilotDimensions.height; y += ilotWithSpacing.height) {
        if (this.canPlaceIlot(x, y)) {
          const ilot: Ilot = {
            id: `ilot-${ilotCounter}`,
            x,
            y,
            width: this.settings.ilotDimensions.width,
            height: this.settings.ilotDimensions.height,
            area: (this.settings.ilotDimensions.width * this.settings.ilotDimensions.height) / 1000000,
            type: 'workspace',
            capacity: Math.floor(this.settings.ilotDimensions.width * this.settings.ilotDimensions.height / 6000000)
          };

          ilots.push(ilot);
          this.occupiedAreas.push({
            x: x - this.settings.spacing / 2,
            y: y - this.settings.spacing / 2,
            width: this.settings.ilotDimensions.width + this.settings.spacing,
            height: this.settings.ilotDimensions.height + this.settings.spacing
          });

          ilotCounter++;
        }
      }
    }

    return ilots;
  }

  private geneticAlgorithmPlacement(): Ilot[] {
    // Simplified genetic algorithm implementation
    const populationSize = 50;
    const generations = 100;
    const mutationRate = 0.1;

    let population = this.generateRandomPopulation(populationSize);

    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness for each individual
      const fitnessScores = population.map(individual => this.evaluateFitness(individual));
      
      // Select parents using tournament selection
      const newPopulation: Ilot[][] = [];
      
      for (let i = 0; i < populationSize; i++) {
        const parent1 = this.tournamentSelection(population, fitnessScores);
        const parent2 = this.tournamentSelection(population, fitnessScores);
        
        let offspring = this.crossover(parent1, parent2);
        
        if (Math.random() < mutationRate) {
          offspring = this.mutate(offspring);
        }
        
        newPopulation.push(offspring);
      }
      
      population = newPopulation;
    }

    // Return the best individual
    const fitnessScores = population.map(individual => this.evaluateFitness(individual));
    const bestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
    return population[bestIndex];
  }

  private simulatedAnnealingPlacement(): Ilot[] {
    let currentSolution = this.gridPlacement();
    let currentEnergy = this.calculateEnergy(currentSolution);
    
    let temperature = 1000;
    const coolingRate = 0.95;
    const minTemperature = 1;

    while (temperature > minTemperature) {
      // Generate neighbor solution by moving a random îlot
      const neighborSolution = this.generateNeighborSolution(currentSolution);
      const neighborEnergy = this.calculateEnergy(neighborSolution);

      // Accept or reject the neighbor
      if (neighborEnergy < currentEnergy || Math.random() < Math.exp((currentEnergy - neighborEnergy) / temperature)) {
        currentSolution = neighborSolution;
        currentEnergy = neighborEnergy;
      }

      temperature *= coolingRate;
    }

    return currentSolution;
  }

  private generateCorridorNetwork(ilots: Ilot[]): Corridor[] {
    const corridors: Corridor[] = [];
    
    if (ilots.length === 0) return corridors;

    // Create main corridors connecting ilots using minimum spanning tree approach
    const connections = this.calculateMinimumSpanningTree(ilots);
    
    connections.forEach((connection, index) => {
      const startIlot = ilots[connection.from];
      const endIlot = ilots[connection.to];
      
      const startX = startIlot.x + startIlot.width / 2;
      const startY = startIlot.y + startIlot.height / 2;
      const endX = endIlot.x + endIlot.width / 2;
      const endY = endIlot.y + endIlot.height / 2;

      corridors.push({
        id: `corridor-${index + 1}`,
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        width: this.settings.corridorWidth,
        type: 'main'
      });
    });

    return corridors;
  }

  private calculateMinimumSpanningTree(ilots: Ilot[]): { from: number; to: number; distance: number }[] {
    const edges: { from: number; to: number; distance: number }[] = [];
    
    // Calculate distances between all pairs of îlots
    for (let i = 0; i < ilots.length; i++) {
      for (let j = i + 1; j < ilots.length; j++) {
        const distance = Math.sqrt(
          Math.pow(ilots[i].x - ilots[j].x, 2) + Math.pow(ilots[i].y - ilots[j].y, 2)
        );
        edges.push({ from: i, to: j, distance });
      }
    }

    // Sort edges by distance
    edges.sort((a, b) => a.distance - b.distance);

    // Kruskal's algorithm
    const parent = Array.from({ length: ilots.length }, (_, i) => i);
    const result: { from: number; to: number; distance: number }[] = [];

    const find = (x: number): number => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]);
      }
      return parent[x];
    };

    const union = (x: number, y: number): void => {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) {
        parent[rootX] = rootY;
      }
    };

    for (const edge of edges) {
      if (find(edge.from) !== find(edge.to)) {
        result.push(edge);
        union(edge.from, edge.to);
        if (result.length === ilots.length - 1) break;
      }
    }

    return result;
  }

  private calculatePositionScore(position: Point): number {
    let score = 0;

    // Distance from center (prefer central locations)
    const centerX = (this.floorPlan.bounds.minX + this.floorPlan.bounds.maxX) / 2;
    const centerY = (this.floorPlan.bounds.minY + this.floorPlan.bounds.maxY) / 2;
    const distanceFromCenter = Math.sqrt(Math.pow(position.x - centerX, 2) + Math.pow(position.y - centerY, 2));
    score += Math.max(0, 1000 - distanceFromCenter);

    // Distance from walls (prefer away from walls)
    if (this.floorPlan.walls) {
      let minWallDistance = Infinity;
      this.floorPlan.walls.forEach(wall => {
        const distance = this.pointToLineDistance(position, wall.points[0], wall.points[1] || wall.points[0]);
        minWallDistance = Math.min(minWallDistance, distance);
      });
      score += Math.min(500, minWallDistance);
    }

    // Distance from entrances (prefer near entrances)
    if (this.floorPlan.doors) {
      let minEntranceDistance = Infinity;
      this.floorPlan.doors.forEach(door => {
        const distance = Math.sqrt(Math.pow(position.x - door.position.x, 2) + Math.pow(position.y - door.position.y, 2));
        minEntranceDistance = Math.min(minEntranceDistance, distance);
      });
      score += Math.max(0, 800 - minEntranceDistance);
    }

    return score;
  }

  private canPlaceIlot(x: number, y: number): boolean {
    const ilotRect = {
      x,
      y,
      width: this.settings.ilotDimensions.width,
      height: this.settings.ilotDimensions.height
    };

    // Check bounds
    if (x < this.floorPlan.bounds.minX || y < this.floorPlan.bounds.minY ||
        x + ilotRect.width > this.floorPlan.bounds.maxX || y + ilotRect.height > this.floorPlan.bounds.maxY) {
      return false;
    }

    // Check against occupied areas
    return !this.occupiedAreas.some(occupied => this.rectanglesOverlap(ilotRect, occupied));
  }

  private rectanglesOverlap(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private generateRandomPopulation(size: number): Ilot[][] {
    const population: Ilot[][] = [];
    for (let i = 0; i < size; i++) {
      population.push(this.gridPlacement());
    }
    return population;
  }

  private evaluateFitness(ilots: Ilot[]): number {
    return ilots.length * 1000 - this.calculateEnergy(ilots);
  }

  private calculateEnergy(ilots: Ilot[]): number {
    let energy = 0;
    
    // Penalty for overlapping îlots
    for (let i = 0; i < ilots.length; i++) {
      for (let j = i + 1; j < ilots.length; j++) {
        if (this.rectanglesOverlap(ilots[i], ilots[j])) {
          energy += 10000; // High penalty for overlaps
        }
      }
    }

    // Penalty for being too close to walls or restricted areas
    ilots.forEach(ilot => {
      if (this.floorPlan.walls) {
        this.floorPlan.walls.forEach(wall => {
          const distance = this.pointToLineDistance(
            { x: ilot.x + ilot.width / 2, y: ilot.y + ilot.height / 2 },
            wall.points[0],
            wall.points[1] || wall.points[0]
          );
          if (distance < this.settings.minClearance) {
            energy += (this.settings.minClearance - distance) * 10;
          }
        });
      }
    });

    return energy;
  }

  private tournamentSelection(population: Ilot[][], fitnessScores: number[]): Ilot[] {
    const tournamentSize = 3;
    let best = Math.floor(Math.random() * population.length);
    
    for (let i = 1; i < tournamentSize; i++) {
      const competitor = Math.floor(Math.random() * population.length);
      if (fitnessScores[competitor] > fitnessScores[best]) {
        best = competitor;
      }
    }
    
    return [...population[best]];
  }

  private crossover(parent1: Ilot[], parent2: Ilot[]): Ilot[] {
    const crossoverPoint = Math.floor(Math.random() * Math.min(parent1.length, parent2.length));
    return [...parent1.slice(0, crossoverPoint), ...parent2.slice(crossoverPoint)];
  }

  private mutate(individual: Ilot[]): Ilot[] {
    if (individual.length === 0) return individual;
    
    const mutated = [...individual];
    const randomIndex = Math.floor(Math.random() * mutated.length);
    const ilot = { ...mutated[randomIndex] };
    
    // Small random movement
    ilot.x += (Math.random() - 0.5) * 200;
    ilot.y += (Math.random() - 0.5) * 200;
    
    mutated[randomIndex] = ilot;
    return mutated;
  }

  private generateNeighborSolution(solution: Ilot[]): Ilot[] {
    if (solution.length === 0) return solution;
    
    const neighbor = solution.map(ilot => ({ ...ilot }));
    const randomIndex = Math.floor(Math.random() * neighbor.length);
    
    // Move random îlot slightly
    neighbor[randomIndex].x += (Math.random() - 0.5) * 300;
    neighbor[randomIndex].y += (Math.random() - 0.5) * 300;
    
    return neighbor;
  }

  private calculateAnalytics(ilots: Ilot[], corridors: Corridor[]) {
    const totalArea = (this.floorPlan.bounds.maxX - this.floorPlan.bounds.minX) * 
                     (this.floorPlan.bounds.maxY - this.floorPlan.bounds.minY) / 1000000; // Convert to m²
    
    const ilotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const corridorLength = corridors.reduce((sum, corridor) => 
      sum + Math.sqrt(Math.pow(corridor.x2 - corridor.x1, 2) + Math.pow(corridor.y2 - corridor.y1, 2)), 0) / 1000; // Convert to m
    
    const usableArea = totalArea * 0.85; // Assuming 85% of total area is usable
    const occupancyRate = (ilotArea / usableArea) * 100;
    const efficiency = Math.min(100, occupancyRate * (ilots.length / Math.max(1, corridorLength * 0.1)));

    return {
      totalArea,
      usableArea,
      occupancyRate,
      corridorLength,
      efficiency
    };
  }
}
