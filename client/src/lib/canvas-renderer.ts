import { ProcessedFloorPlan, Ilot, Corridor, Wall, RestrictedArea, Door } from "@shared/schema";

interface RenderOptions {
  floorPlan: ProcessedFloorPlan | null;
  ilots: Ilot[];
  corridors: Corridor[];
  layers: {
    walls: boolean;
    restricted: boolean;
    entrances: boolean;
    ilots: boolean;
    corridors: boolean;
    labels: boolean;
  };
  scale: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D rendering context');
    }
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(options: RenderOptions) {
    const { floorPlan, ilots, corridors, layers, scale } = options;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set up coordinate system
    this.ctx.save();
    this.scale = scale;
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(this.offsetX, this.offsetY);
    
    // Render background grid
    this.renderGrid();
    
    if (floorPlan) {
      // Render walls
      if (layers.walls) {
        this.renderWalls(floorPlan.walls);
      }
      
      // Render restricted areas
      if (layers.restricted) {
        this.renderRestrictedAreas(floorPlan.restrictedAreas);
      }
      
      // Render entrances/doors
      if (layers.entrances) {
        this.renderDoors(floorPlan.doors);
      }
    }
    
    // Render corridors (before îlots so they appear underneath)
    if (layers.corridors) {
      this.renderCorridors(corridors);
    }
    
    // Render îlots
    if (layers.ilots) {
      this.renderIlots(ilots);
    }
    
    // Render area labels
    if (layers.labels) {
      this.renderLabels(ilots);
    }
    
    this.ctx.restore();
  }

  private renderGrid() {
    const gridSize = 20; // Grid spacing in pixels at scale 1
    const canvasWidth = this.canvas.width / this.scale;
    const canvasHeight = this.canvas.height / this.scale;
    
    this.ctx.strokeStyle = '#E5E7EB';
    this.ctx.lineWidth = 0.5 / this.scale;
    this.ctx.beginPath();
    
    // Vertical lines
    for (let x = 0; x < canvasWidth; x += gridSize) {
      this.ctx.moveTo(x - this.offsetX, -this.offsetY);
      this.ctx.lineTo(x - this.offsetX, canvasHeight - this.offsetY);
    }
    
    // Horizontal lines
    for (let y = 0; y < canvasHeight; y += gridSize) {
      this.ctx.moveTo(-this.offsetX, y - this.offsetY);
      this.ctx.lineTo(canvasWidth - this.offsetX, y - this.offsetY);
    }
    
    this.ctx.stroke();
  }

  private renderWalls(walls: Wall[]) {
    this.ctx.strokeStyle = '#6B7280'; // var(--cad-wall)
    this.ctx.lineWidth = 6 / this.scale;
    this.ctx.lineCap = 'round';
    
    walls.forEach(wall => {
      this.ctx.beginPath();
      this.ctx.moveTo(wall.points[0].x, wall.points[0].y);
      this.ctx.lineTo(wall.points[1].x, wall.points[1].y);
      this.ctx.stroke();
    });
  }

  private renderRestrictedAreas(restrictedAreas: RestrictedArea[]) {
    this.ctx.fillStyle = '#3B82F6'; // var(--cad-restricted)
    this.ctx.globalAlpha = 0.7;
    
    restrictedAreas.forEach(area => {
      this.ctx.fillRect(
        area.bounds.x,
        area.bounds.y,
        area.bounds.width,
        area.bounds.height
      );
    });
    
    this.ctx.globalAlpha = 1;
  }

  private renderDoors(doors: Door[]) {
    this.ctx.strokeStyle = '#EF4444'; // var(--cad-entrance)
    this.ctx.fillStyle = '#EF4444';
    this.ctx.globalAlpha = 0.7;
    this.ctx.lineWidth = 2 / this.scale;
    
    doors.forEach(door => {
      // Draw door opening as a small rectangle
      this.ctx.fillRect(
        door.center.x - 5,
        door.center.y - 15,
        10,
        30
      );
      
      // Draw door swing arc
      this.ctx.beginPath();
      this.ctx.arc(door.center.x, door.center.y, door.radius, 0, Math.PI / 2);
      this.ctx.stroke();
    });
    
    this.ctx.globalAlpha = 1;
  }

  private renderIlots(ilots: Ilot[]) {
    this.ctx.fillStyle = '#84CC16'; // var(--cad-ilot)
    this.ctx.strokeStyle = '#65A30D';
    this.ctx.lineWidth = 2 / this.scale;
    this.ctx.globalAlpha = 0.8;
    
    ilots.forEach(ilot => {
      // Fill îlot
      this.ctx.fillRect(ilot.x, ilot.y, ilot.width, ilot.height);
      
      // Stroke îlot border
      this.ctx.strokeRect(ilot.x, ilot.y, ilot.width, ilot.height);
    });
    
    this.ctx.globalAlpha = 1;
  }

  private renderCorridors(corridors: Corridor[]) {
    this.ctx.strokeStyle = '#EC4899'; // var(--cad-corridor)
    this.ctx.lineWidth = 3 / this.scale;
    this.ctx.globalAlpha = 0.8;
    this.ctx.lineCap = 'round';
    
    corridors.forEach(corridor => {
      this.ctx.beginPath();
      this.ctx.moveTo(corridor.x1, corridor.y1);
      this.ctx.lineTo(corridor.x2, corridor.y2);
      this.ctx.stroke();
    });
    
    this.ctx.globalAlpha = 1;
  }

  private renderLabels(ilots: Ilot[]) {
    this.ctx.fillStyle = '#374151';
    this.ctx.font = `${10 / this.scale}px "Roboto Mono", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    ilots.forEach(ilot => {
      const centerX = ilot.x + ilot.width / 2;
      const centerY = ilot.y + ilot.height / 2;
      
      this.ctx.fillText(
        `${ilot.area.toFixed(1)}m²`,
        centerX,
        centerY
      );
    });
  }

  // Public methods for viewport control
  setScale(scale: number) {
    this.scale = Math.max(0.1, Math.min(scale, 5));
  }

  setOffset(offsetX: number, offsetY: number) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  fitToView(bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
    const margin = 50;
    const availableWidth = this.canvas.width - 2 * margin;
    const availableHeight = this.canvas.height - 2 * margin;
    
    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;
    
    const scaleX = availableWidth / boundsWidth;
    const scaleY = availableHeight / boundsHeight;
    this.scale = Math.min(scaleX, scaleY);
    
    this.offsetX = (this.canvas.width / this.scale - boundsWidth) / 2 - bounds.minX;
    this.offsetY = (this.canvas.height / this.scale - boundsHeight) / 2 - bounds.minY;
  }
}
