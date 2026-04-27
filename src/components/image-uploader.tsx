'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (base64: string) => void;
  preview?: string | null;
  disabled?: boolean;
  accept?: string;
}

export function ImageUploader({ onUpload, preview, disabled, accept = "image/*" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 原生事件处理，避免 React 事件问题
    const handleChange = async () => {
      const input = inputRef.current;
      if (!input || !input.files || !input.files[0]) return;
      
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      
      setLoading(true);
      
      try {
        const base64 = await fileToBase64(file);
        onUpload(base64);
      } catch (error) {
        console.error('上传失败:', error);
        alert('上传失败，请重试');
      } finally {
        setLoading(false);
        // 清空 input 以便重新选择同一文件
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('change', handleChange);
      return () => input.removeEventListener('change', handleChange);
    }
  }, [onUpload]);

  const handleClick = () => {
    if (!disabled && !loading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        className="hidden"
        disabled={disabled || loading}
      />
      
      <div
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
          ${disabled || loading 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : preview 
              ? 'border-green-500 bg-green-50 hover:border-green-600' 
              : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
          }
        `}
      >
        {loading ? (
          <div className="space-y-2">
            <Loader2 className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500">上传中...</p>
          </div>
        ) : preview ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={preview} 
                alt="预览" 
                className="max-h-40 rounded"
              />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-sm text-green-600 font-medium">点击重新选择</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
            <p className="text-gray-500 font-medium">点击选择图片</p>
            <p className="text-xs text-gray-400">支持 JPG、PNG 格式</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 文件转 base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
