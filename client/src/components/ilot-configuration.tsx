import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Grid, Brain, Zap, Settings } from 'lucide-react';
import { ProcessedFloorPlan, Ilot, Corridor, LayoutAnalytics } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface IlotConfigurationProps {
  settings: {
    density: number;
    corridorWidth: number;
    minClearance: number;
    algorithm: string;
  };
  floorPlan: ProcessedFloorPlan | null;
  onSettingsChange: (settings: Partial<{
    density: number;
    corridorWidth: number;
    minClearance: number;
    algorithm: string;
  }>) => void;
  onIlotsGenerated: (ilots: Ilot[], corridors: Corridor[], analytics: LayoutAnalytics) => void;
  processing: boolean;
}

export default function IlotConfiguration({ 
  settings, 
  floorPlan, 
  onSettingsChange, 
  onIlotsGenerated, 
  processing 
}: IlotConfigurationProps) {
  const { toast } = useToast();

  const handleGenerateLayout = useCallback(async () => {
    if (!floorPlan) {
      toast({
        title: "No Floor Plan",
        description: "Please upload a floor plan first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Use real îlot placement engine
      const { RealIlotPlacementEngine } = await import('../lib/real-ilot-placement');
      const placementSettings = {
        density: settings.density,
        corridorWidth: settings.corridorWidth,
        minClearance: settings.minClearance,
        algorithm: settings.algorithm as 'intelligent' | 'grid' | 'genetic' | 'simulated_annealing'
      };
      
      const engine = new RealIlotPlacementEngine(floorPlan, placementSettings);
      const { ilots, corridors } = engine.generateLayout();

      // Calculate real analytics based on actual placement
      const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
      const corridorLength = corridors.reduce((sum, corridor) => 
        sum + Math.sqrt(Math.pow(corridor.x2 - corridor.x1, 2) + Math.pow(corridor.y2 - corridor.y1, 2)) / 1000, 0
      ); // Convert mm to meters
      
      const analytics: LayoutAnalytics = {
        totalIlots: ilots.length,
        totalArea: totalIlotArea,
        avgIlotSize: ilots.length > 0 ? totalIlotArea / ilots.length : 0,
        corridorLength,
        spaceEfficiency: (totalIlotArea / (floorPlan.spaceAnalysis.usableArea || 1)) * 100,
        densityAchieved: (ilots.length / (floorPlan.spaceAnalysis.usableArea || 1)) * 100
      };

      onIlotsGenerated(ilots, corridors, analytics);
      
      toast({
        title: "Layout Generated",
        description: `Successfully generated ${ilots.length} îlots using ${settings.algorithm} algorithm with ${corridors.length} corridors.`
      });

    } catch (error) {
      console.error("Layout generation error:", error);
      toast({
        title: "Generation Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  }, [floorPlan, settings, onIlotsGenerated, toast]);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          Îlot Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Density Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Density</label>
            <Badge variant="outline" className="text-xs">
              {settings.density} îlots/100m²
            </Badge>
          </div>
          <Slider
            value={[settings.density]}
            onValueChange={(value) => onSettingsChange({ density: value[0] })}
            max={25}
            min={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low density</span>
            <span>High density</span>
          </div>
        </div>

        <Separator />

        {/* Corridor Width */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Corridor Width</label>
            <Badge variant="outline" className="text-xs">
              {settings.corridorWidth}mm
            </Badge>
          </div>
          <Slider
            value={[settings.corridorWidth]}
            onValueChange={(value) => onSettingsChange({ corridorWidth: value[0] })}
            max={2000}
            min={800}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>800mm</span>
            <span>2000mm</span>
          </div>
        </div>

        <Separator />

        {/* Minimum Clearance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Min Clearance</label>
            <Badge variant="outline" className="text-xs">
              {settings.minClearance}mm
            </Badge>
          </div>
          <Slider
            value={[settings.minClearance]}
            onValueChange={(value) => onSettingsChange({ minClearance: value[0] })}
            max={1000}
            min={200}
            step={50}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>200mm</span>
            <span>1000mm</span>
          </div>
        </div>

        <Separator />

        {/* Algorithm Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Placement Algorithm</label>
          <Select
            value={settings.algorithm}
            onValueChange={(value) => onSettingsChange({ algorithm: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intelligent">
                <div className="flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  Intelligent Placement
                </div>
              </SelectItem>
              <SelectItem value="grid">
                <div className="flex items-center">
                  <Grid className="w-4 h-4 mr-2" />
                  Grid Pattern
                </div>
              </SelectItem>
              <SelectItem value="genetic">
                <div className="flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  Genetic Algorithm
                </div>
              </SelectItem>
              <SelectItem value="simulated_annealing">
                <div className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Simulated Annealing
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Generate Button */}
        <Button
          onClick={handleGenerateLayout}
          disabled={!floorPlan || processing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {processing ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Layout...
            </div>
          ) : (
            'Generate Îlot Layout'
          )}
        </Button>

        {/* Algorithm Info */}
        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
          <div className="font-medium mb-1">Algorithm Details:</div>
          {settings.algorithm === 'intelligent' && 
            "Uses space analysis and collision detection for optimal placement with varied îlot sizes."
          }
          {settings.algorithm === 'grid' && 
            "Places îlots in a regular grid pattern with consistent spacing."
          }
          {settings.algorithm === 'genetic' && 
            "Evolves layouts through multiple generations to find optimal arrangements."
          }
          {settings.algorithm === 'simulated_annealing' && 
            "Uses thermodynamic simulation to escape local optimization minima."
          }
        </div>
      </CardContent>
    </Card>
  );
}