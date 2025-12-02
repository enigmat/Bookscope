

import React, { useState, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { ResultsDashboard } from './components/ResultsDashboard';
import { HistoryList } from './components/HistoryList';
import { TrendFinder } from './components/TrendFinder';
import { analyzeContent } from './services/geminiService';
import { getHistory, saveHistoryItem, deleteHistoryItem } from './services/historyService';
import { AnalysisResult, HistoryItem, AppMode, AplusContent } from './types';
import { Book, LayoutDashboard, Github, Download, FileDown, FileText, History as HistoryIcon, ArrowLeft, User, TrendingUp, Search } from 'lucide-react';
import { jsPDF } from "jspdf";

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('ANALYZE');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Lifted state to support report downloading with interactive changes
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [currentCoverIdeas, setCurrentCoverIdeas] = useState<string[]>([]);
  const [specificFixes, setSpecificFixes] = useState<Record<number, string>>({});
  const [coverImages, setCoverImages] = useState<Record<number, string>>({});
  
  // New lifted state variables
  const [customTitles, setCustomTitles] = useState<string[]>([]);
  const [authorName, setAuthorName] = useState<string>('');
  const [authorUrl, setAuthorUrl] = useState<string>('https://www.amazon.com/author/billhanoman');
  const [authorBio, setAuthorBio] = useState<string>('');
  
  // A+ Content State
  const [aplusContent, setAplusContent] = useState<AplusContent | null>(null);
  const [aplusImages, setAplusImages] = useState<Record<number, string>>({});

  // Load history on mount
  useEffect(() => {
    const initHistory = async () => {
        try {
            const loadedHistory = await getHistory();
            setHistory(loadedHistory);
        } catch (e) {
            console.error("Failed to initialize history:", e);
        }
    };
    initHistory();
  }, []);

  // Auto-save history when important state changes
  useEffect(() => {
    if (data && currentHistoryId) {
        const item: HistoryItem = {
            id: currentHistoryId,
            timestamp: Date.now(),
            title: activeTitle || data.title,
            summary: data.summary,
            result: data,
            interactiveState: {
                activeTitle,
                currentCoverIdeas,
                specificFixes,
                coverImages,
                customTitles,
                authorName,
                authorUrl,
                authorBio,
                aplusContent: aplusContent || undefined,
                aplusImages
            }
        };
        
        // Fire and forget save, but update local state immediately for UI responsiveness
        saveHistoryItem(item).catch(e => console.error("Auto-save failed:", e));
        
        setHistory(prev => {
            const index = prev.findIndex(h => h.id === currentHistoryId);
            if (index >= 0) {
                const newHistory = [...prev];
                newHistory[index] = item;
                return newHistory;
            }
            return [item, ...prev];
        });
    }
  }, [data, activeTitle, currentCoverIdeas, specificFixes, coverImages, customTitles, authorName, authorUrl, authorBio, aplusContent, aplusImages, currentHistoryId]);

  const handleAnalyze = async (text: string, fileData: string | undefined) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeContent(text, fileData);
      
      // Initialize state
      setData(result);
      setActiveTitle(result.title);
      setCurrentCoverIdeas(result.coverDesignIdeas);
      setSpecificFixes({});
      setCoverImages({});
      setCustomTitles([]);
      setAuthorName(result.author || '');
      // Keep authorUrl as default if not already set, or just default to Bill's link
      if (!authorUrl) setAuthorUrl('https://www.amazon.com/author/billhanoman');
      setAuthorBio(result.authorBio || '');
      setAplusContent(null);
      setAplusImages({});

      // Create new history item
      const newId = Date.now().toString();
      setCurrentHistoryId(newId);
      
    } catch (err: any) {
      setError(err.message || "Something went wrong during analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
      setData(item.result);
      setActiveTitle(item.interactiveState.activeTitle);
      setCurrentCoverIdeas(item.interactiveState.currentCoverIdeas);
      setSpecificFixes(item.interactiveState.specificFixes);
      setCoverImages(item.interactiveState.coverImages);
      setCustomTitles(item.interactiveState.customTitles || []); // fallback for old history
      setAuthorName(item.interactiveState.authorName || item.result.author || '');
      setAuthorUrl(item.interactiveState.authorUrl || 'https://www.amazon.com/author/billhanoman');
      setAuthorBio(item.interactiveState.authorBio || item.result.authorBio || '');
      setAplusContent(item.interactiveState.aplusContent || null);
      setAplusImages(item.interactiveState.aplusImages || {});
      
      setCurrentHistoryId(item.id);
      setShowHistoryModal(false);
      setMode('ANALYZE');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = async (id: string) => {
      try {
          const updatedHistory = await deleteHistoryItem(id);
          setHistory(updatedHistory);
          if (currentHistoryId === id) {
              handleReset();
          }
      } catch (e) {
          console.error("Failed to delete item:", e);
      }
  };

  const handleReset = () => {
    setData(null);
    setError(null);
    setActiveTitle('');
    setCurrentCoverIdeas([]);
    setSpecificFixes({});
    setCoverImages({});
    setCustomTitles([]);
    setAuthorName('');
    setAuthorBio('');
    setAplusContent(null);
    setAplusImages({});
    // setAuthorUrl(''); // We can keep the URL or reset it. Keeping it is often better UX for same user.
    setCurrentHistoryId(null);
  };

  const handleFixUpdate = (index: number, fix: string) => {
    setSpecificFixes(prev => ({...prev, [index]: fix}));
  };
  
  const handleCoverImageUpdate = (index: number, url: string) => {
    setCoverImages(prev => ({...prev, [index]: url}));
  };
  
  const handleAplusImageUpdate = (index: number, url: string) => {
    setAplusImages(prev => ({...prev, [index]: url}));
  };
  
  const handleDescriptionUpdate = (newDesc: string, newHtml: string) => {
    if (data) {
        setData({
            ...data,
            improvedDescription: newDesc,
            amazonKdpHtml: newHtml
        });
    }
  };

  const downloadReport = () => {
    if (!data) return;
    
    // Use the active title for the filename and header
    const reportTitle = activeTitle || data.title || 'BookScope Analysis';

    const markdown = `# ${reportTitle}
Generated: ${new Date().toLocaleDateString()}
${authorName ? `Author: ${authorName}` : ''}
${authorUrl ? `Author Page: ${authorUrl}` : ''}

## Executive Summary
${data.summary}

## Performance Metrics
- Sentiment Score: ${data.sentimentScore}/100
- Category: ${data.categoryPrediction}
- Estimated Page Count: ${data.pageCountEstimate}
- Recommended Price: ${data.recommendedPrice}

## Strategic Pricing
${data.pricingStrategyDescription}

## Marketing Strategy
${data.marketingStrategy.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Target Audience
${data.targetAudience.join(', ')}

## SEO Keywords
${data.keywords.join(', ')}

## Strengths
${data.strengths.map(s => `- ${s}`).join('\n')}

## Weaknesses & Recommended Fixes
${data.weaknesses.map((w, i) => {
  // Check if there is an interactively generated fix, otherwise fallback to default
  const fix = specificFixes[i] 
    ? specificFixes[i] 
    : (data.weaknessFixes?.[i] || 'Use the dashboard "Fix This" button to generate a specific solution.');
    
  return `### Weakness ${i + 1}: ${w}
- **Suggested Fix**: ${fix}`;
}).join('\n')}

## Optimized Description (Rewrite)
${data.improvedDescription}

## KDP HTML Code (Ready for Amazon)
\`\`\`html
${data.amazonKdpHtml}
\`\`\`

## Creative Strategy
### Title Suggestions
${data.titleSuggestions.map(t => `- ${t} ${t === activeTitle ? '(Selected)' : ''}`).join('\n')}

### Cover Design Concepts (For Title: ${activeTitle})
${currentCoverIdeas.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Author Biography
${authorBio || "No biography provided."}

## Amazon A+ Content Plan
${aplusContent ? aplusContent.modules.map((m, i) => `
### Module ${i+1}: ${m.type}
- Headline: ${m.headline}
- Body: ${m.body}
- Image Prompt: ${m.imagePrompt}
`).join('\n') : "No A+ content strategy generated."}

## Improvement Tips
${data.improvementTips.map(t => `- ${t}`).join('\n')}
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadFixedPdf = () => {
    if (!data) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    let y = 20;

    // Helper to add text and advance Y
    const addText = (text: string, fontSize: number, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxLineWidth);
      
      // Check for page break
      if (y + (lines.length * fontSize * 0.4) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(lines, margin, y);
      y += lines.length * fontSize * 0.4 + 4; // Line height + spacing
    };

    const addSectionTitle = (title: string) => {
      y += 8;
      // Check for page break before title
      if (y > doc.internal.pageSize.getHeight() - margin - 20) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(0, 0, 0);
      addText(title, 16, true);
      y += 2;
      doc.setTextColor(60, 60, 60);
    };

    // --- Page 1: Title Page ---
    const reportTitle = activeTitle || data.title || 'BookScope Analysis';
    
    // Add Cover Image if available
    const coverKeys = Object.keys(coverImages);
    if (coverKeys.length > 0) {
        // Use the first generated cover available
        const firstImage = coverImages[parseInt(coverKeys[0])];
        if (firstImage) {
            try {
                // Keep aspect ratio roughly square or portrait
                doc.addImage(firstImage, 'PNG', (pageWidth - 100) / 2, y, 100, 100); 
                y += 110;
            } catch (e) {
                console.error("Could not add image to PDF", e);
            }
        }
    } else {
        y += 40;
    }

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    if (authorName) {
       doc.setFontSize(14);
       doc.setFont("helvetica", "normal");
       doc.text(`Author: ${authorName}`, pageWidth / 2, y, { align: 'center' });
       y += 10;
    }
    
    if (authorUrl) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 255);
        doc.textWithLink("Visit Author Page", pageWidth / 2, y, { url: authorUrl, align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 15;
    } else {
        y += 10;
    }
    
    doc.setFontSize(10);
    doc.text(`Generated by BookScope AI on ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    
    doc.addPage();
    y = 20;

    // --- Page 2+: Content ---
    doc.setTextColor(60, 60, 60);

    // Optimized Description
    addSectionTitle("Optimized Description");
    addText(data.improvedDescription, 11);

    // Fixes
    const fixesKeys = Object.keys(specificFixes);
    if (fixesKeys.length > 0) {
        addSectionTitle("Applied Fixes & Improvements");
        data.weaknesses.forEach((w, i) => {
            if (specificFixes[i]) {
                doc.setTextColor(200, 50, 50); // Reddish for weakness
                addText(`Weakness: ${w}`, 10, true);
                doc.setTextColor(0, 150, 0); // Greenish for fix
                addText(`AI Fix: ${specificFixes[i]}`, 10, false);
                y += 4;
            }
        });
        doc.setTextColor(60, 60, 60);
    }

    // Creative Strategy
    addSectionTitle("Creative Strategy");
    addText(`Selected Title: ${activeTitle}`, 11, true);
    y+=2;
    addText("Cover Concepts:", 11, true);
    currentCoverIdeas.forEach((idea, i) => {
        addText(`${i+1}. ${idea}`, 10);
    });
    
    // Author Bio
    if (authorBio) {
        addSectionTitle("Author Biography");
        addText(authorBio, 11);
    }

    // Marketing
    addSectionTitle("Marketing Strategy");
    data.marketingStrategy.forEach((s, i) => {
        addText(`${i+1}. ${s}`, 10);
    });
    
    // A+ Content
    if (aplusContent) {
        addSectionTitle("Amazon A+ Content Plan");
        aplusContent.modules.forEach((m, i) => {
            addText(`Module ${i+1}: ${m.type}`, 11, true);
            addText(`Headline: ${m.headline}`, 10);
            addText(`Body: ${m.body}`, 10);
            y += 2;
            
            // Add generated image if exists
            if (aplusImages[i]) {
                try {
                     // Add image with aspect ratio roughly 2:1 for headers
                     doc.addImage(aplusImages[i], 'PNG', margin, y, maxLineWidth, 60);
                     y += 65;
                } catch (e) {
                     console.error("Could not add A+ image to PDF", e);
                }
            } else {
                 addText(`Image Prompt: ${m.imagePrompt}`, 9);
                 y += 4;
            }
        });
    }
    
    // Metadata
    addSectionTitle("Metadata");
    addText(`Keywords: ${data.keywords.join(', ')}`, 10);
    addText(`Target Audience: ${data.targetAudience.join(', ')}`, 10);
    addText(`Price: ${data.recommendedPrice}`, 10);

    doc.save(`${reportTitle.replace(/[^a-z0-9]/gi, '_')}_Fixed_Assets.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary-500/30">
      
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="bg-gradient-to-tr from-primary-600 to-indigo-600 p-2 rounded-lg">
              <Book className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              BookScope
            </span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
             {/* New Mode Toggles */}
             <div className="hidden md:flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button 
                  onClick={() => setMode('ANALYZE')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === 'ANALYZE' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Search size={14} /> Analyze Book
                </button>
                <button 
                  onClick={() => setMode('TRENDS')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === 'TRENDS' ? 'bg-slate-800 text-pink-400 shadow' : 'text-slate-400 hover:text-pink-300'}`}
                >
                  <TrendingUp size={14} /> Find Trends
                </button>
             </div>

            <button className="hidden lg:block text-sm text-slate-400 hover:text-white transition-colors cursor-default">Pricing</button>
            <button className="hidden lg:block text-sm text-slate-400 hover:text-white transition-colors cursor-default">Documentation</button>
            
            <a 
              href="https://www.amazon.com/author/billhanoman" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <User size={16} />
              <span className="hidden lg:inline">Author Page</span>
            </a>

            {/* History Toggle Button */}
            <button 
                onClick={() => setShowHistoryModal(!showHistoryModal)}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors border ${showHistoryModal ? 'bg-slate-800 text-white border-slate-600' : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800/50'}`}
                title="View History"
            >
                <HistoryIcon size={16} />
                <span className="hidden sm:inline">History</span>
            </button>

            <div className="w-px h-4 bg-slate-700"></div>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Github size={20} />
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile Mode Toggle (Visible only on small screens) */}
      <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 py-2 flex justify-center gap-2">
         <button 
           onClick={() => setMode('ANALYZE')}
           className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'ANALYZE' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400'}`}
         >
           <Search size={16} /> Analyze
         </button>
         <button 
           onClick={() => setMode('TRENDS')}
           className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'TRENDS' ? 'bg-slate-800 text-pink-400 border border-slate-700' : 'text-slate-400'}`}
         >
           <TrendingUp size={16} /> Trends
         </button>
      </div>

      {/* History Modal Overlay */}
      {showHistoryModal && (
          <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
              <div className="w-full max-w-4xl bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-fade-in-up">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <HistoryIcon className="text-primary-500" /> Saved Analyses
                      </h3>
                      <button 
                        onClick={() => setShowHistoryModal(false)}
                        className="text-slate-400 hover:text-white"
                      >
                          Close
                      </button>
                  </div>
                  <div className="p-4 overflow-y-auto">
                      <HistoryList 
                        history={history} 
                        onLoad={loadHistoryItem} 
                        onDelete={handleDeleteHistory}
                      />
                  </div>
              </div>
          </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/30 border border-red-800 text-red-200 rounded-lg flex items-center gap-3">
             <span className="bg-red-900 rounded-full p-1"><LayoutDashboard size={14} /></span>
             {error}
          </div>
        )}

        {/* MODE SWITCHING LOGIC */}
        {mode === 'TRENDS' ? (
           <TrendFinder authorName={authorName || 'Bill Hanoman'} />
        ) : !data ? (
          <div className="flex flex-col items-center justify-center space-y-12 animate-fade-in-up">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                Optimize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-indigo-500">Kindle Best Seller</span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed">
                Analyze your book's description, reviews, or cover instantly with AI. 
                Get actionable insights on sentiment, SEO, and audience targeting to boost your sales rank.
              </p>
            </div>
            
            <InputSection onAnalyze={handleAnalyze} isLoading={isLoading} />
            
            {/* Recent History on Home Screen */}
            {history.length > 0 && (
                <HistoryList 
                    history={history} 
                    onLoad={loadHistoryItem} 
                    onDelete={handleDeleteHistory}
                />
            )}
            
            {history.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mt-16 text-center">
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="w-12 h-12 bg-blue-900/30 text-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <LayoutDashboard />
                    </div>
                    <h3 className="font-semibold text-white mb-2">Deep Analysis</h3>
                    <p className="text-sm text-slate-500">Uncover hidden trends in customer feedback and competitor listings.</p>
                </div>
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="w-12 h-12 bg-purple-900/30 text-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Book />
                    </div>
                    <h3 className="font-semibold text-white mb-2">Keyword Discovery</h3>
                    <p className="text-sm text-slate-500">Identify high-traffic keywords to optimize your KDP metadata.</p>
                </div>
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="w-12 h-12 bg-green-900/30 text-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <LayoutDashboard />
                    </div>
                    <h3 className="font-semibold text-white mb-2">Conversion Tips</h3>
                    <p className="text-sm text-slate-500">Get specific advice to turn browsers into buyers.</p>
                </div>
                </div>
            )}
          </div>
        ) : (
          <div>
            {/* ANALYZER RESULTS MODE */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
              <div className="flex items-center gap-4">
                  <button 
                    onClick={handleReset}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Back to Home"
                  >
                      <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-2xl font-bold text-white">Analysis Report</h2>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                 <button 
                  onClick={downloadFixedPdf}
                  className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/30"
                >
                  <FileDown size={16} />
                  Download Fixed PDF Assets
                </button>
                <button 
                  onClick={downloadReport}
                  className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FileText size={16} />
                  Download MD Report
                </button>
                <button 
                  onClick={handleReset}
                  className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                >
                  Analyze Another
                </button>
              </div>
            </div>
            <ResultsDashboard 
              data={data} 
              activeTitle={activeTitle}
              onTitleChange={setActiveTitle}
              currentCoverIdeas={currentCoverIdeas}
              onCoverIdeasChange={setCurrentCoverIdeas}
              specificFixes={specificFixes}
              onFixChange={handleFixUpdate}
              coverImages={coverImages}
              onCoverImageGenerated={handleCoverImageUpdate}
              customTitles={customTitles}
              onCustomTitlesChange={setCustomTitles}
              authorName={authorName}
              onAuthorNameChange={setAuthorName}
              authorUrl={authorUrl}
              onAuthorUrlChange={setAuthorUrl}
              authorBio={authorBio}
              onAuthorBioChange={setAuthorBio}
              onDescriptionUpdate={handleDescriptionUpdate}
              onDownloadPdf={downloadFixedPdf}
              aplusContent={aplusContent}
              onAplusContentChange={setAplusContent}
              aplusImages={aplusImages}
              onAplusImageGenerated={handleAplusImageUpdate}
            />
            
            {/* NEW BOTTOM SECTION for Download visibility */}
            <div className="mt-12 p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-indigo-900/50 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Ready to Publish?</h3>
                <p className="text-slate-400 mb-8 max-w-2xl mx-auto relative z-10">
                    Get your comprehensive report including the optimized description, strategy, fixed weaknesses, and your selected cover design in a professional PDF format.
                </p>
                <button 
                  onClick={downloadFixedPdf}
                  className="mx-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-xl hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-1 flex items-center gap-3 relative z-10"
                >
                  <FileDown size={24} />
                  <span className="text-lg">Download Fixed PDF Assets</span>
                </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-600 text-sm">
          <p>© {new Date().getFullYear()} BookScope Analytics. Powered by Gemini 2.5.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;