'use client';

import { atom } from 'recoil';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Interview {
  id: string;
  title: string;
  skills: any;
  feedbackSummary: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  questions: Question[];
}

export interface Question {
  id: string;
  category: string;
  questionText: string;
  expectedAnswer: string | null;
  userAnswer: string | null;
  score: number | null;
}

export const userState = atom<User | null>({
  key: 'userState',
  default: null,
});

export const interviewsState = atom<Interview[]>({
  key: 'interviewsState',
  default: [],
});

export const currentInterviewState = atom<Interview | null>({
  key: 'currentInterviewState',
  default: null,
});

export const isLoadingState = atom<boolean>({
  key: 'isLoadingState',
  default: false,
});