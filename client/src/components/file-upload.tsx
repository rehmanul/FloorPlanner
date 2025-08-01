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
      // Real file processing using server API
      onProcessingUpdate("Uploading file to server...", 10);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      const response = await fetch('/api/floor-plans', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Server processing failed');
      }

      onProcessingUpdate("Server processing complete...", 90);
      const result = await response.json();
      
      // Extract geometry data from server response
      // The server returns the full floor plan with geometryData containing the ProcessedFloorPlan
      const processedFloorPlan: ProcessedFloorPlan = result.geometryData || {
        walls: result.walls || [],
        doors: result.doors || [],
        windows: result.windows || [],
        restrictedAreas: result.restrictedAreas || [],
        spaceAnalysis: result.spaceAnalysis || { totalArea: 0, usableArea: 0, wallArea: 0, efficiency: 0, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
        bounds: result.bounds || { minX: 0, minY: 0, maxX: 0, maxY: 0 }
      };

      onProcessingUpdate("Processing complete!", 100);
      setTimeout(() => {
        onFileProcessed(processedFloorPlan);
        toast({
          title: "File Processed Successfully",
          description: `${file.name} has been analyzed and ${processedFloorPlan.walls?.length || 0} walls, ${processedFloorPlan.doors?.length || 0} doors, and ${processedFloorPlan.windows?.length || 0} windows detected.`
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
    <Card className="border-0 shadow-none m-2 sm:m-4">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
          <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          File Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-0 px-3 sm:px-6">
        {!processing ? (
          <label 
            htmlFor="file-upload-input"
            className={`relative block border-2 border-dashed rounded-lg p-3 sm:p-6 text-center transition-colors cursor-pointer ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-4" />
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium text-gray-700">
                Drop your CAD file here
              </p>
              <p className="text-xs text-gray-500">
                or click to browse
              </p>
              <div className="flex flex-wrap gap-1 justify-center mt-2 sm:mt-3">
                {['DXF', 'DWG', 'PDF', 'JPG', 'PNG'].map(format => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
            <input
              id="file-upload-input"
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".dxf,.dwg,.pdf,.jpg,.jpeg,.png,.tiff,.tif"
              onChange={handleFileInput}
            />
          </label>
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