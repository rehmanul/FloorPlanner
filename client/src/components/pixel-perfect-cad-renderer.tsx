import React, { useRef, useEffect, useState } from 'react';
import { ProcessedFloorPlan, Ilot, Corridor, Wall } from '@shared/schema';

interface PixelPerfectCADRendererProps {
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
  processingStage?: string;
  processingProgress?: number;
}

// Exact color matching as specified in requirements
const COLORS = {
  WALLS: '#6B7280',        // MUR - Gray walls as per reference
  RESTRICTED: '#3B82F6',   // NO ENTREE - Blue restricted areas
  ENTRANCES: '#EF4444',    // ENTREE/SORTIE - Red entrance/exit areas  
  ILOTS: '#22C55E',        // Green îlots as shown in reference
  CORRIDORS: '#EC4899',    // Pink corridor network
  BACKGROUND: '#F5F5F5',   // Light background
  TEXT: '#374151',         // Dark gray text
  MEASUREMENTS: '#DC2626'   // Red measurement text
} as const;

// Professional architectural line weights
const LINE_WEIGHTS = {
  WALLS: 3,
  RESTRICTED_OUTLINE: 2,
  ENTRANCE_OUTLINE: 2,
  ILOTS: 1.5,
  CORRIDORS: 2,
  MEASUREMENTS: 1
} as const;

