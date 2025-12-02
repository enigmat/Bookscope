

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SocialMediaContent {
  tweets: string[];
  facebookAd: string;
  emailSubject: string;
  emailBody: string;
}

export interface AplusModule {
  type: string;
  headline: string;
  body: string;
  imagePrompt: string;
}

export interface AplusContent {
  modules: AplusModule[];
}

export interface AnalysisResult {
  title: string;
  author: string;
  authorBio: string;
  summary: string;
  sentimentScore: number; // 0 to 100
  sentimentBreakdown: SentimentBreakdown;
  targetAudience: string[];
  keywords: string[];
  strengths: string[];
  weaknesses: string[];
  weaknessFixes: string[];
  marketingHooks: string[];
  categoryPrediction: string;
  pageCountEstimate: string;
  titleSuggestions: string[];
  coverDesignIdeas: string[];
  recommendedPrice: string;
  pricingStrategyDescription: string;
  marketingStrategy: string[];
  improvementTips: string[];
  improvedDescription: string;
  amazonKdpHtml: string;
}

export interface AnalyzerState {
  isLoading: boolean;
  error: string | null;
  data: AnalysisResult | null;
}

export enum InputMode {
  TEXT = 'TEXT',
  FILE = 'FILE'
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  summary: string;
  result: AnalysisResult;
  interactiveState: {
    activeTitle: string;
    currentCoverIdeas: string[];
    specificFixes: Record<number, string>;
    coverImages: Record<number, string>;
    customTitles: string[];
    authorName: string;
    authorUrl?: string;
    authorBio?: string;
    socialMediaContent?: SocialMediaContent;
    aplusContent?: AplusContent;
    aplusImages?: Record<number, string>;
  }
}

export interface TrendingTopic {
  id: string;
  topic: string;
  description: string;
  reason: string;
  audience: string;
  interestScore: number; // 0-100 representing consumer buzz/curiosity
  marketDemandScore: number; // 0-100 representing sales potential/commercial intent
}

export interface TrendingCategory {
  categoryName: string;
  topics: TrendingTopic[];
}

export interface ChapterOutlineItem {
  chapterTitle: string;
  description: string;
}

export type AppMode = 'ANALYZE' | 'TRENDS';