import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { User } from '../types';

interface VideoGeneratorProps {
  user: User | null;
}

interface VideoItem {
  id: string;
  title: string;
  duration: string;
  type: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  category: string;
  url?: string;
}

const MOCK_VIDEOS: VideoItem[] = [
  { id: 'v1', title: "Data Science Overview", duration: "12:30", type: "Lecture", level: 'Beginner', category: 'Data Science' },
  { id: 'v2', title: "Python Basics - Part 1", duration: "45:10", type: "Tutorial", level: 'Beginner', category: 'Python' },
  { id: 'v3', title: "Advanced Neural Networks", duration: "55:00", type: "Lecture", level: 'Advanced', category: 'AI' },
  { id: 'v4', title: "Power BI Tips & Tricks", duration: "20:15", type: "Tutorial", level: 'Intermediate', category: 'Business Intelligence' },
  { id: 'v5', title: "Student Success Stories", duration: "05:45", type: "Interview", level: 'All Levels', category: 'General' },
  { id: 'v6', title: "SQL Joins Explained", duration: "15:20", type: "Tutorial", level: 'Beginner', category: 'SQL' },
  { id: 'v7', title: "Deep Learning Architectures", duration: "1:10:00", type: "Lecture", level: 'Advanced', category: 'AI' },
  { id: 'v8', title: "Intro to Big Data", duration: "32:15", type: "Lecture", level: 'Beginner', category: 'Data Engineering' },
  { id: 'v9', title: "Machine Learning Ops (MLOps)", duration: "40:00", type: "Webinar", level: 'Advanced', category: 'Data Engineering' },
];

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ user }) => {
  const [videos, setVideos] = useState<VideoItem[]>(MOCK_VIDEOS);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Filter State
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({
      title: '',
      duration: '',
      type: 'Lecture',
      level: 'Beginner',
      category: 'General'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (!file.type.startsWith('video/')) {
            setError("Please upload a valid video file.");
            return;
        }
        setUploadFile(file);
        // Auto-fill title if empty
        if (!uploadMeta.title) {
            setUploadMeta(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
        }
        setError(null);
    }
  };

  const handleUploadToLibrary = () => {
      if (!uploadFile) {
          setError("Please select a video file.");
          return;
      }
      if (!uploadMeta.title) {
          setError("Please provide a title.");
          return;
      }

      const url = URL.createObjectURL(uploadFile);
      const newVideo: VideoItem = {
          id: `local_${Date.now()}`,
          title: uploadMeta.title,
          duration: uploadMeta.duration || "Unknown",
          type: uploadMeta.type,
          level: uploadMeta.level as any,
          category: uploadMeta.category,
          url: url
      };

      setVideos([newVideo, ...videos]);
      
      // Reset Form
      setUploadFile(null);
      setUploadMeta({
          title: '',
          duration: '',
          type: 'Lecture',
          level: 'Beginner',
          category: 'General'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Auto play the new video
      setVideoUrl(url);
      setVideoName(newVideo.title);
  };
  
  const handleSelectVideo = (video: VideoItem) => {
      setVideoName(video.title);
      if (video.url) {
          setVideoUrl(video.url);
      } else {
          setVideoUrl(null); // Reset URL as we don't have one for mock videos
      }
  };

  const filteredVideos = videos.filter(video => {
      const matchLevel = selectedLevel === 'All' || video.level === selectedLevel;
      const matchCategory = selectedCategory === 'All' || video.category === selectedCategory;
      return matchLevel && matchCategory;
  });

  const categories = ['All', ...Array.from(new Set(videos.map(v => v.category)))];
  const levels = ['All', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
       <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Course Video Gallery</h1>
            <p className="mt-4 text-xl text-gray-500">Access exclusive video content and training materials.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Player Section */}
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center relative aspect-video border border-gray-800">
                  {videoUrl ? (
                      <video 
                          controls 
                          autoPlay 
                          className="w-full h-full object-contain"
                          src={videoUrl}
                      />
                  ) : (
                      <div className="text-center p-8 flex flex-col items-center">
                          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-600">
                               <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                          </div>
                          <h3 className="text-white text-lg font-medium">{videoName ? `Playing: ${videoName}` : "No Video Selected"}</h3>
                          <p className="text-gray-400 mt-2 text-sm max-w-sm">
                             {videoName && !videoUrl ? "This is a demo video entry. In a full version, this would stream the content." : 
                             isAdmin 
                                ? "Use the upload panel to add a video from your local disk." 
                                : "Check back later for new course recordings and updates."}
                          </p>
                      </div>
                  )}
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">{videoName || 'Course Introduction'}</h2>
                  <p className="text-gray-500 mt-2">
                      {videoUrl 
                        ? "Local video loaded." 
                        : videoName ? "Demo content selected." : "Select a video to start playback."}
                  </p>
              </div>
          </div>

          {/* Sidebar / Upload Section */}
          <div className="space-y-6">
              {isAdmin && (
                  <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 shadow-sm">
                      <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Add New Video
                      </h3>
                      <div className="space-y-3">
                          <input 
                              type="text"
                              placeholder="Video Title"
                              value={uploadMeta.title}
                              onChange={(e) => setUploadMeta({...uploadMeta, title: e.target.value})}
                              className="w-full text-sm rounded-md border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          
                          <div className="grid grid-cols-2 gap-2">
                              <select 
                                  value={uploadMeta.level}
                                  onChange={(e) => setUploadMeta({...uploadMeta, level: e.target.value})}
                                  className="text-sm rounded-md border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                  <option value="Beginner">Beginner</option>
                                  <option value="Intermediate">Intermediate</option>
                                  <option value="Advanced">Advanced</option>
                                  <option value="All Levels">All Levels</option>
                              </select>
                              <input 
                                  type="text"
                                  placeholder="Category"
                                  value={uploadMeta.category}
                                  onChange={(e) => setUploadMeta({...uploadMeta, category: e.target.value})}
                                  className="w-full text-sm rounded-md border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                               <input 
                                  type="text"
                                  placeholder="Type (e.g. Lecture)"
                                  value={uploadMeta.type}
                                  onChange={(e) => setUploadMeta({...uploadMeta, type: e.target.value})}
                                  className="w-full text-sm rounded-md border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                               <input 
                                  type="text"
                                  placeholder="Duration (e.g. 10:00)"
                                  value={uploadMeta.duration}
                                  onChange={(e) => setUploadMeta({...uploadMeta, duration: e.target.value})}
                                  className="w-full text-sm rounded-md border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                          </div>
                          
                          <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden"
                                accept="video/*"
                                onChange={handleFileSelect}
                            />
                            
                          <div className="flex gap-2">
                            <Button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 text-xs"
                                    variant="outline"
                            >
                                    {uploadFile ? 'Change File' : 'Select File'}
                            </Button>
                            <Button 
                                    onClick={handleUploadToLibrary}
                                    className="flex-1 text-xs"
                                    disabled={!uploadFile}
                            >
                                    Add to Library
                            </Button>
                          </div>
                          
                          {uploadFile && <p className="text-xs text-gray-500 truncate">Selected: {uploadFile.name}</p>}

                          {error && (
                              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                  {error}
                              </p>
                          )}
                      </div>
                  </div>
              )}

              {/* Video Library with Filtering */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                      <h3 className="font-bold text-gray-900">Video Library</h3>
                  </div>

                  {/* Filter Controls */}
                  <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Level</label>
                            <div className="flex flex-wrap gap-2">
                                {levels.map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`px-2 py-1 text-xs rounded-full transition-all ${
                                            selectedLevel === level 
                                            ? 'bg-indigo-600 text-white shadow-sm' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Subject</label>
                            <select 
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <ul className="divide-y divide-gray-100">
                        {filteredVideos.map((item) => (
                            <li 
                                key={item.id} 
                                onClick={() => handleSelectVideo(item)}
                                className={`px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer ${videoName === item.title ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${videoName === item.title ? 'text-indigo-700' : 'text-gray-900 group-hover:text-indigo-600'}`}>
                                        {item.title}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                         <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.duration}</span>
                                         <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{item.level}</span>
                                         <span className="text-xs text-gray-500">{item.type}</span>
                                    </div>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    {videoName === item.title ? (
                                        <div className="flex items-end gap-0.5 h-4 w-4 pb-1">
                                            <div className="w-1 bg-indigo-600 animate-[bounce_1s_infinite] h-2"></div>
                                            <div className="w-1 bg-indigo-600 animate-[bounce_1.2s_infinite] h-4"></div>
                                            <div className="w-1 bg-indigo-600 animate-[bounce_0.8s_infinite] h-3"></div>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                        {filteredVideos.length === 0 && (
                            <li className="p-8 text-center text-gray-500 flex flex-col items-center">
                                <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                <p className="text-sm">No videos found matching these filters.</p>
                                <button 
                                    onClick={() => { setSelectedLevel('All'); setSelectedCategory('All'); }}
                                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    Clear Filters
                                </button>
                            </li>
                        )}
                    </ul>
                  </div>
                  {!isAdmin && (
                      <div className="p-4 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-200">
                          Log in as Admin to upload custom videos.
                      </div>
                  )}
              </div>
          </div>
       </div>
    </div>
  );
};