'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CircleAlert as AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ResumeUploaderProps {
  onUpload: (file: File, title: string) => Promise<void>;
  isLoading: boolean;
}

export default function ResumeUploader({ onUpload, isLoading }: ResumeUploaderProps) {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setSelectedFile(file);
        setError('');
        if (!title) {
          setTitle(`Interview - ${file.name.replace(/\.(pdf|docx)$/i, '')}`);
        }
      } else {
        setError('Please select a PDF or DOCX file');
        setSelectedFile(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) {
      setError('Please select a file and enter a title');
      return;
    }

    try {
      await onUpload(selectedFile, title.trim());
      setSelectedFile(null);
      setTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setError('Failed to process resume. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Upload Resume</span>
        </CardTitle>
        <CardDescription>
          Upload your resume to extract your projects and start a personalized interview
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Interview Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="e.g., Frontend Developer Interview"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resume">Resume File</Label>
          <Input
            id="resume"
            type="file"
            accept=".pdf,.docx"
            ref={fileInputRef}
            onChange={handleFileSelect}
            disabled={isLoading}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500">
            Supported formats: PDF, DOCX
          </p>
        </div>

        {selectedFile && (
          <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-md">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">{selectedFile.name}</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isLoading || !selectedFile || !title.trim()}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Start Interview</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}