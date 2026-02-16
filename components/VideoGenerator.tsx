import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { User } from '../types';

interface VideoGeneratorProps {
  user: User | null;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ user }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('video/')) {
            setError("Please upload a valid video file.");
            return;
        }

        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        setVideoName(file.name);
        setError(null);
    }
  };

  const handleRemoveVideo = () => {
      setVideoUrl(null);
      setVideoName('');
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

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
                          <h3 className="text-white text-lg font-medium">No Video Selected</h3>
                          <p className="text-gray-400 mt-2 text-sm max-w-sm">
                             {isAdmin 
                                ? "Use the upload panel to preview a video from your local disk." 
                                : "Check back later for new course recordings and updates."}
                          </p>
                      </div>
                  )}
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">{videoName || 'Course Introduction'}</h2>
                  <p className="text-gray-500 mt-2">
                      {videoUrl 
                        ? "Local preview mode. This video is loaded from your device." 
                        : "Select a video to start playback."}
                  </p>
              </div>
          </div>

          {/* Sidebar / Upload Section */}
          <div className="space-y-6">
              {isAdmin && (
                  <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 shadow-sm">
                      <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          Admin Upload
                      </h3>
                      <div className="space-y-4">
                          <p className="text-sm text-indigo-700">
                              Upload a video file from your local disk to display in the player.
                          </p>
                          
                          <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden"
                                accept="video/*"
                                onChange={handleFileUpload}
                            />
                            
                          <Button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full shadow-md"
                          >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Select Video File
                          </Button>

                          {videoUrl && (
                              <Button 
                                variant="danger" 
                                onClick={handleRemoveVideo}
                                className="w-full"
                              >
                                  Clear Player
                              </Button>
                          )}
                          
                          {error && (
                              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                  {error}
                              </p>
                          )}
                      </div>
                  </div>
              )}

              {/* Mock Playlist for Visual Completeness */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                      <h3 className="font-bold text-gray-900">Featured Content</h3>
                  </div>
                  <ul className="divide-y divide-gray-100">
                      {[
                          { title: "Data Science Overview", duration: "12:30", type: "Lecture" },
                          { title: "Python Basics - Part 1", duration: "45:10", type: "Tutorial" },
                          { title: "Student Success Stories", duration: "05:45", type: "Interview" }
                      ].map((item, idx) => (
                          <li key={idx} className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-default">
                              <div>
                                  <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{item.title}</p>
                                  <span className="text-xs text-gray-500">{item.type} • {item.duration}</span>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                              </div>
                          </li>
                      ))}
                  </ul>
                  {!isAdmin && (
                      <div className="p-4 bg-gray-50 text-center text-xs text-gray-500">
                          Log in as Admin to manage videos.
                      </div>
                  )}
              </div>
          </div>
       </div>
    </div>
  );
};