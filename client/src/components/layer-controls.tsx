import { Checkbox } from "@/components/ui/checkbox";

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
    { key: 'walls' as const, label: 'Walls (MUR)', color: 'bg-cad-wall' },
    { key: 'restricted' as const, label: 'Restricted Areas', color: 'bg-cad-restricted' },
    { key: 'entrances' as const, label: 'Entrances/Exits', color: 'bg-cad-entrance' },
    { key: 'ilots' as const, label: 'Îlots', color: 'bg-cad-ilot' },
    { key: 'corridors' as const, label: 'Corridors', color: 'bg-cad-corridor' },
    { key: 'labels' as const, label: 'Area Labels', color: 'bg-gray-500' },
  ];

  return (
    <div className="p-6 flex-1">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Layer Visibility</h3>
      <div className="space-y-3">
        {layerConfig.map(({ key, label, color }) => (
          <div key={key} className="flex items-center space-x-3">
            <Checkbox
              checked={layers[key]}
              onCheckedChange={(checked) => onLayerToggle(key, !!checked)}
              className="h-4 w-4"
            />
            <div className={`w-4 h-4 rounded ${color}`} />
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
