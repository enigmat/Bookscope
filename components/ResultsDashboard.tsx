

import React, { useState } from 'react';
import { AnalysisResult, SocialMediaContent } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { TrendingUp, Users, Target, AlertTriangle, CheckCircle, Zap, BookOpen, PenTool, Image, Wrench, FileText, DollarSign, Rocket, Sparkles, Copy, Check, Download, User, Code, Eye, RefreshCw, Plus, FileDown, Link as LinkIcon, ExternalLink, Feather, Share2, Mail, Facebook, Twitter } from 'lucide-react';
import { generateCoverImage, generateSpecificFix, generateNewCoverConcepts, integrateFixesIntoDescription, generateAuthorBio, generateSocialMediaContent } from '../services/geminiService';

interface ResultsDashboardProps {
  data: AnalysisResult;
  activeTitle: string;
  onTitleChange: (title: string) => void;
  currentCoverIdeas: string[];
  onCoverIdeasChange: (ideas: string[]) => void;
  specificFixes: Record<number, string>;
  onFixChange: (index: number, fix: string) => void;
  coverImages: Record<number, string>;
  onCoverImageGenerated: (index: number, url: string) => void;
  customTitles: string[];
  onCustomTitlesChange: (titles: string[]) => void;
  authorName: string;
  onAuthorNameChange: (name: string) => void;
  authorUrl: string;
  onAuthorUrlChange: (url: string) => void;
  authorBio: string;
  onAuthorBioChange: (bio: string) => void;
  onDescriptionUpdate: (desc: string, html: string) => void;
  onDownloadPdf: () => void;
}

