import { useState, useRef } from 'react';
import { Upload, X, File as FileIcon } from 'lucide-react';
import { uploadFile } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadedFiles, addUploadedFile, updateUploadedFileStatus } = useChatStore();

  const handleUpload = async (file: File) => {
    const tempId = Math.random().toString(36).substring(7);
    addUploadedFile({
      id: tempId,
      filename: file.name,
      status: 'uploading',
      size_bytes: file.size
    });

    try {
      const res = await uploadFile(file);
      updateUploadedFileStatus(tempId, 'ready'); 
    } catch (e) {
      updateUploadedFileStatus(tempId, 'error');
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`border-2 border-dashed rounded-lg p-4 text-center ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">Drag & drop files here, or click to select</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0]);
          }}
        />
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {uploadedFiles.map(f => (
            <div key={f.id} className="flex items-center gap-2 bg-gray-50 border px-3 py-1.5 rounded-full text-xs">
              <FileIcon className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{f.filename}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
                f.status === 'ready' ? 'bg-green-100 text-green-700' :
                f.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {f.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
