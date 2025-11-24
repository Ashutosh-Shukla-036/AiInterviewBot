// lib/ai-services.ts
// Single-file AI services: NO GEMINI. Hugging Face optional.

const AI_SERVICE = process.env.AI_SERVICE || 'local';
const RESUME_PARSER = process.env.RESUME_PARSER || 'local';
const HF_API_KEY = process.env.HF_API_KEY;

// HuggingFace models (optional)
const HF_ANALYSIS_MODEL = process.env.HF_ANALYSIS_MODEL || 'cardiffnlp/twitter-roberta-base-sentiment-latest';

console.log(`✓ AI Service initialized: ${AI_SERVICE}`);
console.log(`✓ Resume Parser: ${RESUME_PARSER}`);
if (HF_API_KEY) {
  console.log('✓ HuggingFace API key configured');
} else {
  console.log('⚠️ HuggingFace API key not found, using local parsing & analysis only');
}

/* --------------------
   Types / Interfaces
-------------------- */
export interface Project {
  title: string;
  description: string;
  technologies: string[];
  duration?: string;
  role?: string;
  achievements?: string[];
}

export interface InterviewQuestion {
  id: string;
  projectTitle: string;
  questionText: string;
  category: 'technical' | 'behavioral' | 'problem-solving' | 'architecture';
  expectedPoints: string[];
}


export interface AnswerAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  technicalAccuracy: number;
  communicationClarity: number;
  problemSolvingApproach: number;
  sentiment: string;
  confidence: number;
  keywords: string[];
  responseTime: number;
  complexity: 'basic' | 'intermediate' | 'advanced';
  industryRelevance: number;
  codeQuality?: number;
}

export interface InterviewMetrics {
  totalDuration: number;
  averageResponseTime: number;
  wordsPerMinute: number;
  pauseCount: number;
  confidenceLevel: number;
  technicalDepth: number;
  communicationScore: number;
  overallRating: 'Poor' | 'Fair' | 'Good' | 'Excellent';
}

export interface ComparisonData {
  userScore: number;
  industryAverage: number;
  topPerformers: number;
  category: string;
}

/* ====================
   RESUME PARSING
==================== */
export async function parseResumeWithAI(resumeText: string): Promise<{ projects: Project[] }> {
  if (!resumeText || resumeText.trim().length < 50) {
    return { projects: [] };
  }

  console.log('🔍 Starting resume parsing...');

  // Strategy 1: LLM-powered parsing
  if (HF_API_KEY) {
    try {
      const projects = await parseWithLLM(resumeText);
      if (projects.length > 0) {
        console.log(`✅ LLM parsed ${projects.length} projects`);
        return { projects };
      }
    } catch (err) {
      console.warn('LLM parsing failed:', err);
    }
  }

  // Strategy 2: Smart regex parsing
  const regexProjects = parseWithSmartRegex(resumeText);
  if (regexProjects.length > 0) {
    console.log(`✅ Regex parsed ${regexProjects.length} projects`);
    return { projects: regexProjects };
  }

  // Strategy 3: Emergency extraction
  const emergencyProjects = emergencyTechExtraction(resumeText);
  console.log(`✅ Emergency extracted ${emergencyProjects.length} projects`);
  return { projects: emergencyProjects };
}

/* =========================
   LLM-POWERED PARSING
========================= */
async function parseWithLLM(resumeText: string): Promise<Project[]> {
  const prompt = `Extract all technical projects from this resume. Return ONLY a JSON array of project objects with: title, description, technologies[], achievements[].

Resume:
${resumeText.slice(0, 3000)}

Format: [{"title": "...", "description": "...", "technologies": ["...", "..."], "achievements": ["..."]}]`;

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 1024, temperature: 0.1, return_full_text: false }
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const text = extractTextFromHFResponse(result);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const projects = JSON.parse(jsonMatch[0]);
      if (Array.isArray(projects)) return projects.filter(p => p.title && p.description).slice(0, 5);
    }
  } catch (error) {
    console.warn('LLM parsing failed:', error);
  }

  return [];
}

function extractTextFromHFResponse(result: any): string {
  if (Array.isArray(result) && result[0]?.generated_text) return result[0].generated_text;
  if (result.generated_text) return result.generated_text;
  if (typeof result === 'string') return result;
  if (Array.isArray(result) && result[0]?.text) return result[0].text;
  return JSON.stringify(result);
}

/* =========================
   SMART REGEX PARSING
========================= */
function parseWithSmartRegex(text: string): Project[] {
  const projects: Project[] = [];
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const sections = extractProjectSections(cleanText);

  for (const section of sections) {
    const project = parseProjectSection(section);
    if (project && isValidProject(project)) projects.push(project);
  }

  return projects.slice(0, 4);
}

