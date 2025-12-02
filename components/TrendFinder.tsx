

import React, { useState } from 'react';
import { TrendingTopic, TrendingCategory } from '../types';
import { getTrendingTopics, generateTitleFromTopic, generateCoverImage, generatePersona } from '../services/geminiService';
import { Sparkles, TrendingUp, ArrowRight, Loader, Book, Download, RefreshCw, User, Grid, Search, BarChart3, Eye, Feather } from 'lucide-react';

interface TrendFinderProps {
  authorName: string;
}

export const TrendFinder: React.FC<TrendFinderProps> = ({ authorName }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<TrendingCategory[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null);
  const [generatingConcept, setGeneratingConcept] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Concept Result
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedSubtitle, setGeneratedSubtitle] = useState('');
  const [generatedCover, setGeneratedCover] = useState('');
  
  // Persona State
  const [penName, setPenName] = useState('');
  const [authorBio, setAuthorBio] = useState('');

  const handleScanTrends = async (customTopic?: string) => {
    setLoading(true);
    setCategories([]);
    setSelectedTopic(null);
    setGeneratedTitle('');
    setGeneratedSubtitle('');
    setGeneratedCover('');
    setPenName('');
    setAuthorBio('');
    
    // If a custom topic is passed (e.g. from preset), update search term UI to match
    if (customTopic) {
        setSearchTerm(customTopic);
    }
    
    try {
      // Pass the custom topic (or current search term if generic scan triggered)
      const topicToScan = customTopic; 
      const results = await getTrendingTopics(topicToScan);
      
      // Ensure unique IDs if the AI generated generic ones
      const processedCategories = results.map((cat, catIdx) => ({
        ...cat,
        topics: cat.topics.map((t, topicIdx) => ({
            ...t,
            id: t.id || `topic-${catIdx}-${topicIdx}`
        }))
      }));
      setCategories(processedCategories);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch trends. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTopic = async (topic: TrendingTopic, categoryName: string) => {
    setSelectedTopic(topic);
    setGeneratingConcept(true);
    setGeneratedTitle('');
    setGeneratedSubtitle('');
    setGeneratedCover('');
    setPenName('');
    setAuthorBio('');

    try {
      // 1. Generate Title
      const titleData = await generateTitleFromTopic(topic.topic, topic.description);
      setGeneratedTitle(titleData.title);
      setGeneratedSubtitle(titleData.subtitle);
      
      // 2. Generate Persona (Pen Name & Bio)
      const persona = await generatePersona(topic.topic, categoryName);
      setPenName(persona.penName);
      setAuthorBio(persona.bio);

      // 3. Generate Cover
      // We create a prompt based on the topic and title
      const fullTitle = titleData.subtitle ? `${titleData.title}: ${titleData.subtitle}` : titleData.title;
      
      const coverPrompt = `A best-selling book cover for a book titled "${fullTitle}". 
      Topic: ${topic.topic}. 
      Style: Modern, eye-catching, high contrast. 
      Target Audience: ${topic.audience}.`;
      
      // Use the generated Pen Name if available, otherwise fallback to prop
      const authorToUse = persona.penName || authorName;
      
      // Use the categoryName as the genre hint to support both Fiction and Non-Fiction/Guides
      const imageUrl = await generateCoverImage(coverPrompt, titleData.title, categoryName, authorToUse);
      setGeneratedCover(imageUrl);
      
    } catch (error) {
      console.error(error);
      alert("Failed to generate concept.");
    } finally {
      setGeneratingConcept(false);
    }
  };

  const presetCategories = ['Thriller', 'Romance', 'Sci-Fi', 'Fantasy', 'Self-Help', 'Business', 'Cookbooks', 'Biography'];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in">
      
      {/* Hero / Search */}
      <div className="text-center space-y-6 py-8">
         <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <TrendingUp className="text-pink-500" size={32} />
            Trend Discovery Engine
         </h2>
         <p className="text-slate-400 max-w-2xl mx-auto">
            Explore high-demand book niches. Search for a specific topic or scan the general market for opportunities.
         </p>
         
         {!loading && !selectedTopic && (
             <div className="max-w-2xl mx-auto space-y-4 px-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Enter a category (e.g. 'Urban Fantasy', 'Keto Diet')..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition-colors placeholder-slate-600"
                        onKeyDown={(e) => e.key === 'Enter' && handleScanTrends(searchTerm)}
                    />
                    <button 
                        onClick={() => handleScanTrends(searchTerm)}
                        disabled={!searchTerm.trim()}
                        className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Search size={20} /> Search
                    </button>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    {presetCategories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => handleScanTrends(cat)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="pt-2">
                    <button
                        onClick={() => { setSearchTerm(''); handleScanTrends(''); }}
                        className="text-sm text-slate-500 hover:text-pink-400 underline decoration-dotted transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                        <Sparkles size={14} /> I'm feeling lucky (Scan General Market)
                    </button>
                </div>
             </div>
         )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
           <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
           <p className="text-slate-300 font-medium animate-pulse">
               {searchTerm ? `Scanning trends in "${searchTerm}"...` : 'Analyzing Amazon Best Sellers & Google Trends...'}
           </p>
        </div>
      )}

      {/* Results View */}
      {!loading && categories.length > 0 && !selectedTopic && (
          <div className="space-y-12">
             {categories.map((category, idx) => (
                <div key={idx} className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 border-b border-slate-700 pb-4">
                        <Grid className="text-pink-500" size={24} />
                        {category.categoryName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {category.topics.map((topic) => (
                        <button
                            key={topic.id}
                            onClick={() => handleSelectTopic(topic, category.categoryName)}
                            className="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-pink-500/50 p-6 rounded-xl text-left transition-all group relative overflow-hidden flex flex-col h-full hover:shadow-lg hover:shadow-pink-900/10"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp size={48} />
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 group-hover:text-pink-400 transition-colors line-clamp-2">
                                {topic.topic}
                            </h4>
                            <div className="mb-4">
                                <span className="text-xs font-semibold bg-pink-900/30 text-pink-300 px-2 py-1 rounded border border-pink-800/30">
                                    Trending
                                </span>
                            </div>
                            
                            <div className="mb-4 space-y-3">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><Eye size={10} /> Interest Level</span>
                                        <span>{topic.interestScore || 75}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${topic.interestScore || 75}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><BarChart3 size={10} /> Market Demand</span>
                                        <span>{topic.marketDemandScore || 60}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${topic.marketDemandScore || 60}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-slate-400 text-sm mb-4 flex-grow line-clamp-3">
                                {topic.description}
                            </p>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 mt-auto mb-3">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Why it's hot:</p>
                                <p className="text-xs text-slate-300 italic line-clamp-2">{topic.reason}</p>
                            </div>
                            <div className="mt-2 flex items-center text-pink-400 text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                Generate Concept <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                            </div>
                        </button>
                        ))}
                    </div>
                </div>
             ))}
          </div>
      )}

      {/* Concept Generator View */}
      {selectedTopic && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
             <div className="p-4 bg-slate-850 border-b border-slate-700 flex justify-between items-center">
                <button 
                  onClick={() => setSelectedTopic(null)}
                  className="text-slate-400 hover:text-white text-sm flex items-center gap-2"
                >
                   &larr; Back to Trends
                </button>
                <span className="text-slate-500 text-sm font-mono max-w-[200px] truncate">Topic: {selectedTopic.topic}</span>
             </div>

             <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                
                {/* Left: Details */}
                <div className="space-y-6">
                   <div>
                      <h3 className="text-sm text-pink-400 font-bold uppercase tracking-wider mb-2">Generated Title</h3>
                      {generatingConcept && !generatedTitle ? (
                          <div className="space-y-2">
                              <div className="h-10 bg-slate-800 rounded animate-pulse w-3/4"></div>
                              <div className="h-6 bg-slate-800/50 rounded animate-pulse w-1/2"></div>
                          </div>
                      ) : (
                          <div>
                              <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                                  {generatedTitle}
                              </h2>
                              {generatedSubtitle && (
                                  <p className="text-xl text-slate-400 mt-2 font-light">
                                      {generatedSubtitle}
                                  </p>
                              )}
                          </div>
                      )}
                   </div>

                   <div className="space-y-4">
                      {/* Author Persona Card */}
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                         <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Feather size={16} className="text-orange-400"/> Author Persona
                         </h4>
                         {generatingConcept && !penName ? (
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                                <div className="h-12 bg-slate-700 rounded w-full"></div>
                            </div>
                         ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Pen Name</label>
                                    <input 
                                        type="text" 
                                        value={penName}
                                        onChange={(e) => setPenName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-orange-500 outline-none mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Author Bio</label>
                                    <textarea 
                                        value={authorBio}
                                        onChange={(e) => setAuthorBio(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:border-orange-500 outline-none mt-1 resize-none h-20 leading-relaxed"
                                    />
                                </div>
                            </div>
                         )}
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                         <h4 className="text-white font-semibold mb-1 flex items-center gap-2">
                            <Book size={16} className="text-blue-400"/> The Concept
                         </h4>
                         <p className="text-slate-400 text-sm">{selectedTopic.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                             <h4 className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                                <Eye size={12} className="text-blue-400" /> Interest
                             </h4>
                             <div className="flex items-end gap-2">
                                <span className="text-xl font-bold text-white">{selectedTopic.interestScore || 80}</span>
                                <span className="text-xs text-slate-400 mb-1">/ 100</span>
                             </div>
                             <div className="h-1 w-full bg-slate-700 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-blue-500" style={{width: `${selectedTopic.interestScore || 80}%`}}></div>
                             </div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                             <h4 className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                                <BarChart3 size={12} className="text-green-400" /> Demand
                             </h4>
                             <div className="flex items-end gap-2">
                                <span className="text-xl font-bold text-white">{selectedTopic.marketDemandScore || 80}</span>
                                <span className="text-xs text-slate-400 mb-1">/ 100</span>
                             </div>
                             <div className="h-1 w-full bg-slate-700 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-green-500" style={{width: `${selectedTopic.marketDemandScore || 80}%`}}></div>
                             </div>
                          </div>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                         <h4 className="text-white font-semibold mb-1 flex items-center gap-2">
                            <User size={16} className="text-purple-400"/> Target Audience
                         </h4>
                         <p className="text-slate-400 text-sm">{selectedTopic.audience}</p>
                      </div>
                   </div>

                   {!generatingConcept && (
                       <button
                         onClick={() => handleScanTrends(searchTerm)}
                         className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                       >
                          <RefreshCw size={16} /> 
                          {searchTerm ? `Find Another "${searchTerm}" Trend` : 'Scan General Market Again'}
                       </button>
                   )}
                </div>

                {/* Right: Cover Preview */}
                <div className="flex flex-col items-center justify-center sticky top-8">
                   <div className="relative w-full max-w-sm aspect-[2/3] bg-slate-800 rounded-lg shadow-2xl border border-slate-700 flex items-center justify-center overflow-hidden group">
                      {generatingConcept && !generatedCover ? (
                          <div className="flex flex-col items-center gap-4 p-8 text-center">
                             <Loader className="animate-spin text-pink-500" size={48} />
                             <p className="text-slate-400 text-sm">Designing cover & persona...</p>
                          </div>
                      ) : generatedCover ? (
                          <>
                            <img src={generatedCover} alt="Generated Book Cover" className="w-full h-full object-cover" />
                            <a 
                               href={generatedCover}
                               download={`trend-cover-${selectedTopic.id}.png`}
                               className="absolute bottom-4 right-4 bg-slate-900/90 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-pink-600 hover:scale-110 transform"
                               title="Download Cover"
                            >
                               <Download size={20} />
                            </a>
                          </>
                      ) : (
                          <div className="text-slate-600">Waiting...</div>
                      )}
                   </div>
                   {generatedCover && (
                       <p className="mt-4 text-xs text-slate-500">AI Generated Concept Preview</p>
                   )}
                </div>

             </div>
          </div>
      )}
    </div>
  );
};