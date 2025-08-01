import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Play, Pause, RotateCcw, Home, Eye, Settings } from 'lucide-react';
import { ProcessedFloorPlan, Ilot, Corridor, Wall } from '@shared/schema';

interface Advanced3DWalkthroughProps {
  floorPlan: ProcessedFloorPlan;
  ilots: Ilot[];
  corridors: Corridor[];
  walls: Wall[];
  onClose: () => void;
}

// Simple 3D visualization without external dependencies
function Simple3DVisualization({ floorPlan, ilots, corridors, walls }: Omit<Advanced3DWalkthroughProps, 'onClose'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up isometric projection
    const scale = Math.min(canvas.width, canvas.height) / Math.max(
      floorPlan.bounds.maxX - floorPlan.bounds.minX,
      floorPlan.bounds.maxY - floorPlan.bounds.minY
    ) * 0.8;
    
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;
    
    // Helper function for isometric projection
    const project = (x: number, y: number, z: number = 0) => ({
      x: offsetX + (x - y) * Math.cos(Math.PI / 6) * scale,
      y: offsetY + (x + y) * Math.sin(Math.PI / 6) * scale - z * scale
    });
    
    // Draw floor
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw walls in 3D
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    walls.forEach(wall => {
      const start = wall.points[0];
      const end = wall.points[1];
      const height = 2700; // 2.7m wall height
      
      const p1 = project(start.x, start.y, 0);
      const p2 = project(end.x, end.y, 0);
      const p3 = project(end.x, end.y, height);
      const p4 = project(start.x, start.y, height);
      
      // Draw wall face
      ctx.fillStyle = '#d1d5db';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    
    // Draw îlots as 3D desks
    ilots.forEach((ilot, index) => {
      const height = 750; // 75cm desk height
      const corners = [
        project(ilot.x, ilot.y, 0),
        project(ilot.x + ilot.width, ilot.y, 0),
        project(ilot.x + ilot.width, ilot.y + ilot.height, 0),
        project(ilot.x, ilot.y + ilot.height, 0),
        project(ilot.x, ilot.y, height),
        project(ilot.x + ilot.width, ilot.y, height),
        project(ilot.x + ilot.width, ilot.y + ilot.height, height),
        project(ilot.x, ilot.y + ilot.height, height)
      ];
      
      // Draw desk top
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.moveTo(corners[4].x, corners[4].y);
      ctx.lineTo(corners[5].x, corners[5].y);
      ctx.lineTo(corners[6].x, corners[6].y);
      ctx.lineTo(corners[7].x, corners[7].y);
      ctx.closePath();
      ctx.fill();
      
      // Draw desk sides
      ctx.fillStyle = '#a0522d';
      ctx.beginPath();
      ctx.moveTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[6].x, corners[6].y);
      ctx.lineTo(corners[5].x, corners[5].y);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.lineTo(corners[7].x, corners[7].y);
      ctx.lineTo(corners[6].x, corners[6].y);
      ctx.closePath();
      ctx.fill();
      
      // Add area label
      const center = project(ilot.x + ilot.width/2, ilot.y + ilot.height/2, height + 100);
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${ilot.area.toFixed(1)}m²`, center.x, center.y);
    });
    
    // Draw corridors
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    corridors.forEach(corridor => {
      const start = project(corridor.x1, corridor.y1, 10);
      const end = project(corridor.x2, corridor.y2, 10);
      
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });
    
  }, [floorPlan, ilots, corridors, walls]);
  
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="w-full h-full bg-gray-100"
      style={{ imageRendering: 'crisp-edges' }}
    />
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
      {/* 3D Visualization */}
      <div className="w-full h-full">
        <Simple3DVisualization 
          floorPlan={floorPlan}
          ilots={ilots}
          corridors={corridors}
          walls={walls}
        />
      </div>

      {/* Control Panel */}
      <Card className="absolute top-4 left-4 w-80 bg-black/90 text-white border-gray-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">3D Walkthrough</h3>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Button
                onClick={() => setViewMode(viewMode === 'isometric' ? 'perspective' : 'isometric')}
                variant="outline"
                size="sm"
                className="flex-1 text-white border-white/20 hover:bg-white/10"
              >
                <Eye className="w-4 h-4 mr-2" />
                {viewMode === 'isometric' ? 'Perspective' : 'Isometric'}
              </Button>
              
              <Button
                onClick={() => setShowLabels(!showLabels)}
                variant="outline"
                size="sm"
                className="flex-1 text-white border-white/20 hover:bg-white/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                {showLabels ? 'Hide Labels' : 'Show Labels'}
              </Button>
            </div>
            
            <div className="text-sm text-gray-300">
              <div className="mb-2">
                <strong>3D Features:</strong>
              </div>
              <ul className="space-y-1 text-xs">
                <li>• Isometric 3D projection</li>
                <li>• Realistic desk visualization</li>
                <li>• Wall height and depth</li>
                <li>• Corridor network display</li>
                <li>• Precise area measurements</li>
              </ul>
            </div>
            
            <div className="text-sm text-gray-300">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Îlots: {ilots.length}</div>
                <div>Corridors: {corridors.length}</div>
                <div>Walls: {walls.length}</div>
                <div>Total Area: {floorPlan.spaceAnalysis.totalArea.toFixed(1)}m²</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-sm">
        <div className="font-semibold mb-2">3D Visualization Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>Walls (2.7m height)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-700 rounded"></div>
            <span>Workstation Desks</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span>Corridor Network</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <span>Floor Surface</span>
          </div>
        </div>
      </div>
    </div>
  );
}