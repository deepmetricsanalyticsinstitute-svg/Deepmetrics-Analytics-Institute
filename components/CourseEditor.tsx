import React, { useState, useEffect, useRef } from 'react';
import { Course, CourseLevel } from '../types';
import { Button } from './Button';
import { uploadToStorage, getSignedUrl, deleteFromStorage } from '../supabaseClient';

interface CourseEditorProps {
  course: Course;
  onSave: (updatedCourse: Course) => void;
  onCancel: () => void;
  isCreating?: boolean;
}

// ... EditorToolbarButton and RichTextEditor components remain unchanged ...
const EditorToolbarButton = ({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        title={label}
    >
        {icon}
    </button>
);

const RichTextEditor = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (val: string) => void, placeholder?: string }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
             if (document.activeElement !== editorRef.current) {
                editorRef.current.innerHTML = value;
             }
        }
    }, [value]);
    const handleInput = () => { if (editorRef.current) onChange(editorRef.current.innerHTML); };
    const execCmd = (command: string) => { document.execCommand(command, false, undefined); handleInput(); editorRef.current?.focus(); };

    return (
        <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-shadow">
                <div className="bg-gray-50 border-b border-gray-200 p-1 flex gap-1">
                    <EditorToolbarButton onClick={() => execCmd('bold')} label="Bold" icon={<span className="font-bold">B</span>} />
                    <EditorToolbarButton onClick={() => execCmd('italic')} label="Italic" icon={<span className="italic">I</span>} />
                    <EditorToolbarButton onClick={() => execCmd('insertUnorderedList')} label="Bullet List" icon={<span>• List</span>} />
                    <EditorToolbarButton onClick={() => execCmd('insertOrderedList')} label="Numbered List" icon={<span>1. List</span>} />
                </div>
                <div ref={editorRef} contentEditable className="p-3 min-h-[150px] outline-none text-sm text-gray-900" onInput={handleInput} suppressContentEditableWarning data-placeholder={placeholder} />
            </div>
        </div>
    );
};

export const CourseEditor: React.FC<CourseEditorProps> = ({ course, onSave, onCancel, isCreating = false }) => {
  const [formData, setFormData] = useState<Course>(course);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    setFormData(course);
  }, [course]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      setImageError(null);
      const file = e.target.files?.[0];
      if (file) {
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
              setImageError("Invalid format. Use JPG, PNG, or WEBP.");
              e.target.value = '';
              return;
          }
          if (file.size > 2 * 1024 * 1024) {
              setImageError("Image too large. Max 2MB.");
              e.target.value = '';
              return;
          }

          setIsUploadingImage(true);
          try {
             // 1. Upload to Supabase Storage
             const path = await uploadToStorage(file, 'courses', formData.id);
             
             // 2. Get Signed URL for display
             const url = await getSignedUrl(path);

             // 3. Delete old image if it was a path
             if (formData.imagePath) {
                 await deleteFromStorage(formData.imagePath);
             }

             // 4. Update State
             setFormData(prev => ({ 
                 ...prev, 
                 imagePath: path,
                 image: url || '' // temporary display URL
             }));
          } catch (err) {
              console.error(err);
              setImageError("Upload failed. Please try again.");
          } finally {
              setIsUploadingImage(false);
          }
      }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      setSignatureError(null);
      const file = e.target.files?.[0];
      if (file) {
          if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
              setSignatureError("Invalid format. Use JPG, PNG, or SVG.");
              e.target.value = '';
              return;
          }
          if (file.size > 2 * 1024 * 1024) {
              setSignatureError("Image too large. Max 2MB.");
              e.target.value = '';
              return;
          }

          setIsUploading(true);
          try {
             // 1. Upload to Supabase Storage
             const path = await uploadToStorage(file, 'signatures', formData.id);
             
             // 2. Get Signed URL for display
             const url = await getSignedUrl(path);

             // 3. Update State (store path in signaturePath)
             setFormData(prev => ({ 
                 ...prev, 
                 signaturePath: path,
                 signatureImage: url // temporary display URL
             }));
          } catch (err) {
              console.error(err);
              setSignatureError("Upload failed. Please try again.");
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handleRemoveSignature = async () => {
      if (formData.signaturePath) {
          await deleteFromStorage(formData.signaturePath);
      }
      setFormData(prev => ({ ...prev, signatureImage: undefined, signaturePath: undefined }));
      setSignatureError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-indigo-900 px-6 py-4 border-b border-indigo-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{isCreating ? 'Create New Training Program' : 'Edit Training Program'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>

            <RichTextEditor label="Description" value={formData.description} onChange={(val) => setFormData(prev => ({ ...prev, description: val }))} />
            <RichTextEditor label="Course Outline" value={formData.outline || ''} onChange={(val) => setFormData(prev => ({ ...prev, outline: val }))} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <input type="text" name="instructor" value={formData.instructor} onChange={handleChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>

            <RichTextEditor label="Instructor Bio" value={formData.instructorBio || ''} onChange={(val) => setFormData(prev => ({ ...prev, instructorBio: val }))} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <input type="text" name="duration" value={formData.duration} onChange={handleChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select name="level" value={formData.level} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2">
                {Object.values(CourseLevel).map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (GHC)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input type="text" value={formData.tags.join(', ')} onChange={handleTagsChange} className="w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Cover Image</label>
              <div className="flex items-start gap-4">
                  <div className="flex-1">
                      <input type="url" name="image" value={formData.image} onChange={handleChange} placeholder="Enter Image URL or Upload File" className="w-full rounded-md border border-gray-300 px-3 py-2 mb-2" />
                      <div className="flex items-center gap-2">
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                      </div>
                      {isUploadingImage && <p className="text-xs text-indigo-600 mt-1">Uploading...</p>}
                      {imageError && <p className="text-xs text-red-600 mt-1">{imageError}</p>}
                  </div>
                  {formData.image && (
                      <div className="h-24 w-40 bg-gray-100 rounded overflow-hidden border border-gray-200 flex-shrink-0">
                          <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                  )}
              </div>
            </div>

            <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructor Signature</label>
                <div className="flex items-center gap-4">
                    {formData.signatureImage ? (
                        <div className="relative group">
                            <div className="h-16 w-32 bg-white border border-gray-300 rounded flex items-center justify-center overflow-hidden p-1">
                                <img src={formData.signatureImage} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                            </div>
                            <button type="button" onClick={handleRemoveSignature} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600">X</button>
                        </div>
                    ) : (
                        <div className="h-16 w-32 bg-gray-100 border border-gray-300 border-dashed rounded flex items-center justify-center text-gray-400 text-xs">No signature</div>
                    )}
                    <div className="flex-1">
                        <input type="file" accept="image/*" onChange={handleSignatureUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                         {isUploading && <p className="text-xs text-indigo-600 mt-1">Uploading...</p>}
                         {signatureError && <p className="text-xs text-red-600 mt-1">{signatureError}</p>}
                    </div>
                </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary">{isCreating ? 'Create' : 'Save Changes'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};