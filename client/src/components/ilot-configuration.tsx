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

  const handleGenerateLayout = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('Generate Layout button clicked!', { floorPlan: !!floorPlan, processing });
    
    if (!floorPlan) {
      toast({
        title: "No Floor Plan",
        description: "Please upload a floor plan first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Import the real placement engine
      const { RealIlotPlacementEngine } = await import('@/lib/real-ilot-placement');

      // Convert settings to expected format
      const placementSettings = {
        ilotDimensions: { width: 3000, height: 2000 }, // Default îlot size in mm
        corridorWidth: settings.corridorWidth,
        algorithm: settings.algorithm as 'intelligent' | 'grid' | 'genetic' | 'simulated-annealing',
        density: settings.density / 100, // Convert to decimal
        spacing: 500, // Default spacing
        minClearance: settings.minClearance
      };

      // Create placement engine with converted settings
      const placementEngine = new RealIlotPlacementEngine(floorPlan, placementSettings);

      // Generate real layout
      const result = await new Promise<any>((resolve) => {
        // Run in a setTimeout to allow UI to update
        setTimeout(() => {
          const layout = placementEngine.generateLayout();
          resolve(layout);
        }, 100);
      });

      // Convert analytics to match expected interface
      const analytics: LayoutAnalytics = {
        totalArea: result.analytics.totalArea,
        ilotArea: result.ilots.reduce((sum: number, ilot: Ilot) => sum + ilot.area, 0),
        corridorLength: result.analytics.corridorLength,
        occupancyRate: result.analytics.occupancyRate / 100,
        efficiency: result.analytics.efficiency / 100,
        accessibilityScore: Math.min(1, result.analytics.efficiency / 80) // Convert efficiency to accessibility score
      };

      onIlotsGenerated(result.ilots, result.corridors, analytics);

      toast({
        title: "Layout Generated Successfully",
        description: `Generated ${result.ilots.length} îlots with ${result.corridors.length} corridors using ${settings.algorithm} algorithm.`,
      });
    } catch (error) {
      console.error('Layout generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate îlot layout. Please try again.",
        variant: "destructive"
      });
    }
  }, [floorPlan, settings, onIlotsGenerated, toast]);

  return (
    <Card className="border-0 shadow-none relative z-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          Îlot Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-20">
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
          type="button"
          onClick={handleGenerateLayout}
          disabled={!floorPlan || processing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white relative z-10"
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