import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MousePointer, Ruler, ZoomIn } from 'lucide-react';

interface AnalysisToolsProps {
  selectedTool: 'select' | 'measure' | 'zoom';
  onToolChange: (tool: 'select' | 'measure' | 'zoom') => void;
}

export default function AnalysisTools({ selectedTool, onToolChange }: AnalysisToolsProps) {
  const tools = [
    { id: 'select' as const, icon: MousePointer, label: 'Select', description: 'Select and move objects' },
    { id: 'measure' as const, icon: Ruler, label: 'Measure', description: 'Measure distances and areas' },
    { id: 'zoom' as const, icon: ZoomIn, label: 'Zoom', description: 'Zoom and pan view' }
  ];

  return (
    <Card className="border-0 shadow-none m-2 sm:m-4">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
          <Ruler className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          Analysis Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 sm:space-y-2 px-3 sm:px-6">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={selectedTool === tool.id ? "default" : "ghost"}
            className="w-full justify-start text-xs sm:text-sm py-1 sm:py-2"
            onClick={() => onToolChange(tool.id)}
          >
            <tool.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            {tool.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}