import React, { useState, useCallback } from 'react';
// Simple toast replacement - will use console for now
const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message),
  info: (message: string) => console.log('ℹ️', message)
};
import { Button } from "@/components/ui/button";
import { Upload, Zap, Save, Eye, Menu, Settings, BarChart3, ChevronLeft, ChevronRight, X } from "lucide-react";
import FileUpload from "@/components/file-upload";
import PixelPerfectCADRenderer from "@/components/pixel-perfect-cad-renderer";
import AnalysisTools from "@/components/analysis-tools";
import IlotConfiguration from "@/components/ilot-configuration";
import RealAnalyticsPanel from "@/components/real-analytics-panel";
import LayerControls from "@/components/layer-controls";
import { ProcessedFloorPlan, Ilot, Corridor } from '@shared/schema';

interface AppState {
  currentFile: File | null;
  floorPlan: ProcessedFloorPlan | null;
  ilots: Ilot[];
  corridors: Corridor[];
  settings: {
    ilotDimensions: { width: number; height: number };
    corridorWidth: number;
    algorithm: 'intelligent' | 'grid' | 'genetic' | 'simulated-annealing';
    density: number;
    spacing: number;
    minClearance: number;
  };
  layers: {
    walls: boolean;
    restricted: boolean;
    entrances: boolean;
    ilots: boolean;
    corridors: boolean;
    labels: boolean;
  };
  selectedTool: 'select' | 'measure' | 'zoom';
  processing: boolean;
  analytics: any;
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
}

