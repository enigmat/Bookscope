

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, TrendingCategory } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize Gemini
// Note: In a real production app, we should check if API_KEY exists, 
// but for this environment, we assume it's injected.
const ai = new GoogleGenAI({ apiKey });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The likely title of the book or a short descriptive label." },
    author: { type: Type.STRING, description: "The author's name if identified in the text. If unknown, return an empty string." },
    authorBio: { type: Type.STRING, description: "The author's biography if identified in the text. If unknown, return an empty string." },
    summary: { type: Type.STRING, description: "A concise summary of the content provided." },
    sentimentScore: { type: Type.NUMBER, description: "Overall sentiment score from 0 (very negative) to 100 (very positive)." },
    sentimentBreakdown: {
      type: Type.OBJECT,
      properties: {
        positive: { type: Type.NUMBER, description: "Percentage of positive sentiment (0-100)" },
        neutral: { type: Type.NUMBER, description: "Percentage of neutral sentiment (0-100)" },
        negative: { type: Type.NUMBER, description: "Percentage of negative sentiment (0-100)" },
      },
      required: ["positive", "neutral", "negative"],
    },
    targetAudience: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 3-5 potential target audience personas." 
    },
    keywords: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 5-8 high-value SEO keywords relevant to Amazon." 
    },
    strengths: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Key selling points identified." 
    },
    weaknesses: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Potential flaws or areas of concern in the listing/text." 
    },
    weaknessFixes: {
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Specific actionable solutions or rewrites to address the identified weaknesses."
    },
    marketingHooks: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Catchy phrases or angles for marketing." 
    },
    categoryPrediction: { type: Type.STRING, description: "Predicted best-fit Amazon category." },
    pageCountEstimate: { type: Type.STRING, description: "Estimated page count range based on content type/genre (e.g. '250-300 pages')." },
    titleSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5 catchy, optimized alternative titles for the book."
    },
    coverDesignIdeas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 distinct visual concepts or art direction prompts for a book cover design."
    },
    recommendedPrice: {
      type: Type.STRING,
      description: "A specific recommended price point (e.g., '$2.99' or '$9.99') based on genre standards."
    },
    pricingStrategyDescription: {
      type: Type.STRING,
      description: "A detailed explanation of the pricing strategy, including launch pricing vs. standard pricing."
    },
    marketingStrategy: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5 specific, actionable marketing tactics or launch strategies for this book."
    },
    improvementTips: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "General actionable tips to improve the overall listing." 
    },
    improvedDescription: {
      type: Type.STRING,
      description: "A fully rewritten, optimized book description (blurb) that addresses the weaknesses, uses the keywords, and utilizes the marketing hooks. Return as plain text or Markdown."
    },
    amazonKdpHtml: {
      type: Type.STRING,
      description: "The improved description converted into valid Amazon KDP HTML. Use only allowed tags: <b>, <i>, <ul>, <li>, <ol>, <p>, <br>, <h1> through <h6>. Do NOT use markdown syntax here."
    }
  },
  required: [
    "title", "author", "authorBio", "summary", "sentimentScore", "sentimentBreakdown", 
    "targetAudience", "keywords", "strengths", "weaknesses", "weaknessFixes",
    "marketingHooks", "categoryPrediction", "pageCountEstimate",
    "titleSuggestions", "coverDesignIdeas", "recommendedPrice", 
    "pricingStrategyDescription", "marketingStrategy", "improvementTips",
    "improvedDescription", "amazonKdpHtml"
  ],
};

