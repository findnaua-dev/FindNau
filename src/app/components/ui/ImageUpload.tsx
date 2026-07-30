import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

// Add type declaration for Cloudinary
declare global {
  interface Window {
    cloudinary: any;
  }
}

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentImage?: string;
  label?: string;
  folder?: string;
  maxFileSize?: number;
}

export default function ImageUpload({
  onUpload,
  currentImage,
  label = 'Upload Image',
  folder = 'findnau',
  maxFileSize = 20,
}: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(currentImage || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const widgetRef = useRef<any>(null);

  const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    if (document.querySelector('script[src*="cloudinary"]')) return;
    const script = document.createElement('script');
    script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      const el = document.querySelector('script[src*="cloudinary"]');
      if (el) document.body.removeChild(el);
    };
  }, []);

  const openWidget = () => {
    setError('');

    if (!window.cloudinary) {
      setError('Cloudinary is still loading. Please try again in a moment.');
      return;
    }
    if (!cloudName || !uploadPreset) {
      setError('Cloudinary is not configured. Check your .env file.');
      return;
    }

    setUploading(true);
    widgetRef.current = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        folder: folder,
        maxFiles: 1,
        maxFileSize: maxFileSize * 1024 * 1024,
        sources: ['local', 'url', 'camera'],
        cropping: true,
        croppingAspectRatio: 2,
        showSkipCropButton: false,
        multiple: false,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'],
        maxImageWidth: 10000,
        maxImageHeight: 5000,
        styles: {
          palette: {
            window: '#FFFFFF',
            windowBorder: '#F97316',
            tabIcon: '#F97316',
            menuIcons: '#374151',
            textDark: '#374151',
            textLight: '#FFFFFF',
            link: '#F97316',
            action: '#F97316',
            inProgress: '#F97316',
            complete: '#10B981',
            error: '#EF4444',
            sourceBg: '#F9FAFB',
          },
        },
      },
      (error: any, result: any) => {
        if (!error && result && result.event === 'success') {
          const url = result.info.secure_url;
          setImageUrl(url);
          onUpload(url);
          setError('');
        }
        if (error) {
          console.error('Upload error:', error);
          setError('Upload failed. Please try again.');
        }
        setUploading(false);
      }
    );
    widgetRef.current.open();
  };

  const removeImage = () => {
    setImageUrl('');
    onUpload('');
    setError('');
  };

  const formatFileSize = (mb: number) => {
    return mb >= 1 ? `${mb}MB` : `${Math.round(mb * 1024)}KB`;
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-medium text-gray-600">{label}</label>
      )}

      {error && (
        <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg" role="alert">
          {error}
        </div>
      )}

      {imageUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={imageUrl}
            alt="Uploaded floor plan or panorama"
            className="w-full h-40 object-cover"
          />
          <button
            onClick={removeImage}
            aria-label="Remove uploaded image"
            title="Remove image"
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X size={14} />
          </button>
          <button
            onClick={openWidget}
            aria-label="Change uploaded image"
            title="Change image"
            className="absolute bottom-2 right-2 bg-white/90 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white border border-gray-200 transition-colors"
          >
            Change
          </button>
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            Uploaded
          </div>
        </div>
      ) : (
        <button
          onClick={openWidget}
          disabled={uploading}
          aria-label={label}
          title={label}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <div className="animate-pulse flex flex-col items-center" aria-live="polite">
              <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <Upload size={20} className="text-gray-400 animate-bounce" />
              </div>
              <span className="text-xs font-medium text-gray-500">Uploading...</span>
              <span className="text-[10px] text-gray-400 mt-1">Please wait</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <ImageIcon size={24} className="text-gray-300" />
              </div>
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[10px] mt-1">JPG, PNG, GIF, WebP, BMP, TIFF</span>
              <span className="text-[10px] text-gray-400">Max {formatFileSize(maxFileSize)}</span>
              <span className="text-[10px] text-orange-400 mt-2 font-medium">Click to upload</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}