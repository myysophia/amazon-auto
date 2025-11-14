'use client';

import { useState, useEffect, type ReactNode } from 'react';

interface KeywordInputProps {
  value: string;
  onChange: (value: string, keywords: string[]) => void;
  disabled?: boolean;
  actions?: ReactNode;
}

export default function KeywordInput({ value, onChange, disabled = false, actions }: KeywordInputProps) {
  const [keywordCount, setKeywordCount] = useState(0);

  useEffect(() => {
    const keywords = value
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    setKeywordCount(keywords.length);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const keywords = newValue
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    onChange(newValue, keywords);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="keywords" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          关键词列表
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({keywordCount} 个关键词)
          </span>
        </label>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <textarea
        id="keywords"
        name="keywords"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="每行输入一个关键词…"
        rows={10}
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg resize-vertical
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-gray-100 disabled:cursor-not-allowed
                   dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100
                   min-h-[200px]"
        style={{ fontSize: '16px' }} // 确保移动端不缩放
        autoComplete="off"
        spellCheck={false}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        请每行输入一个关键词，支持批量粘贴
      </p>
    </div>
  );
}

