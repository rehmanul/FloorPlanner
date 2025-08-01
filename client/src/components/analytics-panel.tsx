
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProcessedFloorPlan, LayoutAnalytics, Ilot, Corridor } from "@shared/schema";

interface AnalyticsPanelProps {
  floorPlan: ProcessedFloorPlan | null;
  analytics: LayoutAnalytics | null;
  ilots: Ilot[];
  corridors: Corridor[];
  settings: {
    density: number;
    corridorWidth: number;
    minClearance: number;
    algorithm: string;
  };
  onSettingsChange: (settings: Partial<AnalyticsPanelProps['settings']>) => void;
}

export default function AnalyticsPanel({
  floorPlan,
  analytics,
  ilots,
  corridors,
  settings,
  onSettingsChange
}: AnalyticsPanelProps) {
  // Real-time analytics calculations
  const realTimeAnalytics = calculateRealTimeAnalytics(floorPlan, ilots, corridors);

  return (
    <div className="flex flex-col h-full">
      {/* Real Space Analytics */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Space Analytics</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="analysis-card text-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold font-mono">
                {floorPlan?.spaceAnalysis?.totalArea?.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm opacity-90">Total Area (m²)</div>
            </CardContent>
          </Card>
          <Card className="analysis-card text-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold font-mono">
                {floorPlan?.spaceAnalysis?.usableArea?.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm opacity-90">Usable Area (m²)</div>
            </CardContent>
          </Card>
          <Card className="analysis-card text-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold font-mono">
                {realTimeAnalytics.totalIlotArea.toFixed(1)}
              </div>
              <div className="text-sm opacity-90">Îlot Area (m²)</div>
            </CardContent>
          </Card>
          <Card className="analysis-card text-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold font-mono">
                {realTimeAnalytics.efficiency.toFixed(1)}%
              </div>
              <div className="text-sm opacity-90">Efficiency</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Real Detailed Metrics */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Number of Îlots:</span>
            <span className="font-mono font-semibold">{realTimeAnalytics.ilotCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Corridor Length:</span>
            <span className="font-mono font-semibold">{realTimeAnalytics.corridorLength.toFixed(1)}m</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Average Îlot Size:</span>
            <span className="font-mono font-semibold">{realTimeAnalytics.averageIlotSize.toFixed(1)}m²</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Accessibility Score:</span>
            <span className={`font-mono font-semibold ${getScoreColor(realTimeAnalytics.accessibilityScore)}`}>
              {realTimeAnalytics.accessibilityScore.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fire Compliance:</span>
            <span className={`font-mono font-semibold ${getScoreColor(realTimeAnalytics.fireCompliance)}`}>
              {realTimeAnalytics.fireCompliance.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Circulation Efficiency:</span>
            <span className={`font-mono font-semibold ${getScoreColor(realTimeAnalytics.circulationEfficiency)}`}>
              {realTimeAnalytics.circulationEfficiency.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Real Îlot Distribution */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Îlot Distribution</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-200 rounded mr-2"></div>
              <span className="text-sm">Small (≤ 5m²)</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {realTimeAnalytics.distribution.small} units
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-400 rounded mr-2"></div>
              <span className="text-sm">Medium (5-10m²)</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {realTimeAnalytics.distribution.medium} units
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-600 rounded mr-2"></div>
              <span className="text-sm">Large (10-15m²)</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {realTimeAnalytics.distribution.large} units
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-800 rounded mr-2"></div>
              <span className="text-sm">XLarge (&gt; 15m²)</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {realTimeAnalytics.distribution.xlarge} units
            </span>
          </div>
        </div>
      </div>

      {/* Real Technical Analysis */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Analysis</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Wall Area:</span>
            <span className="font-mono font-semibold">
              {floorPlan?.spaceAnalysis?.wallArea?.toFixed(1) || '0.0'}m²
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Door Count:</span>
            <span className="font-mono font-semibold">{floorPlan?.doors?.length || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Window Count:</span>
            <span className="font-mono font-semibold">{floorPlan?.windows?.length || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Restricted Areas:</span>
            <span className="font-mono font-semibold">{floorPlan?.restrictedAreas?.length || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Wall Count:</span>
            <span className="font-mono font-semibold">{floorPlan?.walls?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Algorithm Settings */}
      <div className="p-6 flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Algorithm Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Placement Algorithm</label>
            <Select
              value={settings.algorithm}
              onValueChange={(value) => onSettingsChange({ algorithm: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intelligent">Intelligent (AI-based)</SelectItem>
                <SelectItem value="grid">Adaptive Grid</SelectItem>
                <SelectItem value="genetic">Genetic Algorithm</SelectItem>
                <SelectItem value="annealing">Simulated Annealing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Optimization Priority</label>
            <Select defaultValue="area">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Maximum Area Utilization</SelectItem>
                <SelectItem value="accessibility">Accessibility Compliance</SelectItem>
                <SelectItem value="fire">Fire Safety Priority</SelectItem>
                <SelectItem value="flow">Circulation Optimization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 space-y-2">
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              Generate 3D View
            </Button>
            <Button variant="outline" className="w-full">
              Export Technical Report
            </Button>
            <Button variant="outline" className="w-full">
              Download DXF Layout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Real analytics calculation functions
function calculateRealTimeAnalytics(
  floorPlan: ProcessedFloorPlan | null, 
  ilots: Ilot[], 
  corridors: Corridor[]
) {
  if (!floorPlan || ilots.length === 0) {
    return {
      ilotCount: 0,
      totalIlotArea: 0,
      corridorLength: 0,
      averageIlotSize: 0,
      accessibilityScore: 0,
      fireCompliance: 0,
      circulationEfficiency: 0,
      efficiency: 0,
      distribution: { small: 0, medium: 0, large: 0, xlarge: 0 }
    };
  }

  // Calculate real metrics
  const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
  const averageIlotSize = ilots.length > 0 ? totalIlotArea / ilots.length : 0;
  const efficiency = floorPlan.spaceAnalysis.usableArea > 0 ? 
    (totalIlotArea / floorPlan.spaceAnalysis.usableArea) * 100 : 0;

  // Calculate corridor length
  const corridorLength = corridors.reduce((total, corridor) => {
    const length = Math.sqrt(
      Math.pow(corridor.x2 - corridor.x1, 2) + 
      Math.pow(corridor.y2 - corridor.y1, 2)
    );
    return total + length / 100; // Convert to meters
  }, 0);

  // Calculate distribution
  const distribution = ilots.reduce((dist, ilot) => {
    if (ilot.area <= 5) dist.small++;
    else if (ilot.area <= 10) dist.medium++;
    else if (ilot.area <= 15) dist.large++;
    else dist.xlarge++;
    return dist;
  }, { small: 0, medium: 0, large: 0, xlarge: 0 });

  // Calculate accessibility score
  const accessibilityScore = calculateAccessibilityScore(floorPlan, ilots, corridors);

  // Calculate fire compliance
  const fireCompliance = calculateFireCompliance(floorPlan, ilots, corridors);

  // Calculate circulation efficiency
  const circulationEfficiency = calculateCirculationEfficiency(floorPlan, ilots, corridors);

  return {
    ilotCount: ilots.length,
    totalIlotArea,
    corridorLength,
    averageIlotSize,
    accessibilityScore,
    fireCompliance,
    circulationEfficiency,
    efficiency,
    distribution
  };
}

function calculateAccessibilityScore(
  floorPlan: ProcessedFloorPlan, 
  ilots: Ilot[], 
  corridors: Corridor[]
): number {
  if (ilots.length === 0) return 0;

  let totalScore = 0;
  const maxDistanceToAccess = 300; // 3m maximum distance to corridor

  ilots.forEach(ilot => {
    // Find minimum distance to any corridor
    let minDistanceToCorridor = Infinity;
    
    corridors.forEach(corridor => {
      // Calculate distance from îlot center to corridor line
      const ilotCenter = { x: ilot.x + ilot.width / 2, y: ilot.y + ilot.height / 2 };
      const distance = distanceFromPointToLine(
        ilotCenter,
        { x: corridor.x1, y: corridor.y1 },
        { x: corridor.x2, y: corridor.y2 }
      );
      minDistanceToCorridor = Math.min(minDistanceToCorridor, distance);
    });

    // Score based on distance to nearest corridor
    const accessibilityScore = Math.max(0, 1 - (minDistanceToCorridor / maxDistanceToAccess));
    totalScore += accessibilityScore;
  });

  return (totalScore / ilots.length) * 100;
}

function calculateFireCompliance(
  floorPlan: ProcessedFloorPlan, 
  ilots: Ilot[], 
  corridors: Corridor[]
): number {
  if (ilots.length === 0) return 100;

  const minCorridorWidth = 120; // cm
  const maxEgressDistance = 3000; // 30m in cm
  const minClearance = 80; // cm

  let complianceScore = 0;
  let totalChecks = 0;

  // Check egress distances from each îlot to nearest door
  ilots.forEach(ilot => {
    totalChecks++;
    const ilotCenter = { x: ilot.x + ilot.width / 2, y: ilot.y + ilot.height / 2 };
    
    let minDistanceToDoor = Infinity;
    floorPlan.doors.forEach(door => {
      const distance = Math.sqrt(
        Math.pow(door.center.x - ilotCenter.x, 2) + 
        Math.pow(door.center.y - ilotCenter.y, 2)
      );
      minDistanceToDoor = Math.min(minDistanceToDoor, distance);
    });

    if (minDistanceToDoor <= maxEgressDistance) {
      complianceScore++;
    }
  });

  // Check corridor widths
  corridors.forEach(corridor => {
    totalChecks++;
    if (corridor.width >= minCorridorWidth) {
      complianceScore++;
    }
  });

  // Check clearances between îlots
  ilots.forEach((ilot, i) => {
    ilots.forEach((otherIlot, j) => {
      if (i < j) { // Avoid double counting
        totalChecks++;
        const distance = calculateMinimumDistance(ilot, otherIlot);
        if (distance >= minClearance) {
          complianceScore++;
        }
      }
    });
  });

  return totalChecks > 0 ? (complianceScore / totalChecks) * 100 : 0;
}

function calculateCirculationEfficiency(
  floorPlan: ProcessedFloorPlan, 
  ilots: Ilot[], 
  corridors: Corridor[]
): number {
  if (corridors.length === 0) return 0;

  // Calculate total circulation area
  const totalCirculationArea = corridors.reduce((total, corridor) => {
    const length = Math.sqrt(
      Math.pow(corridor.x2 - corridor.x1, 2) + 
      Math.pow(corridor.y2 - corridor.y1, 2)
    );
    return total + (length * corridor.width) / 10000; // Convert to m²
  }, 0);

  // Efficiency is the ratio of îlot area to circulation area
  const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
  
  if (totalCirculationArea === 0) return 0;
  
  const efficiency = totalIlotArea / (totalIlotArea + totalCirculationArea);
  return efficiency * 100;
}

// Utility functions
function distanceFromPointToLine(point: any, lineStart: any, lineEnd: any): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));

  const xx = lineStart.x + param * C;
  const yy = lineStart.y + param * D;

  const dx = point.x - xx;
  const dy = point.y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateMinimumDistance(rect1: Ilot, rect2: Ilot): number {
  const dx = Math.max(0, Math.max(rect1.x - (rect2.x + rect2.width), rect2.x - (rect1.x + rect1.width)));
  const dy = Math.max(0, Math.max(rect1.y - (rect2.y + rect2.height), rect2.y - (rect1.y + rect1.height)));
  return Math.sqrt(dx * dx + dy * dy);
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

AnalyticsPanel.displayName = 'AnalyticsPanel';