export const analyzeContent = async (text: string, fileDataUrl?: string): Promise<AnalysisResult> => {
  try {
    const parts: any[] = [];

    // Handle File (Image or PDF)
    if (fileDataUrl) {
      // Parse Data URL: data:[<mediatype>][;base64],<data>
      const matches = fileDataUrl.match(/^data:(.+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        });
        
        if (mimeType === 'application/pdf') {
             parts.push({
                text: "Analyze this PDF document (ebook content, manuscript, or marketing material). "
            });
        } else {
             parts.push({
                text: "Analyze this image of an Amazon book listing (or book cover/content). "
            });
        }
      } else {
          console.warn("Invalid file data URL format provided.");
      }
    }

    // Add text if present
    if (text) {
      parts.push({
        text: `Analyze the following text which describes an ebook (description, reviews, or content): \n\n${text}`
      });
    }

    if (parts.length === 0) {
      throw new Error("No content provided for analysis.");
    }

    parts.push({
      text: "Act as an expert Amazon KDP consultant. Provide a detailed analysis including sentiment, SEO keywords, audience targeting, critical feedback, estimated page count, improved title options, and cover design concepts. Recommend an optimal price point and a specific marketing strategy. Be specific with the weakness fixes. Crucially, provide a 'rewritten' description that fixes the weaknesses found. Generate an Amazon KDP HTML version of that description using only allowed tags (<b>, <i>, <h1>, etc.). Identify the author name and author biography if possible."
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI.");
    }

    return JSON.parse(responseText) as AnalysisResult;

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateCoverImage = async (prompt: string, title?: string, genre?: string, author?: string): Promise<string> => {
  try {
    const fullPrompt = `Create a professional, high-quality book cover for an ebook. 
    Title: ${title || 'Book Title'}
    Author Name: ${author || ''}
    Genre/Category: ${genre || 'General'}
    Design Concept: ${prompt}
    Ensure the Title and Author Name (if provided) are prominent and legible. The imagery should be striking and fit the genre.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      }
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated in the response.");
  } catch (error) {
    console.error("Cover generation failed:", error);
    throw error;
  }
};

export const generateSpecificFix = async (weakness: string, context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{
          text: `You are an expert Amazon KDP copywriter and editor.
          
          Context about the book: ${context}
          
          The specific weakness identified is: "${weakness}".
          
          TASK: WRITE THE ACTUAL FIX. 
          - Do NOT explain how to fix it. 
          - Do NOT give advice like "You should add a hook". 
          - Do NOT provide a bulleted list of tips.
          
          INSTEAD:
          - If the weakness is "Boring hook", OUTPUT the new, exciting hook.
          - If the weakness is "Passive voice", OUTPUT the rewritten active sentence.
          - If the weakness is "Lack of keywords", OUTPUT the paragraph rewritten to include keywords.
          - If the weakness is "Unclear cover", OUTPUT the specific text description of what the cover element should look like.
          
          Provide ONLY the fixed content, snippet, or rewrite. Keep it direct and ready to use.`
        }]
      }
    });
    
    return response.text || "Unable to generate a fix.";
  } catch (error) {
    console.error("Fix generation failed:", error);
    throw error;
  }
};

export const generateAuthorBio = async (authorName: string, summary: string, genre: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{
          text: `You are a professional book publicist. 
          
          Write a compelling, professional author biography for "${authorName}" (or "The Author" if name is unknown).
          
          Book Context:
          Genre: ${genre}
          Summary: ${summary}
          
          The bio should establish authority, build connection with the reader, and fit the tone of the book. 
          Keep it to 3-5 sentences.`
        }]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Bio generation failed:", error);
    return "";
  }
}

export const generateNewCoverConcepts = async (title: string, genre: string, summary: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{
          text: `You are a professional book cover designer.
          
          The book information is:
          Title: "${title}"
          Genre: ${genre}
          Summary: ${summary}
          
          Generate 3 DISTINCT, VISUAL cover design concepts that would work perfectly for this specific title and genre.
          Describe the imagery, color palette, typography style, and mood for each concept.
          
          Return ONLY a JSON object with a "concepts" array containing 3 strings.`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{"concepts": []}');
    return json.concepts || [];
  } catch (error) {
    console.error("Failed to generate new cover concepts:", error);
    return [];
  }
}

export const integrateFixesIntoDescription = async (
  currentDescription: string,
  fixes: Record<number, string>,
  weaknesses: string[]
): Promise<{ improvedDescription: string; amazonKdpHtml: string }> => {
  try {
    const fixesList = Object.entries(fixes).map(([index, fix]) => {
      const i = parseInt(index);
      return `Weakness: "${weaknesses[i]}" -> Proposed Fix/Content: "${fix}"`;
    }).join('\n');

    if (!fixesList) throw new Error("No fixes provided to integrate.");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{
          text: `You are an expert Amazon KDP copywriter.
          
          Current Description:
          "${currentDescription}"
          
          We have generated specific content fixes for identified weaknesses:
          ${fixesList}
          
          TASK: Rewrite the FULL book description to smoothly integrate these specific fixes. 
          - Replace weak sections with the new fixed content.
          - Ensure the tone is consistent and persuasive.
          - Keep the formatting professional.
          
          ALSO: Generate the Amazon KDP HTML version (using <b>, <i>, <h1>, <ul>, etc.).
          
          Return JSON: { "improvedDescription": string, "amazonKdpHtml": string }`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            improvedDescription: { type: Type.STRING },
            amazonKdpHtml: { type: Type.STRING }
          },
          required: ["improvedDescription", "amazonKdpHtml"]
        }
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Integration failed:", error);
    throw error;
  }
};

export const getTrendingTopics = async (specificCategory?: string): Promise<TrendingCategory[]> => {
  try {
    let promptText = '';

    if (specificCategory) {
        promptText = `Act as a professional market researcher and publishing consultant.
          The user is interested in the category: "${specificCategory}".
          
          Identify 4 distinct, high-demand sub-genres, angles, or specific niches within "${specificCategory}" that are currently trending on Amazon.
          
          For EACH of the 4 sub-niches, identify 6 specific, trending book topics.
          
          For each topic, provide:
          1. A short, catchy topic name.
          2. A description of what the book would be about.
          3. Why it is trending right now.
          4. The target audience.
          5. Interest Score (0-100): Approximate consumer curiosity/buzz level.
          6. Market Demand Score (0-100): Approximate sales potential/commercial intent.
          
          Return a JSON object containing an array of categories (where 'categoryName' is the sub-niche).`;
    } else {
        promptText = `Act as a professional market researcher and publishing consultant.
          Identify 4 distinct, high-demand book categories that are currently popular on Amazon (Kindle Best Sellers) and Google Trends.
          
          You MUST include:
          1. A specific trending FICTION category (e.g., Psychological Thriller, Romantasy, Sci-Fi).
          2. A specific trending NON-FICTION GUIDE or HOW-TO category (e.g., Wealth Building, AI Guides, Self-Help).
          3. Two other diverse trending categories (e.g. Children's, Biographies, Cookbooks).
          
          For EACH of the 4 categories, identify 6 specific, trending book topics or niches.
          
          For each topic, provide:
          1. A short, catchy topic name.
          2. A description of what the book would be about.
          3. Why it is trending right now.
          4. The target audience.
          5. Interest Score (0-100): Approximate consumer curiosity/buzz level.
          6. Market Demand Score (0-100): Approximate sales potential/commercial intent.
          
          Return a JSON object containing an array of categories.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{
          text: promptText
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                   categoryName: { type: Type.STRING },
                   topics: {
                     type: Type.ARRAY,
                     items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          topic: { type: Type.STRING },
                          description: { type: Type.STRING },
                          reason: { type: Type.STRING },
                          audience: { type: Type.STRING },
                          interestScore: { type: Type.NUMBER, description: "0-100 consumer buzz score" },
                          marketDemandScore: { type: Type.NUMBER, description: "0-100 sales potential score" }
                        },
                        required: ["id", "topic", "description", "reason", "audience", "interestScore", "marketDemandScore"]
                     }
                   }
                },
                required: ["categoryName", "topics"]
              }
            }
          }
        }
      }
    });
    
    const json = JSON.parse(response.text || '{"categories": []}');
    return json.categories || [];
  } catch (error) {
    console.error("Failed to fetch trending topics:", error);
    throw error;
  }
};

