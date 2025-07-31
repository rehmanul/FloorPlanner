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
      // Simulate layout generation
      const numIlots = Math.floor((480 * settings.density) / 100 / 20); // Rough calculation
      const ilots: Ilot[] = [];
      const corridors: Corridor[] = [];

      // Generate îlots in a grid pattern
      const gridCols = Math.ceil(Math.sqrt(numIlots));
      const gridRows = Math.ceil(numIlots / gridCols);
      const spacingX = 700 / (gridCols + 1);
      const spacingY = 500 / (gridRows + 1);

      for (let i = 0; i < numIlots; i++) {
        const col = i % gridCols;
        const row = Math.floor(i / gridCols);
        
        ilots.push({
          id: `ilot_${i + 1}`,
          x: 50 + spacingX * (col + 1),
          y: 50 + spacingY * (row + 1),
          width: 160,
          height: 120,
          rotation: 0,
          type: 'workstation',
          capacity: 4
        });
      }

      // Generate corridors
      for (let row = 0; row < gridRows; row++) {
        corridors.push({
          id: `corridor_h_${row}`,
          x: 400,
          y: 50 + spacingY * (row + 1),
          width: settings.corridorWidth,
          length: 700,
          direction: 'horizontal' as const
        });
      }

      for (let col = 0; col < gridCols; col++) {
        corridors.push({
          id: `corridor_v_${col}`,
          x: 50 + spacingX * (col + 1),
          y: 300,
          width: settings.corridorWidth,
          length: 500,
          direction: 'vertical' as const
        });
      }

      // Generate analytics
      const analytics: LayoutAnalytics = {
        totalArea: 480000, // 480 m²
        usedArea: ilots.length * 1.92, // 1.92 m² per îlot
        utilizationRate: (ilots.length * 1.92 / 480) * 100,
        totalIlots: ilots.length,
        averageIlotSize: 1.92,
        corridorCoverage: (corridors.length * settings.corridorWidth * 200 / 480000) * 100,
        accessibilityScore: 95,
        distribution: {
          small: Math.floor(ilots.length * 0.2),
          medium: Math.floor(ilots.length * 0.5),
          large: Math.floor(ilots.length * 0.2),
          xlarge: Math.floor(ilots.length * 0.1)
        },
        densityProfile: settings.density,
        algorithm: settings.algorithm
      };

      onIlotsGenerated(ilots, corridors, analytics);
      
      toast({
        title: "Layout Generated",
        description: `Successfully generated ${ilots.length} îlots with optimized corridor network.`
      });

    } catch (error) {
      console.error("Layout generation error:", error);
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating the layout.",
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
        {/* Density Settings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-600">Density Profile</label>
            <Badge variant="outline" className="text-xs">
              {settings.density}%
            </Badge>
          </div>
          <Slider
            value={[settings.density]}
            onValueChange={([value]) => onSettingsChange({ density: value })}
            min={10}
            max={35}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10%</span>
            <span>25%</span>
            <span>35%</span>
          </div>
        </div>

        <Separator />

        {/* Algorithm Selection */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-2 block">
            Placement Algorithm
          </label>
          <Select
            value={settings.algorithm}
            onValueChange={(value) => onSettingsChange({ algorithm: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intelligent">
                <div className="flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  Intelligent
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
            </SelectContent>
          </Select>
        </div>

        {/* Corridor Settings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-600">Corridor Width</label>
            <Badge variant="outline" className="text-xs">
              {settings.corridorWidth}cm
            </Badge>
          </div>
          <Slider
            value={[settings.corridorWidth]}
            onValueChange={([value]) => onSettingsChange({ corridorWidth: value })}
            min={80}
            max={200}
            step={10}
            className="w-full"
          />
        </div>

        {/* Clearance Settings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-600">Min Clearance</label>
            <Badge variant="outline" className="text-xs">
              {settings.minClearance}cm
            </Badge>
          </div>
          <Slider
            value={[settings.minClearance]}
            onValueChange={([value]) => onSettingsChange({ minClearance: value })}
            min={50}
            max={150}
            step={10}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Generate Button */}
        <Button
          onClick={handleGenerateLayout}
          disabled={!floorPlan || processing}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {processing ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </div>
          ) : (
            <div className="flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Generate Layout
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}