function extractProjectSections(text: string): string[] {
  const sections: string[] = [];
  const headingRegex = /(?:^|\n)(?:(?:PROJECTS?|TECHNICAL PROJECTS?|PERSONAL PROJECTS?)[\s\S]*?)(?=\n(?:EDUCATION|SKILLS|EXPERIENCE|CERTIFICATIONS|$))/i;
  const headingMatch = text.match(headingRegex);
  if (headingMatch) {
    const bullets = headingMatch[0].split(/(?:\n\s*[•\-*]\s*|\n\s*\d+\.\s*)/).filter(b => b.length > 50);
    sections.push(...bullets);
  }

  const patterns = [
    /(?:^|\n)([A-Z][^•\n]{10,80}?)(?:\n|$)((?:[^•\n]*(?:\n|$)){1,5})/g,
    /(?:Title|Project):\s*([^\n]+)(?:\n|$)((?:[^•\n]*(?:\n|$)){1,5})/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const title = match[1]?.trim();
      const desc = match[2]?.trim();
      if (title && desc && title.length > 5 && desc.length > 20) sections.push(`${title}\n${desc}`);
    }
  }

  return sections.filter(s => s.length > 30);
}

function parseProjectSection(section: string): Project | null {
  const lines = section.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 1) return null;
  const title = lines[0].replace(/^[•\-*\d\.\s]+/, '').trim();
  const description = lines.slice(1).join(' ').trim() || title;

  const techKeywords = ['react','node','python','java','javascript','typescript','mongodb','sql','postgres','mysql','docker','kubernetes','aws','azure','gcp','express','next','vue','angular','django','flask','spring','fastapi','graphql','rest','api','html','css','tailwind','bootstrap','git','github','jenkins','ml','ai','tensorflow','pytorch','xgboost','pandas','numpy'];
  const techRegex = new RegExp(`\\b(${techKeywords.join('|')})\\b`, 'gi');
  const technologies = Array.from(new Set((description.match(techRegex) || []).map(t => t.toLowerCase())));

  const achievements = description.split(/[.;!?]/).filter(sentence => sentence.length > 15 && /(built|developed|created|implemented|designed|optimized|improved|reduced|increased|deployed|architected)/i.test(sentence)).map(s => s.trim()).slice(0,3);

  return { title: title.slice(0,100), description: description.slice(0,500), technologies, achievements: achievements.length ? achievements : undefined };
}

function isValidProject(project: Project): boolean {
  if (!project.title || project.title.length < 3) return false;
  if (!project.description || project.description.length < 10) return false;
  const invalidPatterns = [/cgpa|gpa|percentage|grade|university|college|school|degree|b\.?tech|b\.?e|m\.?tech|phd/i,/skills?|languages?|tools?|frameworks?|certifications?|awards?|hackathon|competition/i];
  if (invalidPatterns.some(p => p.test(project.title))) return false;
  if (invalidPatterns.some(p => p.test(project.description))) return false;
  return true;
}

/* =========================
   EMERGENCY EXTRACTION
========================= */
function emergencyTechExtraction(text: string): Project[] {
  const projects: Project[] = [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.length > 80);
  let projectCount = 0;

  for (const para of paragraphs) {
    if (projectCount >= 3) break;
    const techWords = para.match(/\b(react|node|python|java|javascript|typescript|mongodb|sql|docker|api|ml|ai|express|database|backend|frontend|full.?stack)\b/gi);
    if (techWords && techWords.length >= 2) {
      const firstLine = para.split('\n')[0].trim();
      const title = firstLine.length > 10 ? firstLine.slice(0, 60) : `Project ${projectCount+1}`;
      if (!projects.some(p => p.title === title)) {
        projects.push({ title, description: para.slice(0,400), technologies: Array.from(new Set((techWords||[]).map(t=>t.toLowerCase()))), achievements: extractKeyAchievements(para) });
        projectCount++;
      }
    }
  }

  return projects;
}

function extractKeyAchievements(text: string): string[] {
  return text.split(/[.;!?]/).filter(s => s.length>20 && /(reduced|improved|increased|built|developed|created|implemented|optimized|deployed|achieved|solved)/i.test(s)).map(s=>s.trim().replace(/^[•\-*\s]+/,'')).slice(0,3);
}

/* ====================
   PROJECT QUESTIONS
==================== */
export async function generateProjectQuestions(projects: Project[]): Promise<InterviewQuestion[]> {
  const questions: InterviewQuestion[] = [];
  for (const project of projects.slice(0,3)) {
    try {
      if (AI_SERVICE==='huggingface' && HF_API_KEY) {
        try {
          const hfQuestions = await generateQuestionsWithHuggingFace(project);
          if (Array.isArray(hfQuestions) && hfQuestions.length>0) {
            questions.push(...hfQuestions);
            continue;
          }
        } catch (err) { console.warn('HF project question gen failed, fallback:', err); }
      }
      questions.push(...generateQuestionsLocally(project));
    } catch (err) {
      console.error('Error generating questions for project', project.title, err);
      questions.push(...generateQuestionsLocally(project));
    }
  }
  return questions;
}

