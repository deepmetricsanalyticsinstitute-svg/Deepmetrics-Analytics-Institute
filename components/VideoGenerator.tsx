import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Button } from './Button';

// Helper to access window.aistudio safely without conflicting with global types
const getAIStudio = () => {
  return (window as any).aistudio as {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    } | undefined;
};

export const VideoGenerator: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('Cinematic');

  // Check for API key on mount
  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    const aistudio = getAIStudio();
    if (aistudio && await aistudio.hasSelectedApiKey()) {
      setHasKey(true);
    }
  };

  const handleSelectKey = async () => {
    const aistudio = getAIStudio();
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        // Assume success to mitigate race condition as per instructions
        setHasKey(true);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    } else {
        setError("AI Studio environment not detected.");
    }
  };

  const presets = [
    "A futuristic visualization of a neural network processing data",
    "A glowing bar chart growing in a cyberpunk city environment",
    "A teacher explaining statistics in a modern classroom, 3D animation",
    "Abstract data streams flowing into a central database hub",
    "A professional marketing intro for a Data Science course"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessage("Initializing creative studio...");

    try {
      // Initialize Gemini with the selected key (injected into process.env.API_KEY)
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const fullPrompt = `${prompt}. Style: ${selectedStyle}. High quality, 1080p, relevant for Data Analytics education.`;
      
      setLoadingMessage("Drafting video storyboard...");

      // Start generation
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: fullPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      setLoadingMessage("Rendering video frames... This may take a minute.");

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
        operation = await ai.operations.getVideosOperation({ operation: operation });
        setLoadingMessage(prev => {
            if (prev === "Rendering video frames... This may take a minute.") return "Polishing final pixels...";
            return prev;
        });
      }

      if (operation.error) {
          throw new Error(operation.error.message || "Video generation failed");
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
          // Fetch the video blob with the key appended
          const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
          if (!response.ok) throw new Error("Failed to download generated video");
          
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
      } else {
          throw new Error("No video URI returned");
      }

    } catch (err: any) {
      console.error("Generation Error:", err);
      if (err.message && err.message.includes("Requested entity was not found")) {
          setHasKey(false);
          setError("Session expired. Please select your API key again.");
      } else {
          setError(err.message || "An unexpected error occurred while generating the video.");
      }
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  if (!hasKey) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-12 border border-gray-100">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Deepmetrics AI Video Studio</h2>
          <p className="text-gray-600 max-w-lg mx-auto mb-8 text-lg">
            Create stunning educational videos and marketing snippets for your training programs using Google's advanced Veo model.
          </p>
          <div className="flex flex-col items-center gap-4">
             <Button size="lg" onClick={handleSelectKey} className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                Access Video Studio
             </Button>
             <p className="text-sm text-gray-400 mt-4">
               Requires a paid Google Cloud API key. <br/>
               <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">View Billing Documentation</a>
             </p>
          </div>
          {error && <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg max-w-md mx-auto">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
       <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">AI Video Studio</h1>
            <p className="mt-4 text-xl text-gray-500">Generate explanatory videos and course trailers with Veo.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Input Section */}
          <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Describe your video
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Visual Style</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['Cinematic', '3D Animation', 'Realistic'].map(style => (
                                  <button
                                      key={style}
                                      onClick={() => setSelectedStyle(style)}
                                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                                          selectedStyle === style 
                                            ? 'bg-indigo-600 text-white border-indigo-600' 
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                      }`}
                                  >
                                      {style}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                          <textarea
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              rows={5}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-gray-900 placeholder-gray-400"
                              placeholder="Describe the scene, subject, lighting, and camera movement..."
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Quick Presets</label>
                          <div className="flex flex-wrap gap-2">
                              {presets.map((p, idx) => (
                                  <button
                                      key={idx}
                                      onClick={() => setPrompt(p)}
                                      className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                                  >
                                      {p.length > 50 ? p.substring(0, 50) + '...' : p}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                      <Button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !prompt.trim()} 
                        className="w-full h-12 text-lg shadow-md"
                        isLoading={isGenerating}
                      >
                          {isGenerating ? 'Generating Video...' : 'Generate Video'}
                      </Button>
                      {isGenerating && (
                          <div className="mt-3 text-center">
                              <p className="text-sm text-indigo-600 font-medium animate-pulse">{loadingMessage}</p>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                  <div className="bg-indigo-600 h-1.5 rounded-full animate-progress"></div>
                              </div>
                              <style>{`
                                @keyframes progress {
                                  0% { width: 5%; transform: translateX(-100%); }
                                  50% { width: 70%; }
                                  100% { width: 100%; transform: translateX(100%); }
                                }
                                .animate-progress {
                                  animation: progress 2s infinite ease-in-out;
                                }
                              `}</style>
                          </div>
                      )}
                      {error && (
                          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                              {error}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* Output Section */}
          <div className="flex flex-col h-full">
              <div className={`flex-1 bg-gray-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center relative min-h-[400px] border border-gray-800 ${isGenerating ? 'opacity-90' : ''}`}>
                  {videoUrl ? (
                      <video 
                          controls 
                          autoPlay 
                          loop 
                          className="w-full h-full object-contain"
                          src={videoUrl}
                      />
                  ) : (
                      <div className="text-center p-8">
                          {isGenerating ? (
                              <div className="flex flex-col items-center">
                                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                  <p className="text-indigo-200">AI is dreaming...</p>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center text-gray-500">
                                  <svg className="w-20 h-20 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                  <p className="text-lg font-medium">No video generated yet</p>
                                  <p className="text-sm mt-2 opacity-60">Enter a prompt and click generate to see magic.</p>
                              </div>
                          )}
                      </div>
                  )}
              </div>
              
              {videoUrl && (
                  <div className="mt-4 flex justify-end">
                      <a 
                          href={videoUrl} 
                          download={`deepmetrics-video-${Date.now()}.mp4`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download Video
                      </a>
                  </div>
              )}
          </div>
       </div>
    </div>
  );
};