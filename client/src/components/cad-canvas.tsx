import { forwardRef, useEffect, useRef, useImperativeHandle, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { ProcessedFloorPlan, Ilot, Corridor } from "@shared/schema";
import { CanvasRenderer } from "@/lib/canvas-renderer";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const [scale, setScale] = useState(1);
  const [processTime, setProcessTime] = useState(0);

  useImperativeHandle(ref, () => canvasRef.current!, []);

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }
  }, []);

  // Render floor plan and elements
  useEffect(() => {
    if (rendererRef.current && canvasRef.current) {
      rendererRef.current.render({
        floorPlan,
        ilots: layers.ilots ? ilots : [],
        corridors: layers.corridors ? corridors : [],
        layers,
        scale
      });
    }
  }, [floorPlan, ilots, corridors, layers, scale]);

  // Update process time
  useEffect(() => {
    const interval = setInterval(() => {
      setProcessTime(prev => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Resize canvas
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;
        
        if (rendererRef.current) {
          rendererRef.current.resize(container.clientWidth, container.clientHeight);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleFitToView = () => {
    setScale(1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Toolbar */}
      <div className="bg-gray-100 border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFitToView}
              title="Fit to View"
            >
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
          <div className="h-6 w-px bg-gray-300"></div>
          <div className="text-sm font-mono text-gray-600">
            Scale: <span>1:{Math.round(100 / scale)}</span> | Grid: <span>1.0m</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm font-mono text-gray-600">
            Processing Time: <span>{processTime.toFixed(1)}s</span>
          </div>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            Real-time Mode
          </Button>
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-50">
        <canvas
          ref={canvasRef}
          className={`cad-canvas w-full h-full bg-white ${
            selectedTool === 'select' ? 'cursor-default' :
            selectedTool === 'measure' ? 'cursor-crosshair' :
            'cursor-zoom-in'
          }`}
          width={1200}
          height={800}
        />

        {/* Processing Overlay */}
        {processing && (
          <div className="processing-overlay absolute inset-0 flex items-center justify-center">
            <Card className="max-w-md w-full mx-4">
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing CAD File</h3>
                <p className="text-sm text-gray-600 mb-4">{processingStage}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">{processingProgress}% Complete</div>
              </div>
            </Card>
          </div>
        )}

        {/* Sample Floor Plan (when no real data) */}
        {!floorPlan && !processing && (
          <div className="absolute inset-4 bg-gray-50 border-2 border-gray-300 rounded-lg overflow-hidden">
            <svg viewBox="0 0 800 600" className="w-full h-full">
              <rect width="800" height="600" fill="#F8F9FA"/>
              
              {/* Grid Pattern */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="800" height="600" fill="url(#grid)"/>
              
              {/* Sample walls and elements matching reference images */}
              <g stroke="var(--cad-wall)" strokeWidth="8" fill="none">
                <rect x="50" y="50" width="700" height="500"/>
              </g>
              
              <g stroke="var(--cad-wall)" strokeWidth="6" fill="none">
                <line x1="200" y1="50" x2="200" y2="250"/>
                <line x1="200" y1="300" x2="200" y2="550"/>
                <line x1="350" y1="50" x2="350" y2="180"/>
                <line x1="350" y1="220" x2="350" y2="380"/>
                <line x1="350" y1="420" x2="350" y2="550"/>
                <line x1="500" y1="50" x2="500" y2="300"/>
                <line x1="500" y1="350" x2="500" y2="550"/>
                <line x1="650" y1="100" x2="650" y2="250"/>
                <line x1="650" y1="300" x2="650" y2="450"/>
                
                <line x1="50" y1="200" x2="200" y2="200"/>
                <line x1="50" y1="350" x2="200" y2="350"/>
                <line x1="200" y1="380" x2="350" y2="380"/>
                <line x1="350" y1="300" x2="500" y2="300"/>
                <line x1="500" y1="200" x2="650" y2="200"/>
                <line x1="200" y1="450" x2="350" y2="450"/>
                <line x1="500" y1="450" x2="650" y2="450"/>
              </g>
              
              {layers.restricted && (
                <g fill="var(--cad-restricted)" opacity="0.7">
                  <rect x="150" y="150" width="40" height="40"/>
                  <rect x="150" y="400" width="40" height="40"/>
                </g>
              )}
              
              {layers.entrances && (
                <>
                  <g fill="var(--cad-entrance)" opacity="0.7">
                    <rect x="45" y="500" width="10" height="40"/>
                    <rect x="345" y="45" width="10" height="10"/>
                  </g>
                  <g stroke="var(--cad-entrance)" strokeWidth="2" fill="none" opacity="0.7">
                    <path d="M 50 500 A 30 30 0 0 0 80 530"/>
                    <path d="M 350 50 A 25 25 0 0 1 375 75"/>
                  </g>
                </>
              )}
              
              {layers.ilots && ilots.length > 0 && (
                <g fill="var(--cad-ilot)" stroke="#65A30D" strokeWidth="2" opacity="0.8">
                  {ilots.map(ilot => (
                    <rect
                      key={ilot.id}
                      x={ilot.x}
                      y={ilot.y}
                      width={ilot.width}
                      height={ilot.height}
                    />
                  ))}
                </g>
              )}
              
              {layers.corridors && corridors.length > 0 && (
                <g stroke="var(--cad-corridor)" strokeWidth="3" fill="none" opacity="0.8">
                  {corridors.map(corridor => (
                    <line
                      key={corridor.id}
                      x1={corridor.x1}
                      y1={corridor.y1}
                      x2={corridor.x2}
                      y2={corridor.y2}
                    />
                  ))}
                </g>
              )}
              
              {layers.labels && ilots.length > 0 && (
                <g fontFamily="Roboto Mono" fontSize="10" fill="#374151">
                  {ilots.map(ilot => (
                    <text
                      key={`${ilot.id}-label`}
                      x={ilot.x + ilot.width / 2}
                      y={ilot.y + ilot.height / 2}
                      textAnchor="middle"
                    >
                      {ilot.area.toFixed(1)}m²
                    </text>
                  ))}
                </g>
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
});

CADCanvas.displayName = "CADCanvas";
export default CADCanvas;
