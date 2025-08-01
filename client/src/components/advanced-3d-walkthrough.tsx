
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, ZoomIn, ZoomOut, Move3D } from 'lucide-react';
import { ProcessedFloorPlan, Ilot, Corridor, Wall } from '@shared/schema';

interface Advanced3DWalkthroughProps {
  floorPlan: ProcessedFloorPlan;
  ilots: Ilot[];
  corridors: Corridor[];
  walls: Wall[];
  onClose: () => void;
}

// Professional 3D colors matching CAD standards
const COLORS_3D = {
  FLOOR: '#f5f5f5',
  WALLS: '#6B7280',
  ILOTS: '#22C55E',
  CORRIDORS: '#EC4899',
  CEILING: '#e5e7eb',
  SHADOW: 'rgba(107, 114, 128, 0.3)'
} as const;

function Simple3DVisualization({ floorPlan, ilots, corridors, walls }: Omit<Advanced3DWalkthroughProps, 'onClose'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    renderScene();
  }, [floorPlan, ilots, corridors, walls, rotation, zoom]);
  
  const renderScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#334155');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Calculate projection parameters
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const scale = Math.min(rect.width, rect.height) / 
      Math.max(
        floorPlan.bounds.maxX - floorPlan.bounds.minX,
        floorPlan.bounds.maxY - floorPlan.bounds.minY
      ) * 0.0003 * zoom;
    
    // 3D projection function with rotation
    const project3D = (x: number, y: number, z: number = 0) => {
      // Translate to origin
      const tx = x - (floorPlan.bounds.minX + floorPlan.bounds.maxX) / 2;
      const ty = y - (floorPlan.bounds.minY + floorPlan.bounds.maxY) / 2;
      const tz = z;
      
      // Apply rotations
      const radX = (rotation.x * Math.PI) / 180;
      const radY = (rotation.y * Math.PI) / 180;
      
      // Rotate around Y axis
      const x1 = tx * Math.cos(radY) - tz * Math.sin(radY);
      const z1 = tx * Math.sin(radY) + tz * Math.cos(radY);
      
      // Rotate around X axis
      const y2 = ty * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = ty * Math.sin(radX) + z1 * Math.cos(radX);
      
      // Project to 2D with perspective
      const perspective = 1000;
      const factor = perspective / (perspective + z2);
      
      return {
        x: centerX + x1 * scale * factor,
        y: centerY + y2 * scale * factor,
        z: z2
      };
    };
    
    // Collect all 3D objects with z-sorting
    const objects3D: Array<{
      type: string;
      data: any;
      avgZ: number;
      render: () => void;
    }> = [];
    
    // Add floor
    const floorPoints = [
      { x: floorPlan.bounds.minX, y: floorPlan.bounds.minY, z: 0 },
      { x: floorPlan.bounds.maxX, y: floorPlan.bounds.minY, z: 0 },
      { x: floorPlan.bounds.maxX, y: floorPlan.bounds.maxY, z: 0 },
      { x: floorPlan.bounds.minX, y: floorPlan.bounds.maxY, z: 0 }
    ];
    
    const projectedFloor = floorPoints.map(p => project3D(p.x, p.y, p.z));
    const floorAvgZ = projectedFloor.reduce((sum, p) => sum + p.z, 0) / projectedFloor.length;
    
    objects3D.push({
      type: 'floor',
      data: projectedFloor,
      avgZ: floorAvgZ,
      render: () => {
        ctx.fillStyle = COLORS_3D.FLOOR;
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(projectedFloor[0].x, projectedFloor[0].y);
        projectedFloor.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Add grid pattern
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        const gridSize = 1000;
        for (let x = floorPlan.bounds.minX; x <= floorPlan.bounds.maxX; x += gridSize) {
          const p1 = project3D(x, floorPlan.bounds.minY, 0);
          const p2 = project3D(x, floorPlan.bounds.maxY, 0);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        for (let y = floorPlan.bounds.minY; y <= floorPlan.bounds.maxY; y += gridSize) {
          const p1 = project3D(floorPlan.bounds.minX, y, 0);
          const p2 = project3D(floorPlan.bounds.maxX, y, 0);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
    
    // Add walls
    walls.forEach((wall, index) => {
      if (wall.points.length >= 2) {
        const wallHeight = 2700; // 2.7m standard wall height
        const start = wall.points[0];
        const end = wall.points[1];
        
        // Wall vertices (bottom and top)
        const vertices = [
          project3D(start.x, start.y, 0),
          project3D(end.x, end.y, 0),
          project3D(end.x, end.y, wallHeight),
          project3D(start.x, start.y, wallHeight)
        ];
        
        const avgZ = vertices.reduce((sum, v) => sum + v.z, 0) / vertices.length;
        
        objects3D.push({
          type: 'wall',
          data: { vertices, wall },
          avgZ,
          render: () => {
            // Draw wall face
            ctx.fillStyle = COLORS_3D.WALLS;
            ctx.strokeStyle = '#4b5563';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            vertices.forEach(v => ctx.lineTo(v.x, v.y));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Add wall thickness effect
            const thickness = 100;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const perpX = Math.cos(angle + Math.PI / 2) * thickness;
            const perpY = Math.sin(angle + Math.PI / 2) * thickness;
            
            const thickVertices = [
              project3D(start.x + perpX, start.y + perpY, 0),
              project3D(end.x + perpX, end.y + perpY, 0),
              project3D(end.x + perpX, end.y + perpY, wallHeight),
              project3D(start.x + perpX, start.y + perpY, wallHeight)
            ];
            
            ctx.fillStyle = '#55606e';
            ctx.beginPath();
            ctx.moveTo(thickVertices[0].x, thickVertices[0].y);
            thickVertices.forEach(v => ctx.lineTo(v.x, v.y));
            ctx.closePath();
            ctx.fill();
          }
        });
      }
    });
    
    // Add îlots as 3D boxes
    ilots.forEach((ilot, index) => {
      const ilotHeight = 750; // 75cm desk height
      const vertices = [
        // Bottom face
        project3D(ilot.x, ilot.y, 0),
        project3D(ilot.x + ilot.width, ilot.y, 0),
        project3D(ilot.x + ilot.width, ilot.y + ilot.height, 0),
        project3D(ilot.x, ilot.y + ilot.height, 0),
        // Top face
        project3D(ilot.x, ilot.y, ilotHeight),
        project3D(ilot.x + ilot.width, ilot.y, ilotHeight),
        project3D(ilot.x + ilot.width, ilot.y + ilot.height, ilotHeight),
        project3D(ilot.x, ilot.y + ilot.height, ilotHeight)
      ];
      
      const avgZ = vertices.reduce((sum, v) => sum + v.z, 0) / vertices.length;
      
      objects3D.push({
        type: 'ilot',
        data: { vertices, ilot },
        avgZ,
        render: () => {
          // Draw îlot top (most visible face)
          ctx.fillStyle = COLORS_3D.ILOTS;
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.moveTo(vertices[4].x, vertices[4].y);
          ctx.lineTo(vertices[5].x, vertices[5].y);
          ctx.lineTo(vertices[6].x, vertices[6].y);
          ctx.lineTo(vertices[7].x, vertices[7].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Draw side faces for depth
          ctx.fillStyle = '#16a34a';
          
          // Right side
          ctx.beginPath();
          ctx.moveTo(vertices[1].x, vertices[1].y);
          ctx.lineTo(vertices[2].x, vertices[2].y);
          ctx.lineTo(vertices[6].x, vertices[6].y);
          ctx.lineTo(vertices[5].x, vertices[5].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Front side
          ctx.beginPath();
          ctx.moveTo(vertices[2].x, vertices[2].y);
          ctx.lineTo(vertices[3].x, vertices[3].y);
          ctx.lineTo(vertices[7].x, vertices[7].y);
          ctx.lineTo(vertices[6].x, vertices[6].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Add îlot label
          const centerX = (vertices[4].x + vertices[5].x + vertices[6].x + vertices[7].x) / 4;
          const centerY = (vertices[4].y + vertices[5].y + vertices[6].y + vertices[7].y) / 4;
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(ilot.id, centerX, centerY);
          ctx.fillText(`${ilot.capacity}👤`, centerX, centerY + 15);
        }
      });
    });
    
    // Add corridors as elevated paths
    corridors.forEach((corridor, index) => {
      const corridorHeight = 50; // 5cm elevated corridor
      const width = corridor.width;
      
      // Calculate corridor rectangle
      const angle = Math.atan2(corridor.y2 - corridor.y1, corridor.x2 - corridor.x1);
      const perpX = Math.cos(angle + Math.PI / 2) * width / 2;
      const perpY = Math.sin(angle + Math.PI / 2) * width / 2;
      
      const vertices = [
        project3D(corridor.x1 - perpX, corridor.y1 - perpY, corridorHeight),
        project3D(corridor.x1 + perpX, corridor.y1 + perpY, corridorHeight),
        project3D(corridor.x2 + perpX, corridor.y2 + perpY, corridorHeight),
        project3D(corridor.x2 - perpX, corridor.y2 - perpY, corridorHeight)
      ];
      
      const avgZ = vertices.reduce((sum, v) => sum + v.z, 0) / vertices.length;
      
      objects3D.push({
        type: 'corridor',
        data: { vertices, corridor },
        avgZ,
        render: () => {
          ctx.fillStyle = COLORS_3D.CORRIDORS + '80';
          ctx.strokeStyle = COLORS_3D.CORRIDORS;
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.moveTo(vertices[0].x, vertices[0].y);
          vertices.forEach(v => ctx.lineTo(v.x, v.y));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Add arrow indicating direction
          const midX = (vertices[0].x + vertices[2].x) / 2;
          const midY = (vertices[0].y + vertices[2].y) / 2;
          const arrowAngle = Math.atan2(corridor.y2 - corridor.y1, corridor.x2 - corridor.x1);
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          const arrowSize = 20;
          
          ctx.beginPath();
          ctx.moveTo(
            midX - Math.cos(arrowAngle + 0.5) * arrowSize,
            midY - Math.sin(arrowAngle + 0.5) * arrowSize
          );
          ctx.lineTo(midX, midY);
          ctx.lineTo(
            midX - Math.cos(arrowAngle - 0.5) * arrowSize,
            midY - Math.sin(arrowAngle - 0.5) * arrowSize
          );
          ctx.stroke();
        }
      });
    });
    
    // Sort by Z-depth (painter's algorithm)
    objects3D.sort((a, b) => a.avgZ - b.avgZ);
    
    // Render all objects in order
    objects3D.forEach(obj => obj.render());
    
    // Add lighting effects
    ctx.fillStyle = COLORS_3D.SHADOW;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalCompositeOperation = 'source-over';
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x + deltaY * 0.5)),
      y: prev.y + deltaX * 0.5
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {/* 3D Controls */}
      <div className="absolute bottom-4 left-4 bg-black/80 p-3 rounded-lg text-white">
        <div className="space-y-2">
          <div className="text-sm font-semibold">3D Controls</div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setZoom(prev => Math.max(0.3, prev * 0.8))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setRotation({ x: 30, y: 45 });
                setZoom(1);
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-300">
            Drag to rotate • Scroll to zoom
          </div>
        </div>
      </div>
      
      {/* Stats overlay */}
      <div className="absolute top-4 right-4 bg-black/80 p-3 rounded-lg text-white">
        <div className="space-y-1 text-sm">
          <div className="font-semibold">3D Scene Stats</div>
          <div>Îlots: {ilots.length}</div>
          <div>Corridors: {corridors.length}</div>
          <div>Walls: {walls.length}</div>
          <div>Rotation: {rotation.x.toFixed(0)}°, {rotation.y.toFixed(0)}°</div>
          <div>Zoom: {(zoom * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}

export default function Advanced3DWalkthrough({
  floorPlan,
  ilots,
  corridors,
  walls,
  onClose
}: Advanced3DWalkthroughProps) {
  const [viewMode, setViewMode] = useState<'isometric' | 'perspective'>('isometric');
  const [showLabels, setShowLabels] = useState(true);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/90 p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-white">3D Walkthrough</h2>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={viewMode === 'isometric' ? 'default' : 'secondary'}
                onClick={() => setViewMode('isometric')}
              >
                Isometric
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'perspective' ? 'default' : 'secondary'}
                onClick={() => setViewMode('perspective')}
              >
                Perspective
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={showLabels ? 'default' : 'secondary'}
              onClick={() => setShowLabels(!showLabels)}
            >
              Labels
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </div>
      
      {/* 3D Visualization */}
      <div className="w-full h-full pt-16">
        <Simple3DVisualization 
          floorPlan={floorPlan}
          ilots={ilots}
          corridors={corridors}
          walls={walls}
        />
      </div>
      
      {/* Legend */}
      <div className="absolute top-24 left-4 bg-black/80 p-3 rounded-lg text-white">
        <div className="space-y-2 text-sm">
          <div className="font-semibold">Legend</div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-gray-400 rounded"></div>
            <span>Walls</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Îlots</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-pink-500 rounded"></div>
            <span>Corridors</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <span>Floor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