export const generateTitleFromTopic = async (topic: string, description: string): Promise<{title: string, subtitle: string}> => {
   try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [{
                text: `Generate a single, best-selling, catchy book title AND subtitle for a book about: ${topic}. 
                Context: ${description}.
                Return JSON: { "title": "Main Title", "subtitle": "The Catchy Subtitle" }`
            }]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING }
                },
                required: ["title", "subtitle"]
            }
        }
    });
    const json = JSON.parse(response.text || '{}');
    return { title: json.title || "Untitled", subtitle: json.subtitle || "" };
   } catch (error) {
       console.error("Title generation failed:", error);
       return { title: "Untitled Book", subtitle: "" };
   }
};

export const generatePersona = async (topic: string, genre: string): Promise<{ penName: string, bio: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{
                    text: `Create a highly suitable Pen Name (Pseudonym) and a professional Author Biography for a writer of a book about: "${topic}" in the genre "${genre}".
                    
                    The Pen Name should sound credible and marketable for this niche.
                    The Biography should be 3-4 sentences, establishing authority and appeal.
                    
                    Return JSON: { "penName": "Name", "bio": "Biography text..." }`
                }]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        penName: { type: Type.STRING },
                        bio: { type: Type.STRING }
                    },
                    required: ["penName", "bio"]
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        return { penName: json.penName || "Author Name", bio: json.bio || "" };
    } catch (error) {
        console.error("Persona generation failed:", error);
        return { penName: "Author Name", bio: "" };
    }
}