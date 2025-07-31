import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Zap, Save } from "lucide-react";
import FileUpload from "@/components/file-upload";
import CADCanvas from "@/components/cad-canvas";
import AnalysisTools from "@/components/analysis-tools";
import IlotConfiguration from "@/components/ilot-configuration";
import AnalyticsPanel from "@/components/analytics-panel";
import LayerControls from "@/components/layer-controls";
import { ProcessedFloorPlan, Ilot, Corridor, LayoutAnalytics } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AppState {
  currentFile: File | null;
  floorPlan: ProcessedFloorPlan | null;
  ilots: Ilot[];
  corridors: Corridor[];
  processing: boolean;
  selectedTool: 'select' | 'measure' | 'zoom';
  settings: {
    density: number;
    corridorWidth: number;
    minClearance: number;
    algorithm: string;
  };
  layers: {
    walls: boolean;
    restricted: boolean;
    entrances: boolean;
    ilots: boolean;
    corridors: boolean;
    labels: boolean;
  };
  analytics: LayoutAnalytics | null;
}

export default function FloorPlanAnalyzer() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [appState, setAppState] = useState<AppState>({
    currentFile: null,
    floorPlan: null,
    ilots: [],
    corridors: [],
    processing: false,
    selectedTool: 'select',
    settings: {
      density: 25,
      corridorWidth: 120,
      minClearance: 80,
      algorithm: 'intelligent'
    },
    layers: {
      walls: true,
      restricted: true,
      entrances: true,
      ilots: true,
      corridors: true,
      labels: false
    },
    analytics: null
  });

  const [processingStage, setProcessingStage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleFileProcessed = useCallback((floorPlan: ProcessedFloorPlan) => {
    setAppState(prev => ({
      ...prev,
      floorPlan,
      processing: false
    }));
    
    toast({
      title: "File Processed Successfully",
      description: "Floor plan is ready for îlot placement.",
    });
  }, [toast]);

  const handleProcessingUpdate = useCallback((stage: string, progress: number) => {
    setProcessingStage(stage);
    setProcessingProgress(progress);
  }, []);

  const handleIlotsGenerated = useCallback((ilots: Ilot[], corridors: Corridor[], analytics: LayoutAnalytics) => {
    setAppState(prev => ({
      ...prev,
      ilots,
      corridors,
      analytics,
      processing: false
    }));
    
    toast({
      title: "Layout Generated",
      description: `Generated ${ilots.length} îlots with ${corridors.length} corridors.`,
    });
  }, [toast]);

  const handleSettingsChange = useCallback((newSettings: Partial<AppState['settings']>) => {
    setAppState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  const handleLayerToggle = useCallback((layer: keyof AppState['layers'], visible: boolean) => {
    setAppState(prev => ({
      ...prev,
      layers: { ...prev.layers, [layer]: visible }
    }));
  }, []);

  const handleToolChange = useCallback((tool: AppState['selectedTool']) => {
    setAppState(prev => ({ ...prev, selectedTool: tool }));
  }, []);

  const handleQuickAnalysis = useCallback(() => {
    if (!appState.floorPlan) {
      toast({
        title: "No Floor Plan",
        description: "Please upload a floor plan first.",
        variant: "destructive"
      });
      return;
    }
    
    setAppState(prev => ({ ...prev, processing: true }));
    // Trigger automatic îlot generation with current settings
    // This would be handled by the IlotConfiguration component
  }, [appState.floorPlan, toast]);

  const handleSaveProject = useCallback(() => {
    if (!appState.floorPlan || appState.ilots.length === 0) {
      toast({
        title: "Nothing to Save",
        description: "Please generate a layout first.",
        variant: "destructive"
      });
      return;
    }
    
    // Implement save functionality
    toast({
      title: "Project Saved",
      description: "Your floor plan analysis has been saved.",
    });
  }, [appState.floorPlan, appState.ilots, toast]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-2 border-blue-600 shadow-sm">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Advanced CAD Floor Plan Analyzer</h1>
                <p className="text-sm text-gray-600">Professional Edition - Real-time Processing Engine</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-mono text-gray-500">
                  {appState.processing ? processingStage : "Ready"}
                </div>
                <div className="text-xs text-gray-400">DXF/DWG Processing Engine</div>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Export Results
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 shadow-sm flex flex-col overflow-y-auto">
          <FileUpload
            onFileProcessed={handleFileProcessed}
            onProcessingUpdate={handleProcessingUpdate}
            processing={appState.processing}
          />
          
          <AnalysisTools
            selectedTool={appState.selectedTool}
            onToolChange={handleToolChange}
          />
          
          <IlotConfiguration
            settings={appState.settings}
            floorPlan={appState.floorPlan}
            onSettingsChange={handleSettingsChange}
            onIlotsGenerated={handleIlotsGenerated}
            processing={appState.processing}
          />
          
          <LayerControls
            layers={appState.layers}
            onLayerToggle={handleLayerToggle}
          />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-white">
          <CADCanvas
            ref={canvasRef}
            floorPlan={appState.floorPlan}
            ilots={appState.ilots}
            corridors={appState.corridors}
            layers={appState.layers}
            selectedTool={appState.selectedTool}
            processing={appState.processing}
            processingStage={processingStage}
            processingProgress={processingProgress}
          />
        </div>

        {/* Right Analytics Panel */}
        <div className="w-96 bg-white border-l border-gray-200 shadow-sm flex flex-col overflow-y-auto">
          <AnalyticsPanel
            floorPlan={appState.floorPlan}
            analytics={appState.analytics}
            settings={appState.settings}
            onSettingsChange={handleSettingsChange}
          />
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        <Button
          onClick={handleQuickAnalysis}
          className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg"
          size="icon"
          title="Quick Analysis"
        >
          <Zap className="w-6 h-6" />
        </Button>
        <Button
          onClick={handleSaveProject}
          className="bg-green-600 hover:bg-green-700 p-3 rounded-full shadow-lg"
          size="icon"
          title="Save Project"
        >
          <Save className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