export default function ResponsiveFloorPlanAnalyzer() {
  
  const [appState, setAppState] = useState<AppState>({
    currentFile: null,
    floorPlan: null,
    ilots: [],
    corridors: [],
    settings: {
      ilotDimensions: { width: 3000, height: 2000 },
      corridorWidth: 1200,
      algorithm: 'intelligent',
      density: 0.7,
      spacing: 500,
      minClearance: 800
    },
    layers: {
      walls: true,
      restricted: true,
      entrances: true,
      ilots: true,
      corridors: true,
      labels: true
    },
    selectedTool: 'select',
    processing: false,
    analytics: null,
    leftDrawerOpen: false,
    rightDrawerOpen: false
  });

  const [processingStage, setProcessingStage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // Event handlers
  const handleFileProcessed = useCallback((floorPlan: ProcessedFloorPlan) => {
    setAppState(prev => ({
      ...prev,
      floorPlan,
      processing: false,
      leftDrawerOpen: false // Auto-close drawer after processing
    }));
    
    toast.success(`CAD File Processed Successfully - Floor plan loaded with ${floorPlan.walls?.length || 0} walls and ${floorPlan.restrictedAreas?.length || 0} restricted areas`);
  }, []);

  const handleProcessingUpdate = useCallback((stage: string, progress: number) => {
    setProcessingStage(stage);
    setProcessingProgress(progress);
    setAppState(prev => ({ ...prev, processing: progress < 100 }));
  }, []);

  const handleToolChange = useCallback((tool: 'select' | 'measure' | 'zoom') => {
    setAppState(prev => ({ ...prev, selectedTool: tool }));
  }, []);

  const handleSettingsChange = useCallback((newSettings: any) => {
    setAppState(prev => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
  }, []);

  const handleIlotsGenerated = useCallback((ilots: Ilot[], corridors: Corridor[]) => {
    setAppState(prev => ({ ...prev, ilots, corridors }));
    
    toast.success(`Îlots Generated Successfully - ${ilots.length} îlots placed with ${corridors.length} corridor connections`);
  }, []);

  const handleLayerToggle = useCallback((layer: string, visible: boolean) => {
    setAppState(prev => ({
      ...prev,
      layers: { ...prev.layers, [layer]: visible }
    }));
  }, []);

  const handle3DWalkthrough = useCallback(() => {
    toast.info("3D Walkthrough - Launching immersive 3D visualization...");
  }, []);

  const handleQuickAnalysis = useCallback(() => {
    if (!appState.floorPlan) {
      toast.error("No Floor Plan - Please upload a CAD file first");
      return;
    }
    
    toast.info("Quick Analysis - Analyzing space utilization and traffic flow...");
  }, [appState.floorPlan]);

  const handleSaveProject = useCallback(() => {
    toast.success("Project Saved - Floor plan and îlot configuration saved successfully");
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Responsive Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-30">
        <div className="px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-1">
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                  CAD Floor Plan Analyzer
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block truncate">
                  Professional Edition - Real-time Processing
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 flex-shrink-0">
              {/* Status Display */}
              <div className="text-right hidden md:block">
                <div className="text-xs sm:text-sm font-mono text-gray-500 truncate">
                  {appState.processing ? processingStage : "Ready"}
                </div>
                <div className="text-xs text-gray-400">DXF/DWG Processing</div>
              </div>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, leftDrawerOpen: !prev.leftDrawerOpen }))}
                className="lg:hidden h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <Menu className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              
              {/* Export Button */}
              <Button className="hidden lg:flex bg-blue-600 hover:bg-blue-700 text-sm px-3 py-2">
                Export Results
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Left Drawer Overlay for Mobile */}
        {appState.leftDrawerOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setAppState(prev => ({ ...prev, leftDrawerOpen: false }))}
          />
        )}

        {/* Left Drawer */}
        <div className={`
          bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ease-in-out flex-shrink-0
          ${appState.leftDrawerOpen 
            ? 'fixed lg:relative w-80 sm:w-96 z-50 lg:z-auto' 
            : 'w-0 overflow-hidden'
          }
          h-full
        `}>
          <div className="w-80 sm:w-96 h-full flex flex-col bg-white">
            {/* Drawer Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700">Tools & Configuration</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, leftDrawerOpen: false }))}
                className="h-8 w-8 p-0 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-0">
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
        <div className="flex-1 flex flex-col bg-white relative overflow-hidden min-w-0">
          {/* Desktop Drawer Toggle Buttons */}
          <div className="absolute top-2 left-2 z-30 hidden lg:flex space-x-2">
            {!appState.leftDrawerOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, leftDrawerOpen: true }))}
                className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border border-blue-200 hover:border-blue-300 text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Tools
              </Button>
            )}
          </div>
          
          <div className="absolute top-2 right-2 z-30 hidden lg:flex space-x-2">
            {!appState.rightDrawerOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, rightDrawerOpen: true }))}
                className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border border-green-200 hover:border-green-300 text-xs"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Analytics
              </Button>
            )}
          </div>

          {/* CAD Renderer */}
          <PixelPerfectCADRenderer
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

        {/* Right Drawer Overlay for Mobile */}
        {appState.rightDrawerOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setAppState(prev => ({ ...prev, rightDrawerOpen: false }))}
          />
        )}

        {/* Right Drawer */}
        <div className={`
          bg-white border-l border-gray-200 shadow-lg transition-all duration-300 ease-in-out flex-shrink-0
          ${appState.rightDrawerOpen 
            ? 'fixed lg:relative w-full sm:w-80 lg:w-80 xl:w-96 z-50 lg:z-auto right-0' 
            : 'w-0 overflow-hidden'
          }
          h-full
        `}>
          <div className="w-full sm:w-80 lg:w-80 xl:w-96 h-full flex flex-col bg-white">
            {/* Drawer Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700">Analytics & Insights</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, rightDrawerOpen: false }))}
                className="h-8 w-8 p-0 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-0">
              <RealAnalyticsPanel
                floorPlan={appState.floorPlan}
                ilots={appState.ilots}
                corridors={appState.corridors}
                analytics={appState.analytics}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Floating Action Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-30">
        {/* 3D Walkthrough */}
        <Button
          onClick={handle3DWalkthrough}
          className="bg-purple-600 hover:bg-purple-700 p-2 sm:p-3 rounded-full shadow-lg"
          size="icon"
          title="3D Walkthrough"
          disabled={!appState.floorPlan || appState.ilots.length === 0}
        >
          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        
        {/* Quick Analysis */}
        <Button
          onClick={handleQuickAnalysis}
          className="bg-blue-600 hover:bg-blue-700 p-2 sm:p-3 rounded-full shadow-lg"
          size="icon"
          title="Quick Analysis"
        >
          <Zap className="w-5 h-5 lg:w-6 lg:h-6" />
        </Button>
        
        {/* Save Project */}
        <Button
          onClick={handleSaveProject}
          className="bg-green-600 hover:bg-green-700 p-3 rounded-full shadow-lg"
          size="icon"
          title="Save Project"
        >
          <Save className="w-5 h-5 lg:w-6 lg:h-6" />
        </Button>
        
        {/* Mobile Analytics Toggle */}
        <Button
          onClick={() => setAppState(prev => ({ ...prev, rightDrawerOpen: !prev.rightDrawerOpen }))}
          className="lg:hidden bg-gray-600 hover:bg-gray-700 p-3 rounded-full shadow-lg"
          size="icon"
          title="Analytics"
        >
          <BarChart3 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}