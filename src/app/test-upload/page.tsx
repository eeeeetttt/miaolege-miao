'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestUploadPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name + ' (' + (file.size / 1024).toFixed(1) + 'KB)');
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>手机端上传测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            当前环境: {typeof window !== 'undefined' ? navigator.userAgent : 'SSR'}
          </p>
          
          <div>
            <label className="block text-sm font-medium mb-2">方法1: 普通input</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">方法2: 点击触发</label>
            <input
              type="file"
              id="test-upload-2"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => document.getElementById('test-upload-2')?.click()}>
              选择文件
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">方法3: 拍照</label>
            <input
              type="file"
              id="test-upload-3"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => document.getElementById('test-upload-3')?.click()}>
              拍照
            </Button>
          </div>

          {fileName && (
            <p className="text-sm text-green-600">已选择: {fileName}</p>
          )}

          {preview && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">预览:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="预览" className="max-w-full max-h-64 rounded" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
