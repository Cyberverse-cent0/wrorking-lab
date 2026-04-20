import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/hooks/useApi";

interface ProfilePhotoUploadProps {
  currentImage?: string | null;
  onImageUpdate: (imageUrl: string) => void;
}

export function ProfilePhotoUpload({ currentImage, onImageUpdate }: ProfilePhotoUploadProps) {
  const { user, token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the file
    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/users/${user?.id}/profile-photo`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      if (result.imageUrl) {
        onImageUpdate(result.imageUrl);
        setPreview(result.imageUrl);
      }
    } catch (error: any) {
      console.error('Failed to upload profile photo:', error);
      alert(`Failed to upload profile photo: ${error.message || 'Please try again.'}`);
      // Reset preview on error
      setPreview(currentImage || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removePhoto = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/users/${user?.id}/profile-photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      onImageUpdate('');
      setPreview(null);
    } catch (error: any) {
      console.error('Failed to remove profile photo:', error);
      alert(`Failed to remove profile photo: ${error.message || 'Please try again.'}`);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className="w-24 h-24">
          {preview ? (
            <AvatarImage src={preview} alt={user?.name} />
          ) : currentImage ? (
            <AvatarImage src={currentImage} alt={user?.name} />
          ) : (
            <AvatarFallback className="text-xl">
              {user?.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        
        {/* Upload overlay */}
        <div 
          className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/gif"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag and drop area */}
      <div
        className={`w-full max-w-xs border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragActive 
            ? 'border-primary bg-primary/10 scale-105' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className={`w-8 h-8 mb-3 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium text-foreground mb-2">
              Drag & drop your photo here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF up to 5MB
            </p>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          Choose Photo
        </Button>
        
        {(preview || currentImage) && (
          <Button
            variant="outline"
            size="sm"
            onClick={removePhoto}
            disabled={isUploading}
          >
            <X className="w-4 h-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* User info and instructions */}
      <div className="text-center space-y-1 max-w-xs">
        <p className="text-sm font-medium text-foreground">
          {user?.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {user?.email}
        </p>
        <p className="text-xs text-muted-foreground pt-2">
          Upload a profile photo to personalize your account. This photo will be displayed throughout the platform.
        </p>
      </div>
    </div>
  );
}