async function generateQuestionsWithHuggingFace(project: Project): Promise<InterviewQuestion[]> {
  const prompt = `Generate 4 concise interview questions for the following project. Return ONLY a JSON array of objects with keys: questionText, category, expectedPoints.
Project: ${project.title}
Description: ${project.description}
Technologies: ${project.technologies.join(', ')}`;
  
  const resp = await fetch(`https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1`, {
    method:'POST',
    headers:{Authorization:`Bearer ${HF_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({inputs:prompt, parameters:{max_new_tokens:400, temperature:0.3, return_full_text:false}})
  });
  if (!resp.ok) throw new Error(`HF HTTP ${resp.status}`);
  const result = await resp.json();
  const text = extractTextFromHFResponse(result);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if(jsonMatch){ 
    try{
      const arr=JSON.parse(jsonMatch[0]);
      if(Array.isArray(arr)) return arr.map((q:any,idx:number)=>({ id:`${project.title.replace(/\s+/g,'-').toLowerCase()}-${idx}`, projectTitle:project.title, questionText:(q.questionText||q.question||'No question').toString(), category:(q.category||'technical') as InterviewQuestion['category'], expectedPoints:Array.isArray(q.expectedPoints)?q.expectedPoints:(q.points? q.points: []) }));
    }catch(err){ console.warn('Failed to parse HF JSON array:',err); }
  }
  return generateQuestionsLocally(project);
}

function generateQuestionsLocally(project: Project): InterviewQuestion[] {
  const techList = project.technologies.slice(0,3).join(', ') || 'the technologies used';
  const slug = project.title.replace(/\s+/g,'-').toLowerCase();
  return [
    { id:`${slug}-1`, projectTitle:project.title, questionText:`Can you walk me through ${project.title}? What problem did it solve and why did you choose ${techList}?`, category:'technical', expectedPoints:['Problem statement','Approach','Tech choices'] },
    { id:`${slug}-2`, projectTitle:project.title, questionText:`What were the biggest challenges in ${project.title} and how did you overcome them?`, category:'problem-solving', expectedPoints:['Challenges','Approach','Outcome'] },
    { id:`${slug}-3`, projectTitle:project.title, questionText:`How did you design the architecture for ${project.title}? What trade-offs did you consider?`, category:'architecture', expectedPoints:['Architecture','Scaling','Trade-offs'] },
    { id:`${slug}-4`, projectTitle:project.title, questionText:`What did you learn from ${project.title} and what would you do differently today?`, category:'behavioral', expectedPoints:['Learnings','Improvements','Reflection'] }
  ];
}

/* ====================
   ANSWER ANALYSIS
==================== */
export async function analyzeAnswer(question: InterviewQuestion, userAnswer: string, project: Project): Promise<AnswerAnalysis> {
  console.log(`🔍 Analyzing answer for question: ${question.id}`);
  if(!userAnswer || userAnswer.trim().length===0) return generateStructuredAnalysis('', 'neutral', 30, question);
  if(AI_SERVICE==='huggingface' && HF_API_KEY){
    try{ return await analyzeAnswerWithHuggingFace(question,userAnswer); } catch(err){ console.warn('HF analysis failed, local fallback',err); return generateStructuredAnalysis(userAnswer,'neutral',50,question); }
  }
  return generateStructuredAnalysis(userAnswer,'neutral',50,question);
}

async function analyzeAnswerWithHuggingFace(question: InterviewQuestion, userAnswer: string): Promise<AnswerAnalysis> {
  const resp = await fetch(`https://api-inference.huggingface.co/models/${HF_ANALYSIS_MODEL}`, { method:'POST', headers:{Authorization:`Bearer ${HF_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({inputs:userAnswer}) });
  let sentiment='neutral', confidence=50;
  if(resp.ok){
    try{
      const result = await resp.json();
      const top = Array.isArray(result) ? result[0][0]||result[0] : result;
      if(top && top.label){
        const lab = top.label.toLowerCase();
        sentiment = lab.includes('pos')||lab.includes('positive')?'positive':lab.includes('neg')||lab.includes('negative')?'negative':'neutral';
        confidence = Math.round((top.score||0.5)*100);
      }
    }catch(err){ console.warn('Failed to parse HF sentiment result', err); }
  }else{ console.warn('HF sentiment API returned non-OK:',resp.status); }
  return generateStructuredAnalysis(userAnswer,sentiment,confidence,question);
}

function generateStructuredAnalysis(userAnswer:string, sentiment:string, confidence:number, question:InterviewQuestion):AnswerAnalysis{
  const clean = (userAnswer||'').trim();
  const wordCount = clean.length===0?0:clean.split(/\s+/).length;
  const hasExamples = /example|instance|case|for example|such as|like when/i.test(clean);
  const hasTechnicalTerms = /algorithm|architecture|implementation|api|database|performance|latency|scalability|deploy|container|docker|kubernetes|thread|async|lambda|queue|cache|redis|mongodb|postgres|sql|rest|graphql/i.test(clean);
  const hasMetrics = /\b\d+%|\b\d+\s*x|\b\d+\s+ms|\b\d+\s+sec|\b\d+\s+seconds|\bimprov(ed|ement)|reduc(ed|tion)\b/i.test(clean);
  const base=Math.min(50, wordCount);
  const score=Math.min(95, Math.max(20, base + (hasTechnicalTerms?15:0) + (hasExamples?10:0) + (hasMetrics?10:0)));
  const strengths:string[]=[], weaknesses:string[]=[], suggestions:string[]=[];
  if(wordCount>80) strengths.push('Comprehensive detail and elaboration');
  if(hasTechnicalTerms) strengths.push('Used relevant technical vocabulary');
  if(hasExamples) strengths.push('Provided concrete examples');
  if(hasMetrics) strengths.push('Included measurable outcomes');
  if(wordCount<40) weaknesses.push('Answer is brief; expand with specifics');
  if(!hasTechnicalTerms && question.category==='technical') weaknesses.push('Add more technical depth and terminology');
  if(!hasExamples) weaknesses.push('Include specific examples or scenarios');
  if(!hasMetrics) suggestions.push('Quantify results or performance if possible');
  return {
    score,
    strengths,
    weaknesses,
    suggestions,
    technicalAccuracy: Math.min(100,score+5),
    communicationClarity: Math.min(100,score),
    problemSolvingApproach: Math.min(100,score-5),
    sentiment,
    confidence,
    keywords: clean.split(/\s+/).slice(0,20),
    responseTime: Math.min(60, wordCount/2),
    complexity: score>70?'advanced':score>50?'intermediate':'basic',
    industryRelevance: Math.min(100, score+10),
    codeQuality: question.category==='technical'?Math.min(100,score+15):undefined
  };
}

/* ====================
   SKILL ASSESSMENT
==================== */
export async function assessSkillLevel(projects: Project[]): Promise<{
  level: 'Junior'|'Mid-Level'|'Senior'|'Lead';
  yearsEstimate: string;
  strengths: string[];
  recommendations: string[];
}>{
  if(!projects || projects.length===0) return {level:'Junior', yearsEstimate:'<1', strengths:[], recommendations:['Add technical projects to resume']};
  const techCount = projects.reduce((acc,p)=>acc+p.technologies.length,0);
  const totalProjects = projects.length;
  const level = techCount<5?'Junior':techCount<10?'Mid-Level':techCount<20?'Senior':'Lead';
  const yearsEstimate = totalProjects<=1?'<1 year':totalProjects<=2?'1-2 years':totalProjects<=4?'2-4 years':'4+ years';
  const strengths = projects.flatMap(p=>p.technologies.slice(0,3));
  const recommendations = totalProjects<2?['Add more projects']:[];
  return {level, yearsEstimate, strengths:Array.from(new Set(strengths)), recommendations};
}

/* ====================
   INDUSTRY COMPARISON
==================== */
export function generateIndustryComparison(score:number): ComparisonData[]{
  const avg = Math.floor(Math.random()*30)+50;
  const top = Math.floor(Math.random()*20)+80;
  return [{userScore:score, industryAverage:avg, topPerformers:top, category:'Overall'}];
}

/* ====================
   INTERVIEW FEEDBACK
==================== */
export async function generateInterviewFeedback(
  interviewMetrics: InterviewMetrics,
  comparisonData: ComparisonData[]=[],
  skillAssessment: Awaited<ReturnType<typeof assessSkillLevel>>,
  projects: Project[]=[]
): Promise<string>{
  const level = skillAssessment?.level||'Junior';
  const projCount = projects.length;
  return `Interview Feedback:
Level: ${level}
Projects Analyzed: ${projCount}
Technical Depth: ${interviewMetrics.technicalDepth}
Communication: ${interviewMetrics.communicationScore}
Confidence: ${interviewMetrics.confidenceLevel}
Comparison to Industry Average: ${comparisonData.map(d=>`${d.category}: ${d.userScore} vs ${d.industryAverage}`).join('; ')}
Recommendations: ${skillAssessment?.recommendations?.join(', ') || 'Focus on projects and technical depth'}`;
}

/* ====================
   EXPORT ALIASES
==================== */
export { analyzeAnswer as evaluateAnswer };