const COLORS = ['#22c55e', '#94a3b8', '#ef4444'];

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ 
  data,
  activeTitle,
  onTitleChange,
  currentCoverIdeas,
  onCoverIdeasChange,
  specificFixes,
  onFixChange,
  coverImages,
  onCoverImageGenerated,
  customTitles,
  onCustomTitlesChange,
  authorName,
  onAuthorNameChange,
  authorUrl,
  onAuthorUrlChange,
  authorBio,
  onAuthorBioChange,
  onDescriptionUpdate,
  onDownloadPdf
}) => {
  const [copied, setCopied] = useState(false);
  
  // Cover Generation State
  const [generatingCoverIndex, setGeneratingCoverIndex] = useState<number | null>(null);
  const [isRefreshingConcepts, setIsRefreshingConcepts] = useState(false);
  
  // Custom Title State
  const [newTitleInput, setNewTitleInput] = useState('');
  
  // Description View Mode
  const [descViewMode, setDescViewMode] = useState<'preview' | 'html'>('preview');
  
  // Interactive fix state
  const [fixingWeaknessIndex, setFixingWeaknessIndex] = useState<number | null>(null);
  
  // Description Rewrite State
  const [isRewriting, setIsRewriting] = useState(false);
  
  // Bio Generation State
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);

  // Social Media Kit State
  const [socialContent, setSocialContent] = useState<SocialMediaContent | null>(null);
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
  const [copiedSocial, setCopiedSocial] = useState<string | null>(null);

  const sentimentData = [
    { name: 'Positive', value: data.sentimentBreakdown.positive },
    { name: 'Neutral', value: data.sentimentBreakdown.neutral },
    { name: 'Negative', value: data.sentimentBreakdown.negative },
  ];

  const handleCopy = () => {
    const textToCopy = descViewMode === 'preview' ? data.improvedDescription : data.amazonKdpHtml;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSocial(id);
    setTimeout(() => setCopiedSocial(null), 2000);
  };

  const handleTitleSelect = async (newTitle: string) => {
    if (newTitle === activeTitle) return;
    
    onTitleChange(newTitle);
    setIsRefreshingConcepts(true);
    
    try {
        const newConcepts = await generateNewCoverConcepts(newTitle, data.categoryPrediction, data.summary);
        if (newConcepts && newConcepts.length > 0) {
            onCoverIdeasChange(newConcepts);
        }
    } catch (error) {
        console.error("Error refreshing concepts", error);
    } finally {
        setIsRefreshingConcepts(false);
    }
  };

  const handleAddCustomTitle = () => {
    if (!newTitleInput.trim()) return;
    const titleToAdd = newTitleInput.trim();
    
    // Avoid duplicates
    if (!customTitles.includes(titleToAdd) && !data.titleSuggestions.includes(titleToAdd)) {
         onCustomTitlesChange([...customTitles, titleToAdd]);
    }
    
    setNewTitleInput('');
    handleTitleSelect(titleToAdd);
  };

  const handleGenerateCover = async (index: number, idea: string) => {
    setGeneratingCoverIndex(index);
    try {
      // Use activeTitle so the generated cover has the selected title on it
      const imageUrl = await generateCoverImage(idea, activeTitle, data.categoryPrediction, authorName);
      onCoverImageGenerated(index, imageUrl);
    } catch (error) {
      console.error("Failed to generate cover:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setGeneratingCoverIndex(null);
    }
  };

  const handleGenerateFix = async (index: number, weakness: string) => {
    setFixingWeaknessIndex(index);
    try {
      const context = `Title: ${activeTitle}, Author: ${data.author}, Category: ${data.categoryPrediction}, Summary: ${data.summary}`;
      const fix = await generateSpecificFix(weakness, context);
      onFixChange(index, fix);
    } catch (error) {
      console.error("Failed to generate fix:", error);
    } finally {
      setFixingWeaknessIndex(null);
    }
  };

  const handleRewriteDescription = async () => {
    if (Object.keys(specificFixes).length === 0) return;
    
    setIsRewriting(true);
    try {
        const result = await integrateFixesIntoDescription(
            data.improvedDescription,
            specificFixes,
            data.weaknesses
        );
        onDescriptionUpdate(result.improvedDescription, result.amazonKdpHtml);
    } catch (e) {
        console.error(e);
        alert("Failed to rewrite description");
    } finally {
        setIsRewriting(false);
    }
  };

  const handleGenerateBio = async () => {
    setIsGeneratingBio(true);
    try {
        const bio = await generateAuthorBio(authorName, data.summary, data.categoryPrediction);
        if (bio) {
            onAuthorBioChange(bio);
        }
    } catch (e) {
        console.error("Failed to generate bio", e);
    } finally {
        setIsGeneratingBio(false);
    }
  };

  const handleGenerateSocial = async () => {
    setIsGeneratingSocial(true);
    try {
        const content = await generateSocialMediaContent(activeTitle, data.summary, data.marketingHooks);
        setSocialContent(content);
    } catch (e) {
        console.error("Failed to generate social content", e);
    } finally {
        setIsGeneratingSocial(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Summary */}
      <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <BookOpen className="text-primary-500" />
              {activeTitle}
            </h2>
            <div className="flex items-center gap-2 mb-2">
              {authorName && (
                authorUrl ? (
                  <a href={authorUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-primary-400 transition-colors flex items-center gap-1 group">
                    <User size={12}/> {authorName} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </a>
                ) : (
                  <span className="text-sm text-slate-400 flex items-center gap-1"><User size={12}/> {authorName}</span>
                )
              )}
            </div>
            <p className="text-slate-400 max-w-2xl">{data.summary}</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
            <div className="text-center">
               <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pages</p>
               <p className="text-slate-200 font-medium">{data.pageCountEstimate}</p>
            </div>
            <div className="w-px h-10 bg-slate-700"></div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Price</p>
              <p className="text-green-400 font-medium">{data.recommendedPrice}</p>
            </div>
            <div className="w-px h-10 bg-slate-700"></div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Category</p>
              <p className="text-primary-400 font-medium max-w-[150px] truncate" title={data.categoryPrediction}>{data.categoryPrediction}</p>
            </div>
            <div className="w-px h-10 bg-slate-700"></div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Score</p>
              <div className={`text-2xl font-bold ${data.sentimentScore > 75 ? 'text-green-500' : data.sentimentScore > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                {data.sentimentScore}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sentiment Chart */}
        <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" />
            Sentiment Analysis
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg col-span-1 md:col-span-2">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
             <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-500" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {data.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
             </div>
             <div className="flex flex-col h-full">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  Weaknesses
                </h3>
                <ul className="space-y-3 mb-4">
                  {data.weaknesses.map((w, i) => (
                    <li key={i} className="flex flex-col gap-2 text-slate-300 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="flex-1">{w}</span>
                        <button
                          onClick={() => handleGenerateFix(i, w)}
                          disabled={fixingWeaknessIndex === i}
                          className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-primary-400 border border-slate-700 rounded flex items-center gap-1 transition-colors whitespace-nowrap self-start ml-2"
                        >
                          {fixingWeaknessIndex === i ? (
                             <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                             <Wrench size={12} />
                          )}
                          {specificFixes[i] ? 'Fix Again' : 'Fix This'}
                        </button>
                      </div>
                      
                      {/* Generated Fix Display */}
                      {specificFixes[i] && (
                        <div className="ml-3.5 bg-slate-900/80 p-3 rounded border border-primary-900/50 text-xs text-slate-400 animate-fade-in">
                          <p className="font-semibold text-primary-400 mb-1 flex items-center gap-1">
                             <CheckCircle size={10} /> AI Applied Fix:
                          </p>
                          <p className="italic text-slate-300 selection:bg-primary-500/30">
                            "{specificFixes[i]}"
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                
                {data.weaknessFixes && data.weaknessFixes.length > 0 && (
                  <div className="mt-auto bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                     <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                        <Wrench size={14} />
                        Recommended Fixes Summary
                     </h4>
                     <ul className="space-y-2">
                      {data.weaknessFixes.map((fix, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-400 text-xs">
                           <span className="mt-1 w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                           {fix}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
             </div>
           </div>
        </div>
      </div>

      {/* Optimized Description (Rewrite) */}
      <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-500 to-indigo-500"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
             <Sparkles size={20} className="text-indigo-400" />
             Optimized Description
          </h3>
          <div className="flex flex-wrap items-center gap-2">
             {Object.keys(specificFixes).length > 0 && (
                <button
                    onClick={handleRewriteDescription}
                    disabled={isRewriting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-all shadow-lg shadow-indigo-900/20 mr-2 border border-indigo-400/20"
                >
                    {isRewriting ? (
                        <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <RefreshCw size={12} />
                    )}
                    Rewrite with Fixes
                </button>
             )}
             
             <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button 
                onClick={() => setDescViewMode('preview')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${descViewMode === 'preview' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                <Eye size={12} /> Preview
                </button>
                <button 
                onClick={() => setDescViewMode('html')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${descViewMode === 'html' ? 'bg-indigo-900/50 text-indigo-300 shadow border border-indigo-800/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                <Code size={12} /> KDP HTML Code
                </button>
             </div>
             
             <button 
               onClick={handleCopy}
               className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded text-xs text-slate-300 transition-all ml-auto sm:ml-0"
             >
               {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
               {copied ? 'Copied!' : 'Copy'}
             </button>
             
             <button
                onClick={onDownloadPdf}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-medium transition-all shadow-lg ml-2 border border-green-500/20"
                title="Download Fixed PDF"
             >
                <FileDown size={12} />
                Download PDF
             </button>
          </div>
        </div>
        
        {descViewMode === 'preview' ? (
            <div className="bg-slate-900/80 p-6 rounded-lg border border-slate-800 text-slate-300 font-serif leading-relaxed whitespace-pre-wrap shadow-inner relative animate-fade-in">
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
                <FileText size={64} />
              </div>
              {data.improvedDescription}
            </div>
        ) : (
            <div className="bg-slate-950 p-6 rounded-lg border border-indigo-900/30 text-indigo-100 font-mono text-xs leading-loose shadow-inner relative animate-fade-in overflow-x-auto">
               {data.amazonKdpHtml}
            </div>
        )}
        
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <Zap size={12} className="text-yellow-500" />
          {descViewMode === 'preview' 
             ? "This version incorporates keywords and addresses weaknesses." 
             : "Copy this raw HTML code and paste it directly into the Amazon KDP description editor."}
        </p>
      </div>

      {/* Social Media Marketing Kit - NEW SECTION */}
      <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Share2 size={20} className="text-purple-400" />
                Social Media Marketing Kit
            </h3>
            
            {!socialContent && (
                <button
                    onClick={handleGenerateSocial}
                    disabled={isGeneratingSocial}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 rounded text-sm font-medium border border-purple-800 transition-all"
                >
                    {isGeneratingSocial ? (
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Sparkles size={14} />
                    )}
                    Generate Marketing Copy
                </button>
            )}
        </div>
        
        {!socialContent ? (
            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-700 rounded-lg">
                <p>Click "Generate Marketing Copy" to create ready-to-post Tweets, Facebook Ads, and Emails.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {/* Tweets */}
                <div className="space-y-4">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                        <Twitter size={16} className="text-blue-400"/> Tweets / X Posts
                    </h4>
                    {socialContent.tweets.map((tweet, i) => (
                        <div key={i} className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-sm text-slate-300 relative group">
                            <p className="pr-6">{tweet}</p>
                            <button 
                                onClick={() => handleCopyText(tweet, `tweet-${i}`)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                title="Copy"
                            >
                                {copiedSocial === `tweet-${i}` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    ))}
                </div>

                {/* FB & Email */}
                <div className="space-y-6">
                    {/* FB Ad */}
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 relative group">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
                            <Facebook size={16} className="text-blue-600"/> Facebook Ad Copy
                        </h4>
                        <div className="text-sm text-slate-300 whitespace-pre-wrap">{socialContent.facebookAd}</div>
                        <button 
                            onClick={() => handleCopyText(socialContent.facebookAd, 'fb-ad')}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                            title="Copy"
                        >
                            {copiedSocial === 'fb-ad' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>

                    {/* Email */}
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 relative group">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
                            <Mail size={16} className="text-yellow-500"/> Email Newsletter
                        </h4>
                        <div className="space-y-2 text-sm">
                            <p className="font-bold text-slate-200"><span className="text-slate-500 font-normal">Subject:</span> {socialContent.emailSubject}</p>
                            <div className="h-px bg-slate-800"></div>
                            <p className="text-slate-300 whitespace-pre-wrap">{socialContent.emailBody}</p>
                        </div>
                        <button 
                            onClick={() => handleCopyText(`${socialContent.emailSubject}\n\n${socialContent.emailBody}`, 'email')}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                            title="Copy"
                        >
                            {copiedSocial === 'email' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Creative Strategy: Titles & Covers */}
      <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Creative Strategy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Title Suggestions */}
            <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <PenTool size={18} className="text-pink-500" />
                    Title Suggestions
                </h4>
                <p className="text-xs text-slate-400 mb-3">Click a title to apply it and generate new cover concepts.</p>
                <div className="space-y-3">
                    {data.titleSuggestions?.map((title, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleTitleSelect(title)}
                          className={`w-full text-left p-3 rounded-lg border text-sm font-medium transition-all cursor-pointer group flex justify-between items-center ${
                            activeTitle === title 
                            ? 'bg-pink-900/20 border-pink-500/50 text-pink-200 ring-1 ring-pink-500/30' 
                            : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-pink-500/30 hover:bg-slate-750'
                          }`}
                        >
                            <span className="truncate pr-2">{title}</span>
                            {activeTitle === title && <Check size={14} className="text-pink-500 flex-shrink-0" />}
                        </button>
                    ))}

                    {customTitles.map((title, i) => (
                        <button 
                          key={`custom-${i}`} 
                          onClick={() => handleTitleSelect(title)}
                          className={`w-full text-left p-3 rounded-lg border text-sm font-medium transition-all cursor-pointer group flex justify-between items-center ${
                            activeTitle === title 
                            ? 'bg-pink-900/20 border-pink-500/50 text-pink-200 ring-1 ring-pink-500/30' 
                            : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-pink-500/30 hover:bg-slate-750'
                          }`}
                        >
                            <span className="truncate pr-2">{title}</span>
                            {activeTitle === title && <Check size={14} className="text-pink-500 flex-shrink-0" />}
                        </button>
                    ))}

                    <div className="flex gap-2 pt-2">
                        <input 
                            type="text" 
                            value={newTitleInput}
                            onChange={(e) => setNewTitleInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTitle()}
                            placeholder="Add your own title..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 outline-none placeholder-slate-600"
                        />
                        <button 
                            onClick={handleAddCustomTitle}
                            disabled={!newTitleInput.trim()}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add Custom Title"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <button 
                         onClick={() => handleTitleSelect(data.title)}
                         className={`w-full text-left p-3 rounded-lg border border-dashed text-sm font-medium transition-all cursor-pointer flex justify-between items-center mt-2 ${
                             activeTitle === data.title
                             ? 'bg-slate-800 border-slate-500 text-slate-300'
                             : 'bg-transparent border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                         }`}
                    >
                         <span>Revert to Original Title</span>
                         {activeTitle === data.title && <Check size={14} className="flex-shrink-0" />}
                    </button>
                </div>
            </div>

            {/* Cover Design Ideas */}
            <div>
                <div className="flex flex-col gap-4 mb-4">
                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Image size={18} className="text-blue-400" />
                        Cover Design Concepts
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                      <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Author Name on Cover</label>
                          <input 
                            type="text" 
                            value={authorName}
                            onChange={(e) => onAuthorNameChange(e.target.value)}
                            placeholder="Enter author name..."
                            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-primary-500 outline-none w-full"
                          />
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                            Author Profile URL <LinkIcon size={10} />
                          </label>
                          <input 
                            type="text" 
                            value={authorUrl}
                            onChange={(e) => onAuthorUrlChange(e.target.value)}
                            placeholder="https://amazon.com/author/..."
                            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:border-primary-500 outline-none w-full"
                          />
                      </div>
                    </div>
                </div>
                
                {isRefreshingConcepts ? (
                    <div className="space-y-4 animate-pulse">
                         {[1, 2, 3].map(i => (
                             <div key={i} className="bg-slate-800 p-4 rounded-lg border border-slate-700 h-32 flex items-center justify-center">
                                 <div className="flex flex-col items-center gap-2 text-slate-500">
                                     <RefreshCw size={24} className="animate-spin" />
                                     <span className="text-sm">Generating concepts for "{activeTitle}"...</span>
                                 </div>
                             </div>
                         ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentCoverIdeas?.map((idea, i) => (
                            <div key={i} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <div className="flex gap-3 mb-2">
                                    <div className="bg-blue-900/30 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border border-blue-800/50 mt-0.5">
                                        {i + 1}
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed">{idea}</p>
                                </div>
                                
                                {coverImages[i] ? (
                                <div className="mt-4 relative group">
                                    <img src={coverImages[i]} alt={`Cover concept ${i+1}`} className="w-full rounded-md shadow-lg border border-slate-700" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md pointer-events-none">
                                    </div>
                                    <a 
                                    href={coverImages[i]} 
                                    download={`bookscope-cover-${i+1}.png`}
                                    className="absolute bottom-3 right-3 bg-slate-900/90 hover:bg-slate-800 p-2 rounded-full text-white shadow-lg transition-all border border-slate-700 opacity-0 group-hover:opacity-100"
                                    title="Download Image"
                                    >
                                    <Download size={18} />
                                    </a>
                                </div>
                                ) : (
                                <button 
                                    onClick={() => handleGenerateCover(i, idea)}
                                    disabled={generatingCoverIndex === i}
                                    className="w-full mt-3 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded transition-colors flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-500"
                                >
                                    {generatingCoverIndex === i ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                        Generating Preview...
                                    </>
                                    ) : (
                                    <>
                                        <Image size={14} />
                                        Generate Preview
                                    </>
                                    )}
                                </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Author Biography Section */}
      <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Feather size={20} className="text-teal-400" />
                Author Biography
            </h3>
            
            {!authorBio && (
                <button
                    onClick={handleGenerateBio}
                    disabled={isGeneratingBio}
                    className="flex items-center gap-2 px-3 py-1.5 bg-teal-900/40 hover:bg-teal-900/60 text-teal-300 rounded text-xs font-medium border border-teal-800 transition-all"
                >
                    {isGeneratingBio ? (
                        <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Sparkles size={12} />
                    )}
                    Generate with AI
                </button>
            )}
        </div>
        
        <div className="relative">
            <textarea 
                value={authorBio}
                onChange={(e) => onAuthorBioChange(e.target.value)}
                placeholder={authorName ? `Add a biography for ${authorName}...` : "Paste or write the author's biography here..."}
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none placeholder-slate-600 text-sm leading-relaxed"
            />
            <div className="absolute bottom-3 right-3 text-xs text-slate-500 pointer-events-none">
                {authorBio.length} chars
            </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
            This biography will be included in your downloadable reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Audience */}
        <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            Target Audience
          </h3>
          <div className="flex flex-wrap gap-2">
             {data.targetAudience.map((audience, i) => (
               <div key={i} className="bg-slate-800 border border-slate-700 rounded-full px-4 py-2 text-sm text-blue-300">
                 {audience}
               </div>
             ))}
          </div>
        </div>

        {/* SEO Keywords */}
        <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={18} className="text-purple-500" />
            SEO Keywords
          </h3>
          <div className="flex flex-wrap gap-2">
             {data.keywords.map((keyword, i) => (
               <span key={i} className="bg-purple-900/30 border border-purple-800 rounded-md px-3 py-1 text-sm text-purple-300 font-mono">
                 #{keyword}
               </span>
             ))}
          </div>
        </div>
      </div>

      {/* Launch & Marketing Strategy */}
       <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
           <Rocket size={20} className="text-orange-500"/>
           Launch & Marketing Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Marketing Strategy Steps */}
            <div>
               <h4 className="text-lg font-semibold text-white mb-4">Strategic Actions</h4>
               <ul className="space-y-4">
                  {data.marketingStrategy?.map((strategy, i) => (
                    <li key={i} className="flex gap-3 text-slate-300 text-sm bg-slate-800/50 p-3 rounded-lg">
                      <div className="bg-orange-900/30 text-orange-400 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border border-orange-800/50">
                        {i + 1}
                      </div>
                      <span className="leading-relaxed">{strategy}</span>
                    </li>
                  ))}
               </ul>
            </div>

            {/* Pricing Strategy & Hooks */}
             <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-green-500" />
                    Pricing Strategy
                  </h4>
                  <div className="bg-slate-800/50 border border-green-900/30 p-4 rounded-lg">
                     <p className="text-slate-300 text-sm leading-relaxed">
                       {data.pricingStrategyDescription}
                     </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-yellow-400" />
                    Key Hooks
                  </h4>
                  <ul className="space-y-3">
                     {data.marketingHooks.map((hook, i) => (
                       <li key={i} className="text-slate-200 italic border-l-2 border-yellow-500 pl-4 py-2 bg-slate-800 rounded-r-md text-sm">
                         "{hook}"
                       </li>
                     ))}
                  </ul>
                </div>
             </div>
        </div>
      </div>

      {/* General Improvements */}
      <div className="bg-slate-850 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-cyan-400" />
          General Improvements
        </h3>
        <div className="space-y-3">
           {data.improvementTips.map((tip, i) => (
             <div key={i} className="flex gap-3">
                <div className="bg-cyan-900/50 text-cyan-400 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border border-cyan-800">
                  {i + 1}
                </div>
                <p className="text-slate-300 text-sm">{tip}</p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
