'use client';

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
  checks: {
    label: string;
    passed: boolean;
  }[];
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const result = useMemo((): StrengthResult => {
    const checks = [
      { label: '至少6个字符', passed: password.length >= 6 },
      { label: '包含小写字母', passed: /[a-z]/.test(password) },
      { label: '包含大写字母', passed: /[A-Z]/.test(password) },
      { label: '包含数字', passed: /\d/.test(password) },
      { label: '包含特殊字符', passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    const passedCount = checks.filter(c => c.passed).length;
    
    let score = 0;
    let label = '非常弱';
    let color = 'bg-red-500';

    if (password.length === 0) {
      label = '请输入密码';
      color = 'bg-gray-300';
    } else if (passedCount <= 1) {
      score = 1;
      label = '非常弱';
      color = 'bg-red-500';
    } else if (passedCount === 2) {
      score = 2;
      label = '弱';
      color = 'bg-orange-500';
    } else if (passedCount === 3) {
      score = 3;
      label = '中等';
      color = 'bg-yellow-500';
    } else if (passedCount === 4) {
      score = 4;
      label = '强';
      color = 'bg-green-500';
    } else {
      score = 4;
      label = '非常强';
      color = 'bg-green-600';
    }

    return { score, label, color, checks };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">密码强度</span>
          <span className={`font-medium ${
            result.score >= 3 ? 'text-green-600' : 
            result.score >= 2 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {result.label}
          </span>
        </div>
        <Progress 
          value={(result.score / 4) * 100} 
          className="h-2"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {result.checks.map((check, index) => (
          <div key={index} className="flex items-center gap-1.5">
            {check.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            )}
            <span className={check.passed ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
