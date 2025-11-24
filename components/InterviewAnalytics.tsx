'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { TrendingUp, Award, Target, Brain, Clock, Zap, Star, Users } from 'lucide-react';
import { ComparisonData, InterviewMetrics } from '@/lib/ai-services';

interface InterviewAnalyticsProps {
  metrics: InterviewMetrics;
  comparisonData: ComparisonData[];
  skillLevel: string;
  improvements: string[];
}

export default function InterviewAnalytics({ 
  metrics, 
  comparisonData, 
  skillLevel, 
  improvements 
}: InterviewAnalyticsProps) {
  const radarData = [
    { subject: 'Technical', A: 85, B: 65, fullMark: 100 },
    { subject: 'Communication', A: 78, B: 70, fullMark: 100 },
    { subject: 'Problem Solving', A: 82, B: 62, fullMark: 100 },
    { subject: 'Confidence', A: 75, B: 68, fullMark: 100 },
    { subject: 'Clarity', A: 88, B: 72, fullMark: 100 },
    { subject: 'Depth', A: 80, B: 60, fullMark: 100 }
  ];

  const performanceData = [
    { name: 'Q1', score: 75, industry: 65 },
    { name: 'Q2', score: 82, industry: 68 },
    { name: 'Q3', score: 78, industry: 70 },
    { name: 'Q4', score: 85, industry: 67 },
    { name: 'Q5', score: 88, industry: 72 }
  ];

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overallRating}</div>
            <p className="text-xs text-blue-100">
              {metrics.confidenceLevel}% confidence
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageResponseTime.toFixed(1)}s</div>
            <p className="text-xs text-green-100">
              {metrics.wordsPerMinute} WPM
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Technical Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.technicalDepth}%</div>
            <p className="text-xs text-purple-100">
              Advanced level
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Skill Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skillLevel}</div>
            <p className="text-xs text-orange-100">
              Estimated level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2" />
              Skill Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Your Score" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                <Radar name="Industry Avg" dataKey="B" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance vs Industry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} name="Your Score" />
                <Line type="monotone" dataKey="industry" stroke="#EF4444" strokeWidth={2} name="Industry Average" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Industry Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Industry Benchmarking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="userScore" fill="#3B82F6" name="Your Score" />
              <Bar dataKey="industryAverage" fill="#10B981" name="Industry Average" />
              <Bar dataKey="topPerformers" fill="#F59E0B" name="Top 10%" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Improvement Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            AI-Powered Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {improvements.map((improvement, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <p className="text-sm text-blue-900 leading-relaxed">{improvement}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}