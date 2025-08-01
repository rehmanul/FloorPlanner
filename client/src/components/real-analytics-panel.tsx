import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  TrendingUp, 
  Calculator, 
  Maximize, 
  Users, 
  MapPin,
  Target,
  Gauge
} from 'lucide-react';
import { ProcessedFloorPlan, Ilot, Corridor, LayoutAnalytics } from '@shared/schema';

interface RealAnalyticsPanelProps {
  floorPlan: ProcessedFloorPlan | null;
  ilots: Ilot[];
  corridors: Corridor[];
  analytics?: LayoutAnalytics;
}

export default function RealAnalyticsPanel({ 
  floorPlan, 
  ilots, 
  corridors, 
  analytics 
}: RealAnalyticsPanelProps) {
  
  // Calculate real metrics from actual data
  const calculateRealMetrics = () => {
    if (!floorPlan) {
      return {
        totalArea: 0,
        usedArea: 0,
        utilizationRate: 0,
        corridorCoverage: 0,
        averageIlotSize: 0,
        accessibilityScore: 0
      };
    }

    const totalFloorArea = floorPlan.spaceAnalysis.usableArea; // m²
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0); // m²
    const utilizationRate = totalFloorArea > 0 ? (totalIlotArea / totalFloorArea) * 100 : 0;
    
    const totalCorridorLength = corridors.reduce((sum, corridor) => 
      sum + Math.sqrt(
        Math.pow(corridor.x2 - corridor.x1, 2) + 
        Math.pow(corridor.y2 - corridor.y1, 2)
      ) / 1000, 0 // Convert mm to meters
    );
    
    const corridorArea = corridors.reduce((sum, corridor) => 
      sum + (corridor.width / 1000) * (Math.sqrt(
        Math.pow(corridor.x2 - corridor.x1, 2) + 
        Math.pow(corridor.y2 - corridor.y1, 2)
      ) / 1000), 0
    );
    
    const corridorCoverage = totalFloorArea > 0 ? (corridorArea / totalFloorArea) * 100 : 0;
    const averageIlotSize = ilots.length > 0 ? totalIlotArea / ilots.length : 0;
    
    // Calculate accessibility score based on corridor network connectivity
    const accessibilityScore = Math.min(100, 
      (corridors.length * 10) + // More corridors = better access
      (totalCorridorLength * 5) + // Longer network = better coverage
      (ilots.length > 0 ? 40 : 0) // Base score for having îlots
    );

    return {
      totalArea: totalFloorArea,
      usedArea: totalIlotArea,
      utilizationRate,
      corridorCoverage,
      averageIlotSize,
      accessibilityScore,
      totalCorridorLength
    };
  };

  const metrics = calculateRealMetrics();

  // Get distribution of îlot types
  const getIlotDistribution = () => {
    const distribution = ilots.reduce((acc, ilot) => {
      acc[ilot.type] = (acc[ilot.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(distribution).map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
      percentage: ilots.length > 0 ? (count / ilots.length) * 100 : 0
    }));
  };

  const distribution = getIlotDistribution();

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2" />
          Real-time Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Space Utilization */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 flex items-center">
              <Maximize className="w-4 h-4 mr-2" />
              Space Utilization
            </span>
            <Badge variant="outline" className="text-xs">
              {metrics.utilizationRate.toFixed(1)}%
            </Badge>
          </div>
          <Progress value={metrics.utilizationRate} className="w-full" />
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Total: {metrics.totalArea.toFixed(1)}m²</div>
            <div>Used: {metrics.usedArea.toFixed(1)}m²</div>
          </div>
        </div>

        <Separator />

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-blue-700">{ilots.length}</div>
            <div className="text-xs text-blue-600">Total Îlots</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-bold text-green-700">{corridors.length}</div>
            <div className="text-xs text-green-600">Corridors</div>
          </div>
        </div>

        <Separator />

        {/* Performance Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Gauge className="w-4 h-4 mr-2" />
            Performance Metrics
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Accessibility Score</span>
              <div className="flex items-center">
                <Progress value={metrics.accessibilityScore} className="w-16 h-2 mr-2" />
                <span className="text-xs font-medium">{metrics.accessibilityScore.toFixed(0)}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Corridor Coverage</span>
              <div className="flex items-center">
                <Progress value={metrics.corridorCoverage} className="w-16 h-2 mr-2" />
                <span className="text-xs font-medium">{metrics.corridorCoverage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Îlot Distribution */}
        {distribution.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Îlot Distribution
            </h4>
            <div className="space-y-2">
              {distribution.map(({ type, count, percentage }) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-xs text-gray-600">{type}</span>
                  </div>
                  <div className="text-xs font-medium">
                    {count} ({percentage.toFixed(0)}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Detailed Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Detailed Metrics
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Average Îlot Size:</span>
              <span className="font-medium">{metrics.averageIlotSize.toFixed(2)}m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Corridor Length:</span>
              <span className="font-medium">{metrics.totalCorridorLength?.toFixed(1) || 0}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Floor Plan Efficiency:</span>
              <span className="font-medium">{floorPlan?.spaceAnalysis.efficiency.toFixed(1) || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Wall Area:</span>
              <span className="font-medium">{floorPlan?.spaceAnalysis.wallArea.toFixed(1) || 0}m²</span>
            </div>
          </div>
        </div>

        {/* Algorithm Information */}
        {analytics && (
          <>
            <Separator />
            <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
              <div className="font-medium mb-1">Generated using:</div>
              <div className="capitalize">{analytics.algorithm || 'intelligent'} algorithm</div>
              <div className="mt-1">
                Density: {analytics.densityAchieved.toFixed(1)} îlots/100m²
              </div>
            </div>
          </>
        )}
        
        {/* Real-time Status */}
        <div className="flex items-center justify-center p-2 bg-green-50 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          <span className="text-xs text-green-700 font-medium">Live Analytics</span>
        </div>
      </CardContent>
    </Card>
  );
}