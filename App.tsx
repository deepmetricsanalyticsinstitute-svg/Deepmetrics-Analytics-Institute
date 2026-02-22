import React, { useState, useEffect } from 'react';
import { View, User, Course, CourseLevel } from './types';
import { Navbar } from './components/Navbar';
import { CourseCard } from './components/CourseCard';
import { Auth } from './components/Auth';
import { AIChat } from './components/AIChat';
import { Button } from './components/Button';
import { Certificate } from './components/Certificate';
import { CourseEditor } from './components/CourseEditor';
import { CourseDetailsModal } from './components/CourseDetailsModal';
import { VideoGenerator } from './components/VideoGenerator';
import { NotificationContainer, Notification } from './components/NotificationContainer';
import { supabase, getSignedUrl, uploadToStorage } from './supabaseClient';

// Home Content Configuration
interface Feature {
    title: string;
    description: string;
}

interface HomeContent {
    heroTitle: string;
    heroSubtitle: string;
    features: Feature[];
}

const DEFAULT_HOME_CONTENT: HomeContent = {
    heroTitle: "Master the Data Future",
    heroSubtitle: "Deepmetrics Analytics Institute provides world-class education in Data Science, AI, and Business Intelligence. Transform your career today.",
    features: [
        {
            title: "AI-Driven Learning",
            description: "Personalized curriculum recommendations powered by advanced AI to match your career path."
        },
        {
            title: "Expert Instructors",
            description: "Learn from industry veterans from top tech companies and research institutions."
        },
        {
            title: "Hands-on Projects",
            description: "Build a portfolio with real-world datasets and capstone projects to showcase to employers."
        }
    ]
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCertificateCourseId, setSelectedCertificateCourseId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Home Page Customization State
  const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2850&q=80';
  const [homeHeroImage, setHomeHeroImage] = useState<string>(DEFAULT_HERO_IMAGE);
  const [homeHeroPath, setHomeHeroPath] = useState<string | null>(null);
  
  // Text Content State
  const [homeContent, setHomeContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [isEditingHome, setIsEditingHome] = useState(false);
  const [tempHomeContent, setTempHomeContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);

  // Modal State
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);

  // --- Data Fetching Functions ---

  const fetchCourses = async () => {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) {
          console.error('Error fetching courses:', error);
          addNotification('Failed to load training programs from database.', 'info');
      } else if (data) {
          // Process courses to sign URLs
          const processedCourses = await Promise.all(data.map(async (c: any) => {
              const signatureUrl = c.signature_image ? await getSignedUrl(c.signature_image) : undefined;
              
              // Handle Course Image (URL vs Path)
              let imageUrl = c.image;
              let imagePath = undefined;
              if (c.image && !c.image.startsWith('http')) {
                  imagePath = c.image;
                  imageUrl = await getSignedUrl(c.image);
              }

              return {
                  ...c,
                  instructorBio: c.instructor_bio,
                  image: imageUrl || c.image,
                  imagePath: imagePath,
                  signatureImage: signatureUrl,
                  signaturePath: c.signature_image
              };
          }));
          setCourses(processedCourses);
      }
  };

  const fetchHomeContent = async () => {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'home_content').single();
      if (data && data.value) {
          const content = data.value;
          setHomeContent({
              heroTitle: content.heroTitle,
              heroSubtitle: content.heroSubtitle,
              features: content.features
          });
          if (content.heroImage) {
              setHomeHeroPath(content.heroImage);
              const url = await getSignedUrl(content.heroImage);
              if (url) setHomeHeroImage(url);
          }
      }
  };

  const fetchUserData = async (userId: string, sessionUser?: any) => {
      // 1. Fetch Profile
      // Use maybeSingle() instead of single() to avoid errors if row is missing
      const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
      
      let name = 'Student';
      let email = '';
      let role: 'student' | 'admin' = 'student';

      // Robust fallback strategy if profile is missing
      if (profile) {
          name = profile.name;
          email = profile.email;
          role = profile.role as 'student' | 'admin';
      } else {
          // Fallback to session data
          const user = sessionUser || (await supabase.auth.getUser()).data.user;
          if (user && user.id === userId) {
              name = user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
              email = user.email || '';
              if (email.toLowerCase() === 'deepmetricsanalyticsinstitute@gmail.com') {
                  role = 'admin';
              }
          } else {
              // No user data available
              return null;
          }
      }

      // 2. Fetch Enrollments
      const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', userId);

      if (enrollError) console.error('Error fetching enrollments:', enrollError);

      // 3. Construct User Object
      const registered = enrollments?.map(e => e.course_id) || [];
      const pending = enrollments?.filter(e => e.status === 'pending').map(e => e.course_id) || [];
      const completed = enrollments?.filter(e => e.status === 'completed').map(e => e.course_id) || [];
      const progressMap: {[key: string]: number} = {};
      enrollments?.forEach(e => {
          progressMap[e.course_id] = e.progress || 0;
      });

      const userObj: User = {
          id: userId,
          name: name,
          email: email,
          role: role,
          registeredCourseIds: registered,
          pendingCourseIds: pending,
          completedCourseIds: completed,
          courseProgress: progressMap
      };

      return userObj;
  };

  const fetchAllUsersForAdmin = async () => {
      if (user?.role !== 'admin') return;

      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*');
      if (profilesError) return;

      const { data: enrollments, error: enrollError } = await supabase.from('enrollments').select('*');
      
      const constructedUsers: User[] = profiles.map(p => {
          const userEnrollments = enrollments?.filter(e => e.user_id === p.id) || [];
          const progressMap: {[key: string]: number} = {};
          userEnrollments.forEach(e => { progressMap[e.course_id] = e.progress || 0; });
          
          return {
              id: p.id,
              name: p.name,
              email: p.email,
              role: p.role as 'student' | 'admin',
              registeredCourseIds: userEnrollments.map(e => e.course_id),
              pendingCourseIds: userEnrollments.filter(e => e.status === 'pending').map(e => e.course_id),
              completedCourseIds: userEnrollments.filter(e => e.status === 'completed').map(e => e.course_id),
              courseProgress: progressMap
          };
      });

      setAllUsers(constructedUsers);
  };

  // --- Initial Load ---

  useEffect(() => {
    // Check session first to ensure we can fetch protected files (like signatures)
    const initData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Fetch public/protected content
        await fetchCourses();
        await fetchHomeContent();

        if (session) {
            const userData = await fetchUserData(session.user.id, session.user);
            if (userData) {
                setUser(userData);
            }
        }
    };
    
    initData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
             const userData = await fetchUserData(session.user.id, session.user);
             setUser(userData);
             // Re-fetch courses/home to ensure signed URLs are valid for this user context
             fetchCourses();
             fetchHomeContent();
        } else {
             setUser(null);
             setAllUsers([]);
             setCurrentView(View.HOME);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Admin Data Fetcher
  useEffect(() => {
      if (user?.role === 'admin') {
          fetchAllUsersForAdmin();
      }
  }, [user?.role, user?.id]);

  // Protect private routes
  useEffect(() => {
    const protectedViews = [View.DASHBOARD, View.CERTIFICATE, View.EDIT_COURSE, View.CREATE_COURSE];
    if (protectedViews.includes(currentView)) {
         supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setCurrentView(View.LOGIN);
                addNotification("Please log in to access this page.", "info");
            }
         });
    }
  }, [currentView]);

  // Notification System
  const addNotification = (message: string, type: 'success' | 'info' | 'email' = 'info') => {
      const id = Date.now();
      setNotifications(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
      }, 6000);
  };

  const removeNotification = (id: number) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const sendEmailSimulation = (to: string, subject: string, body: string) => {
      console.log(`%c[EMAIL SIMULATION]\nTo: ${to}\nSubject: ${subject}\nBody: ${body}`, 'color: #4f46e5; font-weight: bold; padding: 4px;');
      addNotification(`Email sent to ${to}: ${subject}`, 'email');
  };

  const handleAuthSuccess = async (name: string, email: string, isAdmin: boolean) => {
      setCurrentView(View.HOME); // Redirect to Home as per requirement
      addNotification(`Welcome, ${name}!`, 'success');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    addNotification('You have successfully logged out.', 'info');
  };

  const handleRegisterCourse = async (courseId: string) => {
    if (!user) {
      setCurrentView(View.LOGIN);
      return;
    }

    if (user.registeredCourseIds.includes(courseId)) {
        addNotification("You are already registered for this training program.", "info");
        return;
    }

    const course = courses.find(c => c.id === courseId);
    
    // Supabase Insert
    const { error } = await supabase.from('enrollments').insert({
        user_id: user.id,
        course_id: courseId,
        status: 'registered',
        progress: 0
    });

    if (error) {
        addNotification("Failed to register. Please try again.", 'info');
        console.error(error);
        return;
    }

    const updatedUser = await fetchUserData(user.id);
    if(updatedUser) setUser(updatedUser);
    
    addNotification(`Successfully registered for ${course?.title || 'training program'}!`, 'success');
    
    if (course) {
        sendEmailSimulation(
            user.email, 
            "Training Registration Confirmation", 
            `Dear ${user.name},\n\nYou have successfully registered for ${course.title}. We are excited to have you on board!\n\nBest,\nDeepmetrics Team`
        );
    }
  };

  const handleProgressChange = async (courseId: string, progress: number) => {
    if (!user) return;

    setUser(prev => prev ? ({
        ...prev,
        courseProgress: { ...prev.courseProgress, [courseId]: progress }
    }) : null);

    const { error } = await supabase
        .from('enrollments')
        .update({ progress })
        .match({ user_id: user.id, course_id: courseId });
    
    if (error) {
        console.error("Failed to save progress", error);
    }
  };

  const handleRequestCompletion = async (courseId: string) => {
    if (!user) return;
    
    if (user.completedCourseIds?.includes(courseId)) {
        addNotification('You have already completed this training program.', 'info');
        return;
    }
    
    const { error } = await supabase
        .from('enrollments')
        .update({ status: 'pending' })
        .match({ user_id: user.id, course_id: courseId });

    if (error) {
        addNotification('Failed to submit request.', 'info');
        return;
    }

    const updatedUser = await fetchUserData(user.id);
    if(updatedUser) setUser(updatedUser);
    
    const course = courses.find(c => c.id === courseId);
    addNotification(`Completion request sent for ${course?.title}`, 'info');
  };

  const handleApproveCompletion = async (targetUserId: string, courseId: string) => {
      const { error } = await supabase
          .from('enrollments')
          .update({ status: 'completed', progress: 100 })
          .match({ user_id: targetUserId, course_id: courseId });

      if (error) {
          addNotification('Failed to approve.', 'info');
          return;
      }

      fetchAllUsersForAdmin();

      if (user && user.id === targetUserId) {
          const updatedUser = await fetchUserData(user.id);
          if (updatedUser) setUser(updatedUser);
      }

      const targetUser = allUsers.find(u => u.id === targetUserId);
      const course = courses.find(c => c.id === courseId);
      
      addNotification(`Approved completion for ${targetUser?.name}.`, 'success');
      
      if (targetUser && course) {
          sendEmailSimulation(
              targetUser.email,
              `🎉 Congratulations! You have completed ${course.title}`,
              `Dear ${targetUser.name},\n\nWe are thrilled to congratulate you on successfully completing the training program "${course.title}".\n\nWarm regards,\nThe Deepmetrics Team`
          );
      }
  };

  const handleRejectCompletion = async (targetUserId: string, courseId: string) => {
      const { error } = await supabase
          .from('enrollments')
          .update({ status: 'registered' })
          .match({ user_id: targetUserId, course_id: courseId });

      if (error) {
          addNotification('Failed to reject.', 'info');
          return;
      }

      fetchAllUsersForAdmin();

      if (user && user.id === targetUserId) {
          const updatedUser = await fetchUserData(user.id);
          if (updatedUser) setUser(updatedUser);
      }

      const targetUser = allUsers.find(u => u.id === targetUserId);
      addNotification(`Rejected completion for ${targetUser?.name}`, 'info');
  };

  const handleViewCertificate = (courseId: string) => {
    setSelectedCertificateCourseId(courseId);
    setCurrentView(View.CERTIFICATE);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCurrentView(View.EDIT_COURSE);
  };

  const handleDeleteCourse = async (courseId: string) => {
    setCourseToDelete(courseId);
  };

  const confirmDeleteCourse = async () => {
    if (courseToDelete) {
        const { error } = await supabase.from('courses').delete().eq('id', courseToDelete);
        
        if (error) {
            addNotification('Failed to delete course.', 'info');
        } else {
            setCourses(prev => prev.filter(c => c.id !== courseToDelete));
            addNotification('Training program deleted successfully', 'success');
        }
        setCourseToDelete(null);
    }
  };

  const handleSaveCourse = async (updatedCourse: Course) => {
    const { error } = await supabase.from('courses').upsert({
        id: updatedCourse.id,
        title: updatedCourse.title,
        description: updatedCourse.description,
        outline: updatedCourse.outline,
        instructor: updatedCourse.instructor,
        instructor_bio: updatedCourse.instructorBio,
        duration: updatedCourse.duration,
        level: updatedCourse.level,
        price: updatedCourse.price,
        tags: updatedCourse.tags,
        image: updatedCourse.image,
        signature_image: updatedCourse.signaturePath // Use path for DB
    });

    if (error) {
        addNotification('Failed to update course.', 'info');
        console.error(error);
        return;
    }

    fetchCourses();
    
    if (currentView === View.EDIT_COURSE || currentView === View.CREATE_COURSE) {
        setEditingCourse(null);
        setCurrentView(View.COURSES);
    }

    addNotification('Training program updated successfully', 'success');
  };

  const handleSaveNewCourse = async (newCourse: Course) => {
    const { error } = await supabase.from('courses').insert({
        id: newCourse.id,
        title: newCourse.title,
        description: newCourse.description,
        outline: newCourse.outline,
        instructor: newCourse.instructor,
        instructor_bio: newCourse.instructorBio,
        duration: newCourse.duration,
        level: newCourse.level,
        price: newCourse.price,
        tags: newCourse.tags,
        image: newCourse.image,
        signature_image: newCourse.signaturePath // Use path for DB
    });

    if (error) {
        addNotification('Failed to create course.', 'info');
        console.error(error);
        return;
    }

    fetchCourses();
    setCurrentView(View.COURSES);
    addNotification('New training program created successfully', 'success');
  };

  // Home Page Image Handler
  const handleHomeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
             addNotification('Image too large. Max 2MB.', 'info');
             return;
        }
        
        // Upload to Supabase Storage
        uploadToStorage(file, 'home', 'hero')
            .then(async (path) => {
                // Delete old file if exists and is not default
                if (homeHeroPath && !homeHeroPath.startsWith('http')) {
                    await supabase.storage.from('app-files').remove([homeHeroPath]);
                }

                // Save path to DB
                await saveHomeConfigToDB(homeContent, path);
                
                // Get signed URL for immediate display
                const signedUrl = await getSignedUrl(path);
                if (signedUrl) {
                    setHomeHeroImage(signedUrl);
                    setHomeHeroPath(path);
                }
                
                addNotification('Home page background updated successfully', 'success');
            })
            .catch(err => {
                console.error(err);
                addNotification('Upload failed.', 'info');
            });
    }
  };

  const handleResetHomeImage = async () => {
    if (homeHeroPath && !homeHeroPath.startsWith('http')) {
        await supabase.storage.from('app-files').remove([homeHeroPath]);
    }
    setHomeHeroImage(DEFAULT_HERO_IMAGE);
    setHomeHeroPath(null);
    saveHomeConfigToDB(homeContent, DEFAULT_HERO_IMAGE); // This is a public URL, works fine
    addNotification('Restored default background', 'info');
  };
  
  // Home Page Content Editing Handlers
  const handleSaveHomeContent = () => {
      setHomeContent(tempHomeContent);
      setIsEditingHome(false);
      // We don't have the path here easily if it was an uploaded one, 
      // but saveHomeConfigToDB reads from state? No, we need to persist the *path*.
      // Limitation: If we just edited text, we might be saving the *Signed URL* back to DB if we use homeHeroImage state.
      // Fix: We need to store the *path* in a ref or derived state, OR we just update text parts.
      // For simplicity here, we assume if homeHeroImage starts with 'http' and has a token, it's signed.
      // Ideally we'd store `homeHeroPath` separately. 
      // Current workaround: We only update text here.
      updateHomeTextOnly(tempHomeContent);
      addNotification('Home page content updated successfully', 'success');
  };

  const updateHomeTextOnly = async (content: HomeContent) => {
      // Use current path from state or default
      const currentImage = homeHeroPath || DEFAULT_HERO_IMAGE;
      
      const payload = {
          heroTitle: content.heroTitle,
          heroSubtitle: content.heroSubtitle,
          features: content.features,
          heroImage: currentImage
      };
      
      await supabase.from('site_settings').upsert({ key: 'home_content', value: payload });
  };

  const saveHomeConfigToDB = async (content: HomeContent, imagePath: string) => {
      const payload = {
          heroTitle: content.heroTitle,
          heroSubtitle: content.heroSubtitle,
          features: content.features,
          heroImage: imagePath
      };

      const { error } = await supabase.from('site_settings').upsert({
          key: 'home_content',
          value: payload
      });
      
      if (error) console.error("Failed to save site settings", error);
  };
  
  const handleCancelEditHome = () => {
      setTempHomeContent(homeContent);
      setIsEditingHome(false);
  };
  
  const handleFeatureEdit = (index: number, field: 'title' | 'description', value: string) => {
      const newFeatures = [...tempHomeContent.features];
      newFeatures[index] = { ...newFeatures[index], [field]: value };
      setTempHomeContent({ ...tempHomeContent, features: newFeatures });
  };

  const adminPendingCount = (user?.role === 'admin' && allUsers.length > 0)
      ? allUsers.reduce((acc, u) => acc + (u.pendingCourseIds?.length || 0), 0)
      : 0;

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return (
          <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative bg-indigo-900 text-white py-24 sm:py-32 overflow-hidden group">
               <div className="absolute inset-0 overflow-hidden">
                 <img src={homeHeroImage} alt="Background" className="w-full h-full object-cover opacity-10 transition-all duration-700" />
               </div>
               
               {/* Admin Home Controls */}
               {user?.role === 'admin' && (
                   <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {/* Edit Text Toggle */}
                        {!isEditingHome ? (
                             <button 
                                onClick={() => { setTempHomeContent(homeContent); setIsEditingHome(true); }}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 flex items-center gap-2 transition-colors shadow-lg"
                             >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Edit Text Content
                             </button>
                        ) : (
                             <div className="flex gap-2">
                                <button 
                                    onClick={handleCancelEditHome}
                                    className="bg-red-500/80 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition-colors shadow-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveHomeContent}
                                    className="bg-green-500/80 hover:bg-green-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition-colors shadow-lg"
                                >
                                    Save Changes
                                </button>
                             </div>
                        )}

                        {/* Background Image Controls */}
                        {!isEditingHome && (
                            <>
                                <label className="cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 flex items-center gap-2 transition-colors shadow-lg">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Change Background
                                    <input type="file" className="hidden" accept="image/*" onChange={handleHomeImageUpload} />
                                </label>
                                {homeHeroImage !== DEFAULT_HERO_IMAGE && (
                                    <button 
                                        onClick={handleResetHomeImage}
                                        className="bg-red-500/80 hover:bg-red-600/90 text-white px-3 py-1 rounded-lg text-xs font-medium backdrop-blur-md transition-colors shadow-lg"
                                    >
                                        Reset Default
                                    </button>
                                )}
                            </>
                        )}
                   </div>
               )}

               <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                 {isEditingHome ? (
                    <div className="flex flex-col gap-4 items-center">
                        <input 
                            type="text" 
                            value={tempHomeContent.heroTitle}
                            onChange={(e) => setTempHomeContent({...tempHomeContent, heroTitle: e.target.value})}
                            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-center bg-white/20 border border-white/30 rounded-lg p-2 text-white w-full max-w-4xl placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Hero Title"
                        />
                        <textarea 
                            value={tempHomeContent.heroSubtitle}
                            onChange={(e) => setTempHomeContent({...tempHomeContent, heroSubtitle: e.target.value})}
                            className="mt-6 text-xl text-center bg-white/20 border border-white/30 rounded-lg p-2 text-white w-full max-w-3xl placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            rows={3}
                            placeholder="Hero Subtitle"
                        />
                    </div>
                 ) : (
                    <>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6 animate-float">
                            {homeContent.heroTitle}
                        </h1>
                        <p className="mt-6 text-xl text-indigo-100 max-w-3xl mx-auto animate-float" style={{ animationDelay: '1s' }}>
                            {homeContent.heroSubtitle}
                        </p>
                    </>
                 )}
                 
                 <div className="mt-10 flex justify-center gap-4">
                   <Button size="lg" onClick={() => setCurrentView(View.COURSES)}>Browse Training Programs</Button>
                   <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-indigo-900" onClick={() => setCurrentView(View.REGISTER)}>Join Institute</Button>
                 </div>
               </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl animate-slide-up">Why Choose Deepmetrics?</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        {homeContent.features.map((feature, idx) => (
                             <div key={idx} className="p-6 bg-gray-50 rounded-xl text-center relative group/feature hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                {isEditingHome ? (
                                    <div className="space-y-2">
                                        <input 
                                            type="text" 
                                            value={tempHomeContent.features[idx].title}
                                            onChange={(e) => handleFeatureEdit(idx, 'title', e.target.value)}
                                            className="w-full text-center font-medium border border-gray-300 rounded p-1 text-gray-900"
                                        />
                                        <textarea 
                                            value={tempHomeContent.features[idx].description}
                                            onChange={(e) => handleFeatureEdit(idx, 'description', e.target.value)}
                                            className="w-full text-center text-sm border border-gray-300 rounded p-1 text-gray-500"
                                            rows={3}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">{feature.title}</h3>
                                        <p className="text-gray-500">{feature.description}</p>
                                    </>
                                )}
                             </div>
                        ))}
                    </div>
                </div>
            </section>
          </div>
        );

      case View.COURSES:
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Explore Our Training Programs</h1>
                {user?.role === 'admin' ? (
                    <div className="flex flex-col items-center gap-4 mt-6">
                         <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Admin Mode: Manage Training Programs
                        </div>
                        <Button onClick={() => setCurrentView(View.CREATE_COURSE)} className="flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Create New Training Program
                        </Button>
                    </div>
                ) : (
                    <p className="mt-4 text-xl text-gray-500">Find the perfect program to accelerate your data career.</p>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map(course => (
                <CourseCard 
                    key={course.id} 
                    course={course} 
                    onRegister={handleRegisterCourse}
                    isRegistered={user?.registeredCourseIds.includes(course.id) || false}
                    isCompleted={user?.completedCourseIds?.includes(course.id) || false}
                    isPending={user?.pendingCourseIds?.includes(course.id) || false}
                    progress={user?.courseProgress?.[course.id] || 0}
                    onRequestCompletion={handleRequestCompletion}
                    onViewDetails={() => setViewingCourse(course)}
                    isAdmin={user?.role === 'admin'}
                    onEdit={user?.role === 'admin' ? handleEditCourse : undefined}
                    onDelete={user?.role === 'admin' ? handleDeleteCourse : undefined}
                />
              ))}
            </div>
          </div>
        );

      case View.LOGIN:
      case View.REGISTER:
        return (
          <div className="animate-fade-in">
             <Auth view={currentView} onSwitch={setCurrentView} onAuthSuccess={handleAuthSuccess} />
          </div>
        );
        
      case View.VIDEO_GENERATOR:
        return <VideoGenerator user={user} />;

      case View.DASHBOARD: {
        if (!user) return null;
        const myCourses = courses.filter(c => user.registeredCourseIds.includes(c.id));
        const pendingRequests = user.role === 'admin' 
          ? allUsers.flatMap(u => (u.pendingCourseIds || []).map(cid => ({
              user: u,
              courseId: cid,
              course: courses.find(c => c.id === cid)
            }))).filter(req => req.course)
          : [];

        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
             <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                {user.role === 'admin' && (
                    <Button variant="secondary" onClick={() => setCurrentView(View.COURSES)}>
                        Manage Training Programs
                    </Button>
                )}
            </div>
            
            {user.role === 'admin' && (
                 <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">Completion Requests</h2>
                    </div>
                     {pendingRequests.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {pendingRequests.map((req, idx) => (
                                <li key={`${req.user.id}-${req.courseId}-${idx}`} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div><p className="font-semibold">{req.course?.title}</p> <p className="text-sm text-gray-500">{req.user.name}</p></div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleRejectCompletion(req.user.id, req.courseId)}>Reject</Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleApproveCompletion(req.user.id, req.courseId)}>Approve</Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <div className="p-8 text-center text-gray-500">No pending requests</div>}
                 </div>
            )}
            
            {myCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myCourses.map(course => (
                        <CourseCard 
                            key={course.id} 
                            course={course} 
                            onRegister={() => {}}
                            isRegistered={true}
                            isCompleted={user.completedCourseIds?.includes(course.id)}
                            isPending={user.pendingCourseIds?.includes(course.id)}
                            progress={user.courseProgress?.[course.id] || 0}
                            onProgressChange={(val) => handleProgressChange(course.id, val)}
                            onRequestCompletion={handleRequestCompletion}
                            onViewCertificate={handleViewCertificate}
                            onViewDetails={() => setViewingCourse(course)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-dashed border-2 border-gray-300">
                    <h3 className="text-gray-900 font-medium">No training programs registered</h3>
                    <Button className="mt-4" onClick={() => setCurrentView(View.COURSES)}>Browse Catalog</Button>
                </div>
            )}
          </div>
        );
      }
      
      case View.CERTIFICATE: {
         if (!user || !selectedCertificateCourseId) return null;
         const certCourse = courses.find(c => c.id === selectedCertificateCourseId);
         if (!certCourse) return <div>Training Program not found</div>;

         return (
             <Certificate 
                user={user} 
                course={certCourse} 
                onClose={() => setCurrentView(View.DASHBOARD)}
                onUpdateCourse={handleSaveCourse}
                allCourses={courses}
             />
         );
      }
      
      case View.EDIT_COURSE:
        if (!editingCourse || user?.role !== 'admin') return null;
        return (
            <CourseEditor 
                course={editingCourse} 
                onSave={handleSaveCourse}
                onCancel={() => setCurrentView(View.COURSES)}
            />
        );
      
      case View.CREATE_COURSE:
        if (user?.role !== 'admin') return null;
        return (
            <CourseEditor
                course={{
                    id: `c_${Date.now()}`,
                    title: '',
                    description: '',
                    outline: '',
                    instructor: '',
                    duration: '',
                    level: CourseLevel.BEGINNER,
                    price: 0,
                    tags: [],
                    image: 'https://picsum.photos/seed/new/800/600',
                }}
                onSave={handleSaveNewCourse}
                onCancel={() => setCurrentView(View.COURSES)}
                isCreating={true}
            />
        );

      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      {currentView !== View.CERTIFICATE && (
          <Navbar currentView={currentView} onChangeView={setCurrentView} user={user} onLogout={handleLogout} pendingRequestCount={adminPendingCount} />
      )}
      <main>{renderView()}</main>
      {viewingCourse && (
        <CourseDetailsModal 
            course={viewingCourse} 
            onClose={() => setViewingCourse(null)} 
            onRegister={() => { setViewingCourse(null); handleRegisterCourse(viewingCourse.id); }}
            isRegistered={user?.registeredCourseIds.includes(viewingCourse.id) || false}
        />
      )}
      {currentView !== View.CERTIFICATE && currentView !== View.EDIT_COURSE && currentView !== View.CREATE_COURSE && currentView !== View.VIDEO_GENERATOR && <AIChat courses={courses} />}
    </div>
  );
};

export default App;