export default function PixelPerfectCADRenderer({
  floorPlan,
  ilots,
  corridors,
  layers,
  selectedTool,
  processing,
  processingStage,
  processingProgress
}: PixelPerfectCADRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    renderFloorPlan();
  }, [floorPlan, ilots, corridors, layers, scale, offset]);

  const renderFloorPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fill container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Clear canvas with professional background
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!floorPlan) {
      renderWelcomeScreen(ctx, rect);
      return;
    }

    if (processing) {
      renderProcessingScreen(ctx, rect);
      return;
    }

    // Calculate optimal scale and center the floor plan
    calculateOptimalView(rect);

    // Apply transformations
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // STEP 1: Render walls as black/gray lines (exact match to reference)
    if (layers.walls && floorPlan.walls) {
      renderWalls(ctx, floorPlan.walls);
    }

    // STEP 2: Render restricted areas as light blue zones
    if (layers.restricted && floorPlan.restrictedAreas) {
      renderRestrictedAreas(ctx, floorPlan.restrictedAreas);
    }

    // STEP 3: Render entrances as red areas
    if (layers.entrances && floorPlan.doors) {
      renderEntrances(ctx, floorPlan.doors);
    }

    // Render îlots as green rectangles (matching reference image 2)
    if (layers.ilots && ilots.length > 0) {
      renderIlots(ctx, ilots);
    }

    // Render corridor network as pink lines (matching reference image 3)
    if (layers.corridors && corridors.length > 0) {
      renderCorridors(ctx, corridors);
    }

    // Render measurements and labels
    if (layers.labels) {
      renderMeasurements(ctx, ilots);
    }

    ctx.restore();
  };

  const renderWalls = (ctx: CanvasRenderingContext2D, walls: Wall[]) => {
    ctx.strokeStyle = COLORS.WALLS;
    ctx.lineWidth = LINE_WEIGHTS.WALLS;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    walls.forEach(wall => {
      // Wall points is a tuple [Point, Point] according to schema
      if (wall.points && wall.points.length === 2 && wall.points[0] && wall.points[1]) {
        const [startPoint, endPoint] = wall.points;
        
        // Ensure points have valid coordinates
        if (typeof startPoint.x === 'number' && typeof startPoint.y === 'number' &&
            typeof endPoint.x === 'number' && typeof endPoint.y === 'number') {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();

          // Add wall thickness representation
          if (wall.thickness && wall.thickness > 0) {
            ctx.save();
            ctx.strokeStyle = COLORS.WALLS;
            ctx.lineWidth = Math.max(1, (wall.thickness || 1) * scale * 0.001);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    });
  };

  const renderRestrictedAreas = (ctx: CanvasRenderingContext2D, restrictedAreas: any[]) => {
    restrictedAreas.forEach(area => {
      const bounds = area.bounds;
      
      // Fill with light blue
      ctx.fillStyle = COLORS.RESTRICTED + '80'; // Semi-transparent
      ctx.fillRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );

      // Outline with solid blue
      ctx.strokeStyle = COLORS.RESTRICTED;
      ctx.lineWidth = LINE_WEIGHTS.RESTRICTED_OUTLINE;
      ctx.strokeRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );
    });
  };

  const renderEntrances = (ctx: CanvasRenderingContext2D, doors: any[]) => {
    doors.forEach(door => {
      if (door.type === 'entrance' || (door as any).isEntrance) {
        const width = door.width || 800;
        const x = door.position.x - width / 2;
        const y = door.position.y - 50;

        // Fill with red
        ctx.fillStyle = COLORS.ENTRANCES + '80'; // Semi-transparent
        ctx.fillRect(x, y, width, 100);

        // Red outline
        ctx.strokeStyle = COLORS.ENTRANCES;
        ctx.lineWidth = LINE_WEIGHTS.ENTRANCE_OUTLINE;
        ctx.strokeRect(x, y, width, 100);

        // Draw door swing arc (curved red line as in reference)
        ctx.beginPath();
        ctx.arc(door.position.x, door.position.y, width / 2, 0, Math.PI / 2);
        ctx.stroke();
      }
    });
  };

  const renderIlots = (ctx: CanvasRenderingContext2D, ilots: Ilot[]) => {
    ilots.forEach(ilot => {
      // Fill with green (exact match to reference image 2)
      ctx.fillStyle = COLORS.ILOTS + 'CC'; // Semi-transparent green
      ctx.fillRect(ilot.x, ilot.y, ilot.width, ilot.height);

      // Green outline
      ctx.strokeStyle = COLORS.ILOTS;
      ctx.lineWidth = LINE_WEIGHTS.ILOTS;
      ctx.strokeRect(ilot.x, ilot.y, ilot.width, ilot.height);
    });
  };

  const renderCorridors = (ctx: CanvasRenderingContext2D, corridors: Corridor[]) => {
    ctx.strokeStyle = COLORS.CORRIDORS;
    ctx.lineWidth = LINE_WEIGHTS.CORRIDORS;
    ctx.lineCap = 'round';

    corridors.forEach(corridor => {
      // Draw main corridor line
      ctx.beginPath();
      ctx.moveTo(corridor.x1, corridor.y1);
      ctx.lineTo(corridor.x2, corridor.y2);
      ctx.stroke();

      // Draw corridor width representation
      const angle = Math.atan2(corridor.y2 - corridor.y1, corridor.x2 - corridor.x1);
      const perpAngle = angle + Math.PI / 2;
      const halfWidth = (corridor.width || 1200) / 2;

      const offset1x = Math.cos(perpAngle) * halfWidth;
      const offset1y = Math.sin(perpAngle) * halfWidth;
      const offset2x = Math.cos(perpAngle + Math.PI) * halfWidth;
      const offset2y = Math.sin(perpAngle + Math.PI) * halfWidth;

      ctx.save();
      ctx.strokeStyle = COLORS.CORRIDORS + '60';
      ctx.lineWidth = 1;

      // Draw corridor edges
      ctx.beginPath();
      ctx.moveTo(corridor.x1 + offset1x, corridor.y1 + offset1y);
      ctx.lineTo(corridor.x2 + offset1x, corridor.y2 + offset1y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(corridor.x1 + offset2x, corridor.y1 + offset2y);
      ctx.lineTo(corridor.x2 + offset2x, corridor.y2 + offset2y);
      ctx.stroke();

      ctx.restore();
    });
  };

  const renderMeasurements = (ctx: CanvasRenderingContext2D, ilots: Ilot[]) => {
    ctx.fillStyle = COLORS.MEASUREMENTS;
    ctx.font = `${Math.max(10, 12 / scale)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ilots.forEach(ilot => {
      const centerX = ilot.x + ilot.width / 2;
      const centerY = ilot.y + ilot.height / 2;
      
      // Draw area measurement (matching reference image 3)
      ctx.fillText(
        `${ilot.area.toFixed(1)}m²`,
        centerX,
        centerY
      );
    });
  };

  const renderWelcomeScreen = (ctx: CanvasRenderingContext2D, rect: DOMRect) => {
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Upload a CAD file (DXF, DWG, PDF) to begin analysis',
      rect.width / 2,
      rect.height / 2 - 20
    );

    ctx.font = '16px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(
      'Professional floor plan processing with authentic geometric analysis',
      rect.width / 2,
      rect.height / 2 + 20
    );
  };

  const renderProcessingScreen = (ctx: CanvasRenderingContext2D, rect: DOMRect) => {
    // Progress bar
    const barWidth = 300;
    const barHeight = 20;
    const barX = (rect.width - barWidth) / 2;
    const barY = rect.height / 2;

    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    if (processingProgress) {
      ctx.fillStyle = COLORS.RESTRICTED;
      ctx.fillRect(barX, barY, (barWidth * processingProgress) / 100, barHeight);
    }

    // Processing text
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      processingStage || 'Processing CAD file...',
      rect.width / 2,
      barY - 30
    );

    if (processingProgress) {
      ctx.font = '14px Arial';
      ctx.fillText(
        `${processingProgress.toFixed(0)}%`,
        rect.width / 2,
        barY + 40
      );
    }
  };

  const calculateOptimalView = (rect: DOMRect) => {
    if (!floorPlan) return;

    const bounds = floorPlan.bounds;
    const planWidth = bounds.maxX - bounds.minX;
    const planHeight = bounds.maxY - bounds.minY;

    if (planWidth === 0 || planHeight === 0) return;

    const padding = 50;
    const scaleX = (rect.width - padding * 2) / planWidth;
    const scaleY = (rect.height - padding * 2) / planHeight;
    
    if (scale === 1) { // Only auto-fit on initial load
      setScale(Math.min(scaleX, scaleY, 2)); // Max zoom of 2x
      
      setOffset({
        x: (rect.width - planWidth * scale) / 2 - bounds.minX * scale,
        y: (rect.height - planHeight * scale) / 2 - bounds.minY * scale
      });
    }
  };

  // Mouse interaction handlers for pan and zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * scaleChange));
    
    // Zoom towards mouse position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      setOffset(prev => ({
        x: mouseX - (mouseX - prev.x) * (newScale / scale),
        y: mouseY - (mouseY - prev.y) * (newScale / scale)
      }));
    }
    
    setScale(newScale);
  };

  return (
    <div className="relative w-full h-full bg-gray-50">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ imageRendering: 'crisp-edges' }}
      />
      
      {/* Professional legend matching reference images */}
      {floorPlan && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border">
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-1 rounded" 
                style={{ backgroundColor: COLORS.WALLS }}
              ></div>
              <span>MUR</span>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: COLORS.RESTRICTED }}
              ></div>
              <span>NO ENTRÉE</span>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: COLORS.ENTRANCES }}
              ></div>
              <span>ENTRÉE/SORTIE</span>
            </div>
            {ilots.length > 0 && (
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: COLORS.ILOTS }}
                ></div>
                <span>ÎLOTS</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border">
        <div className="flex flex-col space-y-1">
          <button
            onClick={() => setScale(prev => Math.min(5, prev * 1.2))}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            +
          </button>
          <button
            onClick={() => setScale(prev => Math.max(0.1, prev * 0.8))}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}