import React, { useState, useRef } from 'react';
import { InputMode } from '../types';
import { Camera, FileText, Upload, X, Search, FileType } from 'lucide-react';

interface InputSectionProps {
  onAnalyze: (text: string, fileData: string | undefined) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onAnalyze, isLoading }) => {
  const [mode, setMode] = useState<InputMode>(InputMode.TEXT);
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileType, setSelectedFileType] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('Please upload an image or PDF file.');
        return;
      }

      setSelectedFileName(file.name);
      setSelectedFileType(file.type);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(undefined);
    setSelectedFileName('');
    setSelectedFileType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !selectedFile) return;
    onAnalyze(textInput, selectedFile);
  };

  const isImage = selectedFileType.startsWith('image/');

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-850 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setMode(InputMode.TEXT)}
          className={`flex-1 py-4 flex items-center justify-center gap-2 transition-colors ${
            mode === InputMode.TEXT 
              ? 'bg-slate-800 text-primary-500 border-b-2 border-primary-500' 
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText size={20} />
          <span className="font-semibold">Text Input</span>
        </button>
        <button
          onClick={() => setMode(InputMode.FILE)}
          className={`flex-1 py-4 flex items-center justify-center gap-2 transition-colors ${
            mode === InputMode.FILE 
              ? 'bg-slate-800 text-primary-500 border-b-2 border-primary-500' 
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload size={20} />
          <span className="font-semibold">File Upload (Image/PDF)</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {mode === InputMode.TEXT ? (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Paste Book Description or Reviews
            </label>
            <textarea
              className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none resize-none placeholder-slate-600"
              placeholder="Paste your Amazon book description, blurb, or a collection of customer reviews here..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Upload Screenshot or PDF
            </label>
            <div 
              className={`border-2 border-dashed border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer relative ${selectedFile ? 'border-primary-500/50' : ''}`}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="relative w-full h-64 flex items-center justify-center bg-slate-950 rounded-md overflow-hidden">
                  {isImage ? (
                    <img 
                      src={selectedFile} 
                      alt="Preview" 
                      className="max-h-full max-w-full object-contain" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <FileType size={64} className="text-red-500" />
                      <span className="font-medium text-lg max-w-xs truncate">{selectedFileName}</span>
                      <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">PDF Document</span>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="absolute top-2 right-2 p-2 bg-red-500/90 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg z-10"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={48} className="text-slate-500 mb-4" />
                  <p className="text-slate-400 text-center mb-2">Click to upload or drag and drop</p>
                  <p className="text-slate-600 text-xs text-center">PNG, JPG or PDF up to 10MB</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
              />
            </div>
            <textarea
              className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none resize-none placeholder-slate-600 mt-4"
              placeholder="(Optional) Add specific questions or context about the file..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || (!textInput && !selectedFile)}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-all
              ${isLoading || (!textInput && !selectedFile)
                ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                : 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 hover:shadow-primary-500/25'}
            `}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search size={20} />
                <span>Analyze Book</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};