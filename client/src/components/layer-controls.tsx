import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Layers, Eye, EyeOff } from 'lucide-react';

interface LayerControlsProps {
  layers: {
    walls: boolean;
    restricted: boolean;
    entrances: boolean;
    ilots: boolean;
    corridors: boolean;
    labels: boolean;
  };
  onLayerToggle: (layer: keyof LayerControlsProps['layers'], visible: boolean) => void;
}

export default function LayerControls({ layers, onLayerToggle }: LayerControlsProps) {
  const layerConfig = [
    { key: 'walls' as const, label: 'Walls', color: '#666', description: 'Structural walls' },
    { key: 'restricted' as const, label: 'Restricted', color: '#dc267f', description: 'Restricted areas' },
    { key: 'entrances' as const, label: 'Entrances', color: '#ff6d6a', description: 'Entry points' },
    { key: 'ilots' as const, label: 'Îlots', color: '#4a90e2', description: 'Workspace pods' },
    { key: 'corridors' as const, label: 'Corridors', color: '#ffc107', description: 'Walkways' },
    { key: 'labels' as const, label: 'Labels', color: '#333', description: 'Text labels' }
  ];

  const visibleLayers = Object.values(layers).filter(Boolean).length;

  return (
    <Card className="border-0 shadow-none m-2 sm:m-4">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Layer Controls
          </div>
          <Badge variant="secondary" className="text-xs">
            {visibleLayers}/6
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
        {layerConfig.map((layer) => (
          <div key={layer.key} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: layer.color }}
              />
              <div>
                <div className="text-sm font-medium text-gray-700">
                  {layer.label}
                </div>
                <div className="text-xs text-gray-500">
                  {layer.description}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {layers[layer.key] ? (
                <Eye className="w-4 h-4 text-gray-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-300" />
              )}
              <Switch
                checked={layers[layer.key]}
                onCheckedChange={(checked) => onLayerToggle(layer.key, checked)}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}