'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, X, MessageCircleMore } from 'lucide-react';

interface CustomerServiceProps {
  qq?: string;
  wechatQrUrl?: string;
  meiqiaId?: string;
}

export default function CustomerService({
  qq = '497209390',
  wechatQrUrl,
  meiqiaId,
}: CustomerServiceProps) {
  const [isOpen, setIsOpen] = useState(false);

  // QQ在线客服链接
  const qqUrl = `https://wpa.qq.com/msgrd?v=3&uin=${qq}&site=qq&menu=yes`;

  // 如果有美洽ID，加载美洽客服
  // 后续注册美洽后配置
  
  return (
    <>
      {/* 悬浮客服按钮 */}
      <div className="fixed bottom-6 right-6 z-50">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-110"
              size="icon"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <MessageCircle className="h-6 w-6" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 mr-2 mb-2" align="end">
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircleMore className="h-5 w-5" />
                  联系客服
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* QQ客服 */}
                <a
                  href={qqUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-purple-600">
                      QQ 在线客服
                    </div>
                    <div className="text-sm text-gray-500">{qq}</div>
                  </div>
                  <div className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                    在线
                  </div>
                </a>

                {/* 微信客服 */}
                {wechatQrUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.5 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm7 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        微信客服
                      </div>
                      <div className="text-sm text-gray-500">扫码添加客服微信</div>
                    </div>
                  </div>
                )}

                {/* 提示 */}
                <div className="text-xs text-gray-400 text-center pt-2 border-t">
                  工作时间：周一至周五 9:00-18:00
                </div>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
