import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProcessedFloorPlan, LayoutAnalytics } from "@shared/schema";

interface AnalyticsPanelProps {
  floorPlan: ProcessedFloorPlan | null;
  analytics: LayoutAnalytics | null;
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
  settings,
  onSettingsChange
}: AnalyticsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Space Analytics */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Space Analytics</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="analysis-card text-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold font-mono">
                {floorPlan?.spaceAnalysis.totalArea.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm opacity-90">Total Area (m²)</div>
            </CardContent>
          </Card>
          <Card className="analysis-card text-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold font-mono">
                {floorPlan?.spaceAnalysis.usableArea.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm opacity-90">Usable Area (m²)</div>
            </CardContent>
          </Card>
          <Card className="analysis-card text-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold font-mono">
                {analytics?.totalIlotArea.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm opacity-90">Îlot Area (m²)</div>
            </CardContent>
          </Card>
          <Card className="analysis-card text-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold font-mono">
                {analytics?.efficiency.toFixed(1) || '0.0'}%
              </div>
              <div className="text-sm opacity-90">Efficiency</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Number of Îlots:</span>
            <span className="font-mono font-semibold">{analytics?.ilotCount || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Corridor Length:</span>
            <span className="font-mono font-semibold">{analytics?.corridorLength.toFixed(1) || '0.0'}m</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Average Îlot Size:</span>
            <span className="font-mono font-semibold">{analytics?.averageIlotSize.toFixed(1) || '0.0'}m²</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Accessibility Score:</span>
            <span className="font-mono font-semibold text-green-600">{analytics?.accessibilityScore.toFixed(1) || '0.0'}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fire Compliance:</span>
            <span className="font-mono font-semibold text-green-600">{analytics?.fireCompliance.toFixed(0) || '0'}%</span>
          </div>
        </div>
      </div>

      {/* Îlot Distribution */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Îlot Distribution</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-200 rounded mr-2"></div>
              <span className="text-sm">Small (≤ 5m²)</span>
            </div>
            <span className="font-mono text-sm font-semibold">{analytics?.distribution.small || 0} units</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-400 rounded mr-2"></div>
              <span className="text-sm">Medium (5-10m²)</span>
            </div>
            <span className="font-mono text-sm font-semibold">{analytics?.distribution.medium || 0} units</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-600 rounded mr-2"></div>
              <span className="text-sm">Large (10-15m²)</span>
            </div>
            <span className="font-mono text-sm font-semibold">{analytics?.distribution.large || 0} units</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-800 rounded mr-2"></div>
              <span className="text-sm">XLarge (&gt; 15m²)</span>
            </div>
            <span className="font-mono text-sm font-semibold">{analytics?.distribution.xlarge || 0} units</span>
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
                <SelectItem value="grid">Grid-based</SelectItem>
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
                <SelectItem value="corridor">Corridor Minimization</SelectItem>
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
          </div>
        </div>
      </div>
    </div>
  );
}
