'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Download, Share2, FileVideo, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface InterviewRecordingProps {
  interviewId: string;
  duration: number;
  recordingUrl?: string;
  transcript: string;
}

export default function InterviewRecording({ 
  interviewId, 
  duration, 
  recordingUrl, 
  transcript 
}: InterviewRecordingProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = async () => {
    try {
      // Generate PDF report
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('Interview Recording Report', 20, 30);
      
      doc.setFontSize(12);
      doc.text(`Interview ID: ${interviewId}`, 20, 50);
      doc.text(`Duration: ${formatTime(duration)}`, 20, 65);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 80);
      
      doc.text('Transcript:', 20, 100);
      const splitTranscript = doc.splitTextToSize(transcript, 170);
      doc.text(splitTranscript, 20, 115);
      
      doc.save(`interview-${interviewId}.pdf`);
      toast.success('Interview report downloaded!');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Interview Recording',
        text: `Check out my interview performance: ${transcript.substring(0, 100)}...`,
        url: window.location.href
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Interview link copied to clipboard!');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileVideo className="h-5 w-5" />
            <span>Interview Recording</span>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(duration)}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Player */}
        {recordingUrl && (
          <div className="space-y-4">
            <audio
              ref={audioRef}
              src={recordingUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onEnded={() => setIsPlaying(false)}
            />
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                className="flex items-center space-x-2"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </Button>
              
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                ></div>
              </div>
              
              <span className="text-sm text-gray-600">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download Report</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex items-center space-x-2"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>

        {/* Transcript Preview */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Transcript Preview</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {transcript.substring(0, 200)}...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}