import { Button } from "@/components/ui/button";
import { MousePointer, Ruler, ZoomIn } from "lucide-react";

interface AnalysisToolsProps {
  selectedTool: 'select' | 'measure' | 'zoom';
  onToolChange: (tool: 'select' | 'measure' | 'zoom') => void;
}

export default function AnalysisTools({ selectedTool, onToolChange }: AnalysisToolsProps) {
  const tools = [
    { id: 'select' as const, icon: MousePointer, label: 'Select' },
    { id: 'measure' as const, icon: Ruler, label: 'Measure' },
    { id: 'zoom' as const, icon: ZoomIn, label: 'Zoom' },
  ];

  return (
    <div className="p-6 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Tools</h3>
      <div className="grid grid-cols-3 gap-2">
        {tools.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            variant={selectedTool === id ? "default" : "outline"}
            className={`flex flex-col items-center p-3 h-auto ${
              selectedTool === id ? 'tool-active' : ''
            }`}
            onClick={() => onToolChange(id)}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
