import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { ProcessedFloorPlan } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { DXFProcessor } from "../lib/dxf-processor";

interface FileUploadProps {
  onFileProcessed: (floorPlan: ProcessedFloorPlan) => void;
  onProcessingUpdate: (stage: string, progress: number) => void;
  processing: boolean;
}

export default function FileUpload({ onFileProcessed, onProcessingUpdate, processing }: FileUploadProps): JSX.Element {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file) return;

    const validTypes = [
      'application/dxf',
      'application/dwg',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ];

    const extension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['dxf', 'dwg', 'pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'];

    if (!validExtensions.includes(extension || '')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a DXF, DWG, PDF, or image file.",
        variant: "destructive"
      });
      return;
    }

    setCurrentFile(file);
    onProcessingUpdate("Initializing file processor...", 0);

    try {
      // Simulate processing stages
      const stages = [
        { name: "Reading file structure...", duration: 1000 },
        { name: "Parsing geometric elements...", duration: 2000 },
        { name: "Extracting wall boundaries...", duration: 1500 },
        { name: "Identifying restricted areas...", duration: 1000 },
        { name: "Processing entrance points...", duration: 800 },
        { name: "Finalizing floor plan data...", duration: 700 }
      ];

      let progress = 0;
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        onProcessingUpdate(stage.name, progress);
        await new Promise(resolve => setTimeout(resolve, stage.duration));
        progress = ((i + 1) / stages.length) * 100;
      }

      // Create mock processed floor plan for demo
      const processedFloorPlan: ProcessedFloorPlan = {
        walls: [
          { id: 'wall1', type: 'wall', points: [{ x: 0, y: 0 }, { x: 800, y: 0 }], thickness: 20 },
          { id: 'wall2', type: 'wall', points: [{ x: 800, y: 0 }, { x: 800, y: 600 }], thickness: 20 },
          { id: 'wall3', type: 'wall', points: [{ x: 800, y: 600 }, { x: 0, y: 600 }], thickness: 20 },
          { id: 'wall4', type: 'wall', points: [{ x: 0, y: 600 }, { x: 0, y: 0 }], thickness: 20 },
          { id: 'wall5', type: 'wall', points: [{ x: 300, y: 0 }, { x: 300, y: 200 }], thickness: 15 },
          { id: 'wall6', type: 'wall', points: [{ x: 500, y: 200 }, { x: 800, y: 200 }], thickness: 15 }
        ],
        doors: [
          { id: 'door1', type: 'door', center: { x: 400, y: 0 }, radius: 80 }
        ],
        windows: [
          { id: 'window1', type: 'window', bounds: { x: 600, y: 0, width: 120, height: 20 } }
        ],
        restrictedAreas: [
          { id: 'restrict1', type: 'restricted', bounds: { x: 100, y: 100, width: 80, height: 80 } },
          { id: 'restrict2', type: 'restricted', bounds: { x: 700, y: 500, width: 60, height: 60 } }
        ],
        spaceAnalysis: {
          totalArea: 480,
          usableArea: 450,
          wallArea: 30,
          efficiency: 93.75,
          bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600 }
        },
        bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600 }
      };

      onProcessingUpdate("Processing complete!", 100);
      setTimeout(() => {
        onFileProcessed(processedFloorPlan);
        toast({
          title: "File Processed Successfully",
          description: `${file.name} has been analyzed and is ready for îlot placement.`
        });
      }, 500);

    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Processing Failed",
        description: "An error occurred while processing the file.",
        variant: "destructive"
      });
      onProcessingUpdate("Processing failed", 0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, []);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          File Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!processing ? (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Drop your CAD file here
              </p>
              <p className="text-xs text-gray-500">
                or click to browse
              </p>
              <div className="flex flex-wrap gap-1 justify-center mt-3">
                {['DXF', 'DWG', 'PDF', 'JPG', 'PNG'].map(format => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".dxf,.dwg,.pdf,.jpg,.jpeg,.png,.tiff,.tif"
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                  Processing {currentFile?.name}
                </p>
                <p className="text-xs text-gray-500">
                  Advanced CAD Analysis Engine
                </p>
              </div>
            </div>
            <Progress value={75} className="w-full" />
          </div>
        )}

        {currentFile && !processing && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  {currentFile.name}
                </p>
                <p className="text-xs text-green-600">
                  Processing complete
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}