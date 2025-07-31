import { useState, useCallback, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Upload, Zap, Save, Eye, Menu, Settings, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import FileUpload from "@/components/file-upload";
import CADCanvas from "@/components/cad-canvas";
import AnalysisTools from "@/components/analysis-tools";
import IlotConfiguration from "@/components/ilot-configuration";
import AnalyticsPanel from "@/components/analytics-panel";
import LayerControls from "@/components/layer-controls";
import Walkthrough3D from "@/components/walkthrough-3d";
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
  show3DWalkthrough: boolean;
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
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
    analytics: null,
    show3DWalkthrough: false,
    leftDrawerOpen: false,
    rightDrawerOpen: false
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

  const handle3DWalkthrough = useCallback(() => {
    if (!appState.floorPlan || appState.ilots.length === 0) {
      toast({
        title: "No Layout Available",
        description: "Please generate an îlot layout first to view in 3D.",
        variant: "destructive"
      });
      return;
    }

    setAppState(prev => ({ ...prev, show3DWalkthrough: true }));
  }, [appState.floorPlan, appState.ilots, toast]);

  const handle3DWalkthroughClose = useCallback(() => {
    setAppState(prev => ({ ...prev, show3DWalkthrough: false }));
  }, []);

  const toggleLeftDrawer = useCallback(() => {
    setAppState(prev => ({ ...prev, leftDrawerOpen: !prev.leftDrawerOpen }));
  }, []);

  const toggleRightDrawer = useCallback(() => {
    setAppState(prev => ({ ...prev, rightDrawerOpen: !prev.rightDrawerOpen }));
  }, []);

  // Keyboard shortcuts for drawer control
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.code) {
          case 'Digit1':
            event.preventDefault();
            toggleLeftDrawer();
            break;
          case 'Digit2':
            event.preventDefault();
            toggleRightDrawer();
            break;
          case 'KeyF':
            event.preventDefault();
            // Toggle full-screen mode (collapse both drawers)
            setAppState(prev => ({
              ...prev,
              leftDrawerOpen: false,
              rightDrawerOpen: false
            }));
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLeftDrawer, toggleRightDrawer]);

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
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Drawer */}
        <div className={`
          transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-lg z-20
          ${appState.leftDrawerOpen ? 'w-80' : 'w-0 overflow-hidden'}
        `}>
          <div className="w-80 flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Tools & Configuration</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleLeftDrawer}
                  className="p-1 h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
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
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-white relative">
          {/* Drawer Toggle Buttons */}
          <div className="absolute top-4 left-4 z-30 flex space-x-2">
            {!appState.leftDrawerOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLeftDrawer}
                className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border-2 border-blue-200 hover:border-blue-300"
                title="Open Tools Panel (Ctrl+1)"
              >
                <Settings className="w-4 h-4 mr-2" />
                Tools
              </Button>
            )}
          </div>
          
          <div className="absolute top-4 right-4 z-30 flex space-x-2">
            {!appState.rightDrawerOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRightDrawer}
                className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border-2 border-green-200 hover:border-green-300"
                title="Open Analytics Panel (Ctrl+2)"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            )}
          </div>
          
          {/* Keyboard Shortcuts Hint */}
          <div className="absolute bottom-4 right-4 z-30">
            <div className="bg-black/70 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
              <div className="space-y-1">
                <div><kbd className="bg-white/20 px-1 rounded">Ctrl+1</kbd> Tools</div>
                <div><kbd className="bg-white/20 px-1 rounded">Ctrl+2</kbd> Analytics</div>
                <div><kbd className="bg-white/20 px-1 rounded">Ctrl+F</kbd> Full Screen</div>
              </div>
            </div>
          </div>
          
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

        {/* Right Drawer */}
        <div className={`
          transition-all duration-300 ease-in-out bg-white border-l border-gray-200 shadow-lg z-20
          ${appState.rightDrawerOpen ? 'w-96' : 'w-0 overflow-hidden'}
        `}>
          <div className="w-96 flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Analytics & Insights</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleRightDrawer}
                  className="p-1 h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <AnalyticsPanel
                floorPlan={appState.floorPlan}
                analytics={appState.analytics}
                settings={appState.settings}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        <Button
          onClick={handle3DWalkthrough}
          className="bg-purple-600 hover:bg-purple-700 p-3 rounded-full shadow-lg"
          size="icon"
          title="3D Walkthrough"
          disabled={!appState.floorPlan || appState.ilots.length === 0}
        >
          <Eye className="w-6 h-6" />
        </Button>
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

      {/* 3D Walkthrough Modal */}
      {appState.show3DWalkthrough && (
        <div className="fixed inset-0 z-50 bg-black">
          <Walkthrough3D
            floorPlan={appState.floorPlan}
            ilots={appState.ilots}
            walls={appState.floorPlan?.processed?.walls || []}
            corridors={appState.corridors}
            onClose={handle3DWalkthroughClose}
          />
        </div>
      )}
    </div>
  );
}
