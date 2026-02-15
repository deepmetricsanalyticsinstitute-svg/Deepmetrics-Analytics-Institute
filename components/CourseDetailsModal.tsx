import React from 'react';
import { Course } from '../types';
import { Button } from './Button';

interface CourseDetailsModalProps {
  course: Course;
  onClose: () => void;
  onRegister?: () => void;
  isRegistered: boolean;
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({ course, onClose, onRegister, isRegistered }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header Image Area */}
        <div className="relative h-48 sm:h-64 flex-shrink-0">
          <img 
            src={course.image} 
            alt={course.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="absolute bottom-6 left-6 right-6 text-white">
             <div className="flex flex-wrap items-center gap-3 mb-2">
                 <span className="px-3 py-1 bg-indigo-600 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">{course.level}</span>
                 {course.tags.map(tag => (
                     <span key={tag} className="px-2 py-1 bg-white/20 rounded-md text-xs backdrop-blur-sm">{tag}</span>
                 ))}
             </div>
             <h2 className="text-3xl font-bold leading-tight shadow-sm">{course.title}</h2>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gray-50">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               
               {/* Main Info */}
               <div className="lg:col-span-2 space-y-8">
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                       <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                           <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           About this Program
                       </h3>
                       <div 
                           className="prose prose-indigo prose-sm sm:prose-base text-gray-600 max-w-none"
                           dangerouslySetInnerHTML={{ __html: course.description }}
                       />
                   </div>

                   {course.outline && (
                       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                           <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                               <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                               Program Outline
                           </h3>
                           <div 
                               className="prose prose-indigo prose-sm sm:prose-base text-gray-600 max-w-none [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                               dangerouslySetInnerHTML={{ __html: course.outline }}
                           />
                       </div>
                   )}

                   {course.instructorBio && (
                       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                           <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                               <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                               About the Instructor
                           </h3>
                           <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 mb-2 text-lg">{course.instructor}</p>
                                    <div 
                                        className="prose prose-indigo prose-sm sm:prose-base text-gray-600 max-w-none"
                                        dangerouslySetInnerHTML={{ __html: course.instructorBio }}
                                    />
                                </div>
                           </div>
                       </div>
                   )}
               </div>

               {/* Sidebar Info */}
               <div className="space-y-6">
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                       <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Program Details</h4>
                       <dl className="space-y-4">
                           <div className="flex items-center justify-between">
                               <dt className="text-gray-500 text-sm">Instructor</dt>
                               <dd className="font-medium text-gray-900 text-sm text-right">{course.instructor}</dd>
                           </div>
                           <div className="flex items-center justify-between">
                               <dt className="text-gray-500 text-sm">Duration</dt>
                               <dd className="font-medium text-gray-900 text-sm text-right">{course.duration}</dd>
                           </div>
                           <div className="flex items-center justify-between">
                               <dt className="text-gray-500 text-sm">Price</dt>
                               <dd className="font-bold text-indigo-600 text-lg text-right">GHC {course.price}</dd>
                           </div>
                       </dl>
                       
                       <div className="mt-6 pt-6 border-t border-gray-100">
                           {isRegistered ? (
                               <div className="w-full py-2 bg-green-50 text-green-700 text-center rounded-lg border border-green-200 font-medium text-sm flex items-center justify-center gap-2">
                                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                   Registered
                               </div>
                           ) : onRegister ? (
                               <Button onClick={onRegister} className="w-full justify-center shadow-lg shadow-indigo-200">
                                   Register Now
                               </Button>
                           ) : (
                               <div className="w-full py-2 bg-gray-100 text-gray-500 text-center rounded-lg text-sm">
                                   Read Only
                               </div>
                           )}
                       </div>
                   </div>

                   <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-6 rounded-xl shadow-lg text-white">
                        <h4 className="font-bold text-lg mb-2">Need Help?</h4>
                        <p className="text-indigo-200 text-sm mb-4">Ask our AI Advisor for guidance on whether this course is right for you.</p>
                   </div>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};