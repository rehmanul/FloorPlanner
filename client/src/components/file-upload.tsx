import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { ProcessedFloorPlan } from "@shared/schema";
import { DXFProcessor } from "@/lib/dxf-processor";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileProcessed: (floorPlan: ProcessedFloorPlan) => void;
  onProcessingUpdate: (stage: string, progress: number) => void;
  processing: boolean;
}

export default function FileUpload({
  onFileProcessed,
  onProcessingUpdate,
  processing
}: FileUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dxfProcessor = useRef(new DXFProcessor());

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    const supportedTypes = ['.dxf', '.dwg', '.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!supportedTypes.includes(fileExtension)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a DXF, DWG, PDF, or image file.",
        variant: "destructive"
      });
      return;
    }

    try {
      onProcessingUpdate('Reading file...', 10);
      
      const fileContent = await file.text();
      
      if (fileExtension === '.dxf') {
        const floorPlan = await dxfProcessor.current.processDXF(
          fileContent,
          onProcessingUpdate
        );
        onFileProcessed(floorPlan);
      } else {
        throw new Error('Only DXF files are currently supported for full analysis.');
      }
      
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [onFileProcessed, onProcessingUpdate, toast]);

  const handleClick = useCallback(() => {
    if (!processing) {
      fileInputRef.current?.click();
    }
  }, [processing]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!processing) {
      setDragOver(true);
    }
  }, [processing]);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!processing && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [processing, handleFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  return (
    <div className="p-6 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">File Processing</h3>
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : processing
              ? 'border-gray-200 cursor-not-allowed'
              : 'border-gray-300 hover:border-blue-400'
          }`}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-900">
            {processing ? 'Processing...' : 'Upload CAD File'}
          </p>
          <p className="text-xs text-gray-500">DXF, DWG, PDF, or Image</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".dxf,.dwg,.pdf,.jpg,.jpeg,.png"
            onChange={handleFileInputChange}
            disabled={processing}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-100 p-2 rounded text-center">
            <div className="font-mono font-bold">DXF Parser</div>
            <div className="text-green-600">Active</div>
          </div>
          <div className="bg-gray-100 p-2 rounded text-center">
            <div className="font-mono font-bold">OpenCV.js</div>
            <div className="text-green-600">Ready</div>
          </div>
        </div>
      </div>
    </div>
  );
}
