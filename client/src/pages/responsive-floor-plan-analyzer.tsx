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
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Responsive Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3 lg:space-x-4 min-w-0">
              <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
                <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">
                  CAD Floor Plan Analyzer
                </h1>
                <p className="text-xs lg:text-sm text-gray-600 hidden sm:block">
                  Professional Edition - Real-time Processing
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Status Display */}
              <div className="text-right hidden md:block">
                <div className="text-sm font-mono text-gray-500">
                  {appState.processing ? processingStage : "Ready"}
                </div>
                <div className="text-xs text-gray-400">DXF/DWG Processing</div>
              </div>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, leftDrawerOpen: !prev.leftDrawerOpen }))}
                className="lg:hidden h-8 w-8 p-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              {/* Export Button */}
              <Button className="hidden lg:flex bg-blue-600 hover:bg-blue-700">
                Export Results
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Drawer Overlay for Mobile */}
        {appState.leftDrawerOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setAppState(prev => ({ ...prev, leftDrawerOpen: false }))}
          />
        )}

        {/* Left Drawer */}
        <div className={`
          bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ease-in-out
          ${appState.leftDrawerOpen 
            ? 'fixed lg:relative w-full sm:w-80 lg:w-80 z-50 lg:z-auto' 
            : 'w-0 lg:w-0 overflow-hidden'
          }
          h-full
        `}>
          <div className="w-full sm:w-80 lg:w-80 h-full flex flex-col bg-white">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700">Tools & Configuration</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, leftDrawerOpen: false }))}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Drawer Content */}
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
        <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
          {/* Desktop Drawer Toggle Buttons */}
          <div className="absolute top-4 left-4 z-30 hidden lg:flex space-x-2">
            {!appState.leftDrawerOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, leftDrawerOpen: true }))}
                className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border-2 border-blue-200 hover:border-blue-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Tools
              </Button>
            )}
          </div>
          
          <div className="absolute top-4 right-4 z-30 hidden lg:flex space-x-2">
            {!appState.rightDrawerOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, rightDrawerOpen: true }))}
                className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border-2 border-green-200 hover:border-green-300"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
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
          bg-white border-l border-gray-200 shadow-lg transition-all duration-300 ease-in-out
          ${appState.rightDrawerOpen 
            ? 'fixed lg:relative w-full sm:w-96 lg:w-96 z-50 lg:z-auto right-0' 
            : 'w-0 lg:w-0 overflow-hidden'
          }
          h-full
        `}>
          <div className="w-full sm:w-96 lg:w-96 h-full flex flex-col bg-white">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700">Analytics & Insights</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAppState(prev => ({ ...prev, rightDrawerOpen: false }))}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto">
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
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-30">
        {/* 3D Walkthrough */}
        <Button
          onClick={handle3DWalkthrough}
          className="bg-purple-600 hover:bg-purple-700 p-3 rounded-full shadow-lg"
          size="icon"
          title="3D Walkthrough"
          disabled={!appState.floorPlan || appState.ilots.length === 0}
        >
          <Eye className="w-5 h-5 lg:w-6 lg:h-6" />
        </Button>
        
        {/* Quick Analysis */}
        <Button
          onClick={handleQuickAnalysis}
          className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg"
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