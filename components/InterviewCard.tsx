'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Star } from 'lucide-react';
import { Interview } from '@/store/atoms';

interface InterviewCardProps {
  interview: Interview;
  onViewDetails: (interview: Interview) => void;
  onContinue?: (interview: Interview) => void;
}

export default function InterviewCard({ interview, onViewDetails, onContinue }: InterviewCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedQuestions = interview.questions.filter(q => q.userAnswer).length;
  const averageScore = interview.questions.filter(q => q.score).length > 0
    ? interview.questions.reduce((sum, q) => sum + (q.score || 0), 0) / interview.questions.filter(q => q.score).length
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{interview.title}</CardTitle>
            <CardDescription className="flex items-center space-x-2 mt-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(interview.createdAt).toLocaleDateString()}</span>
            </CardDescription>
          </div>
          <Badge className={getStatusColor(interview.status)}>
            {interview.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>{completedQuestions}/{interview.questions.length} questions answered</span>
            </div>
            {averageScore > 0 && (
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{averageScore.toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(interview)}
              className="flex-1"
            >
              View Details
            </Button>
            {interview.status === 'IN_PROGRESS' && onContinue && (
              <Button
                size="sm"
                onClick={() => onContinue(interview)}
                className="flex-1"
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}