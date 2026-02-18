import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { User } from '../types';
import { supabase, uploadToStorage, getSignedUrl } from '../supabaseClient';

interface VideoGeneratorProps {
  user: User | null;
}

interface VideoItem {
  id: string;
  title: string;
  duration: string;
  type: string;
  level: string;
  category: string;
  url?: string;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ user }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Filter State
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMeta, setUploadMeta] = useState({
      title: '',
      duration: '',
      type: 'Lecture',
      level: 'Beginner',
      category: 'General'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
      const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (data) {
          const processed = await Promise.all(data.map(async (v) => {
             const url = v.url ? await getSignedUrl(v.url) : undefined;
             return { ...v, url };
          }));
          setVideos(processed);
      }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (!file.type.startsWith('video/')) {
            setError("Please upload a valid video file.");
            return;
        }
        setUploadFile(file);
        if (!uploadMeta.title) {
            setUploadMeta(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
        }
        setError(null);
    }
  };

  const handleUploadToLibrary = async () => {
      if (!uploadFile) {
          setError("Please select a video file.");
          return;
      }
      if (!uploadMeta.title) {
          setError("Please provide a title.");
          return;
      }

      setIsUploading(true);
      try {
          // 1. Upload
          const path = await uploadToStorage(uploadFile, 'videos', 'library');
          
          // 2. Insert DB
          const { error: dbError } = await supabase.from('videos').insert({
              title: uploadMeta.title,
              duration: uploadMeta.duration || "Unknown",
              type: uploadMeta.type,
              level: uploadMeta.level,
              category: uploadMeta.category,
              url: path
          });
          
          if (dbError) throw dbError;

          // 3. Refresh
          await fetchVideos();
          
          setUploadFile(null);
          setUploadMeta({ title: '', duration: '', type: 'Lecture', level: 'Beginner', category: 'General' });
          if (fileInputRef.current) fileInputRef.current.value = '';
          
      } catch (err: any) {
          console.error(err);
          setError("Failed to upload video.");
      } finally {
          setIsUploading(false);
      }
  };
  
  const handleSelectVideo = (video: VideoItem) => {
      setVideoName(video.title);
      setVideoUrl(video.url || null);
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
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center relative aspect-video border border-gray-800">
                  {videoUrl ? (
                      <video controls autoPlay className="w-full h-full object-contain" src={videoUrl} />
                  ) : (
                      <div className="text-center p-8 flex flex-col items-center">
                          <h3 className="text-white text-lg font-medium">{videoName ? `Playing: ${videoName}` : "No Video Selected"}</h3>
                          <p className="text-gray-400 mt-2 text-sm max-w-sm">Select a video from the library to start watching.</p>
                      </div>
                  )}
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">{videoName || 'Course Introduction'}</h2>
              </div>
          </div>

          <div className="space-y-6">
              {isAdmin && (
                  <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 shadow-sm">
                      <h3 className="text-lg font-bold text-indigo-900 mb-4">Add New Video</h3>
                      <div className="space-y-3">
                          <input type="text" placeholder="Video Title" value={uploadMeta.title} onChange={(e) => setUploadMeta({...uploadMeta, title: e.target.value})} className="w-full text-sm rounded-md border-indigo-200" />
                          <div className="grid grid-cols-2 gap-2">
                              <select value={uploadMeta.level} onChange={(e) => setUploadMeta({...uploadMeta, level: e.target.value})} className="text-sm rounded-md border-indigo-200">
                                  <option value="Beginner">Beginner</option>
                                  <option value="Intermediate">Intermediate</option>
                                  <option value="Advanced">Advanced</option>
                                  <option value="All Levels">All Levels</option>
                              </select>
                              <input type="text" placeholder="Category" value={uploadMeta.category} onChange={(e) => setUploadMeta({...uploadMeta, category: e.target.value})} className="w-full text-sm rounded-md border-indigo-200" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                               <input type="text" placeholder="Type" value={uploadMeta.type} onChange={(e) => setUploadMeta({...uploadMeta, type: e.target.value})} className="w-full text-sm rounded-md border-indigo-200" />
                               <input type="text" placeholder="Duration" value={uploadMeta.duration} onChange={(e) => setUploadMeta({...uploadMeta, duration: e.target.value})} className="w-full text-sm rounded-md border-indigo-200" />
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileSelect} />
                          <div className="flex gap-2">
                            <Button onClick={() => fileInputRef.current?.click()} className="flex-1 text-xs" variant="outline">{uploadFile ? 'Change' : 'Select File'}</Button>
                            <Button onClick={handleUploadToLibrary} className="flex-1 text-xs" disabled={!uploadFile || isUploading}>{isUploading ? 'Uploading...' : 'Add to Library'}</Button>
                          </div>
                          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>}
                      </div>
                  </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-900">Video Library</h3></div>
                  <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full text-sm border-gray-300 rounded-lg bg-gray-50">
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <ul className="divide-y divide-gray-100">
                        {filteredVideos.map((item) => (
                            <li key={item.id} onClick={() => handleSelectVideo(item)} className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${videoName === item.title ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-gray-900">{item.title}</p>
                                    <div className="flex gap-2 mt-1"><span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.duration}</span><span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.level}</span></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};