import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { ProcessedFloorPlan, Ilot, Corridor } from '@shared/schema';

interface CADCanvasProps {
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
  selectedTool: 'select' | 'measure' | 'zoom';
  processing: boolean;
  processingStage: string;
  processingProgress: number;
}

const CADCanvas = forwardRef<HTMLCanvasElement, CADCanvasProps>(({
  floorPlan,
  ilots,
  corridors,
  layers,
  selectedTool,
  processing,
  processingStage,
  processingProgress
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number>();

  useImperativeHandle(ref, () => canvasRef.current!);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    contextRef.current = context;
    
    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        draw();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const draw = () => {
    if (!contextRef.current || !canvasRef.current) return;

    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (processing) {
      drawProcessingScreen(ctx, canvas);
      return;
    }

    if (!floorPlan) {
      drawWelcomeScreen(ctx, canvas);
      return;
    }

    // Set up coordinate system (CAD coordinates to canvas)
    ctx.save();
    
    // Scale and translate to fit floor plan
    const scale = Math.min(canvas.width / 1000, canvas.height / 800) * 0.8;
    const offsetX = (canvas.width - 800 * scale) / 2;
    const offsetY = (canvas.height - 600 * scale) / 2;
    
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw grid
    drawGrid(ctx);

    // Draw floor plan elements based on layers
    if (layers.walls && floorPlan.processed.walls) {
      drawWalls(ctx, floorPlan.processed.walls);
    }

    if (layers.restricted && floorPlan.processed.restricted) {
      drawRestrictedAreas(ctx, floorPlan.processed.restricted);
    }

    if (layers.entrances && floorPlan.processed.entrances) {
      drawEntrances(ctx, floorPlan.processed.entrances);
    }

    if (layers.corridors) {
      drawCorridors(ctx, corridors);
    }

    if (layers.ilots) {
      drawIlots(ctx, ilots);
    }

    if (layers.labels) {
      drawLabels(ctx, ilots);
    }

    ctx.restore();
  };

  const drawProcessingScreen = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw processing indicator
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = '#4a90e2';
    ctx.font = '24px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(processingStage, centerX, centerY - 40);

    // Progress bar
    const barWidth = 300;
    const barHeight = 8;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 20;

    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(barX, barY, (barWidth * processingProgress) / 100, barHeight);
  };

  const drawWelcomeScreen = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = '#666';
    ctx.font = '18px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Upload a CAD file to begin analysis', centerX, centerY);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;

    for (let x = 0; x <= 800; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }

    for (let y = 0; y <= 600; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }
  };

  const drawWalls = (ctx: CanvasRenderingContext2D, walls: any[]) => {
    walls.forEach(wall => {
      ctx.strokeStyle = wall.isExterior ? '#333' : '#666';
      ctx.lineWidth = wall.thickness || 10;
      ctx.beginPath();
      ctx.moveTo(wall.start.x, wall.start.y);
      ctx.lineTo(wall.end.x, wall.end.y);
      ctx.stroke();
    });
  };

  const drawRestrictedAreas = (ctx: CanvasRenderingContext2D, restricted: any[]) => {
    restricted.forEach(area => {
      ctx.fillStyle = 'rgba(220, 38, 127, 0.3)';
      ctx.fillRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);
      
      ctx.strokeStyle = '#dc267f';
      ctx.lineWidth = 2;
      ctx.strokeRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);
    });
  };

  const drawEntrances = (ctx: CanvasRenderingContext2D, entrances: any[]) => {
    entrances.forEach(entrance => {
      ctx.fillStyle = 'rgba(255, 109, 106, 0.7)';
      ctx.fillRect(entrance.position.x - entrance.width/2, entrance.position.y - 5, entrance.width, 10);
    });
  };

  const drawCorridors = (ctx: CanvasRenderingContext2D, corridors: Corridor[]) => {
    corridors.forEach(corridor => {
      ctx.fillStyle = 'rgba(255, 193, 7, 0.6)';
      ctx.fillRect(corridor.x - corridor.width/2, corridor.y - corridor.length/2, corridor.width, corridor.length);
    });
  };

  const drawIlots = (ctx: CanvasRenderingContext2D, ilots: Ilot[]) => {
    ilots.forEach(ilot => {
      ctx.fillStyle = 'rgba(72, 144, 226, 0.8)';
      ctx.fillRect(ilot.x - ilot.width/2, ilot.y - ilot.height/2, ilot.width, ilot.height);
      
      ctx.strokeStyle = '#4a90e2';
      ctx.lineWidth = 2;
      ctx.strokeRect(ilot.x - ilot.width/2, ilot.y - ilot.height/2, ilot.width, ilot.height);
    });
  };

  const drawLabels = (ctx: CanvasRenderingContext2D, ilots: Ilot[]) => {
    ilots.forEach((ilot, index) => {
      ctx.fillStyle = '#333';
      ctx.font = '12px Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${index + 1}`, ilot.x, ilot.y + 4);
    });
  };

  useEffect(() => {
    draw();
  }, [floorPlan, ilots, corridors, layers, processing, processingStage, processingProgress]);

  return (
    <div className="flex-1 relative bg-white">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        width={800}
        height={600}
      />
      
      {/* Canvas Controls */}
      <div className="absolute top-4 left-4">
        <div className="bg-white rounded-lg shadow-lg p-2 flex space-x-2">
          <div className="text-xs text-gray-500">
            Tool: <span className="font-medium capitalize">{selectedTool}</span>
          </div>
        </div>
      </div>
      
      {/* Canvas Info */}
      <div className="absolute bottom-4 left-4">
        <div className="bg-white rounded-lg shadow-lg p-2">
          <div className="text-xs text-gray-500">
            {floorPlan ? `${floorPlan.name} • ${ilots.length} îlots` : 'No file loaded'}
          </div>
        </div>
      </div>
    </div>
  );
});

CADCanvas.displayName = 'CADCanvas';

export default CADCanvas;