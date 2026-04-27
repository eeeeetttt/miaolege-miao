'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (base64: string) => void;
  preview?: string | null;
  disabled?: boolean;
  accept?: string;
  capture?: 'user' | 'environment';
}

export function ImageUploader({ 
  onUpload, 
  preview, 
  disabled, 
  accept = "image/*",
  capture 
}: ImageUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [inputId] = useState(() => `upload-${Math.random().toString(36).substr(2, 9)}`);

  // 文件转 base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // 处理文件选择
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.error('不是图片文件');
      return;
    }

    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      onUpload(base64);
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setLoading(false);
    }
  }, [fileToBase64, onUpload]);

  // 监听 input change 事件
  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        processFile(file);
        // 清空以便重新选择
        target.value = '';
      }
    };

    input.addEventListener('change', handleChange);
    return () => input.removeEventListener('change', handleChange);
  }, [inputId, processFile]);

  // 点击处理函数
  const handleClick = useCallback(() => {
    if (disabled || loading) return;
    
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }, [disabled, loading, inputId]);

  return (
    <div className="relative">
      <input
        type="file"
        id={inputId}
        accept={accept}
        capture={capture}
        className="hidden"
        disabled={disabled || loading}
      />
      
      <div
        onClick={handleClick}
        onTouchEnd={handleClick}  // 移动端触摸事件
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all select-none
          ${disabled || loading 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : preview 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 bg-white active:bg-green-50'
          }
        `}
        style={{ touchAction: 'manipulation' }}  // 禁用双击缩放
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
