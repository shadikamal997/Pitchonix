'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Lightbulb, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSuggestions, Suggestion } from '@/hooks/useSuggestions';

interface SmartTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldName: string;
  industry?: string;
  documentType?: string;
  relatedFields?: Record<string, string>;
  rows?: number;
  className?: string;
  label?: string;
  description?: string;
}

export default function SmartTextarea({
  value,
  onChange,
  placeholder,
  fieldName,
  industry,
  documentType,
  relatedFields,
  rows = 4,
  className = '',
  label,
  description,
}: SmartTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { suggestions, loading } = useSuggestions({
    fieldName,
    industry,
    documentType,
    currentValue: value,
    relatedFields,
  });

  const hasSuggestions = suggestions.length > 0;


  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.value);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || !hasSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const getSourceIcon = (source: Suggestion['source']) => {
    switch (source) {
      case 'template':
        return <Sparkles className="w-3 h-3" />;
      case 'industry':
        return <Lightbulb className="w-3 h-3" />;
      default:
        return <Lightbulb className="w-3 h-3" />;
    }
  };

  const getSourceColor = (source: Suggestion['source']) => {
    switch (source) {
      case 'template':
        return 'bg-blue-100 text-blue-700';
      case 'industry':
        return 'bg-purple-100 text-purple-700';
      case 'pattern':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
          {hasSuggestions && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {showSuggestions ? 'Hide' : 'Show'} Suggestions ({suggestions.length})
            </Button>
          )}
        </div>
      )}
      
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${className}`}
        />

        {loading && (
          <div className="absolute top-2 right-2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && hasSuggestions && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1 max-h-96 overflow-y-auto">
          <div className="px-2 py-1 text-xs text-gray-500 font-medium flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Smart Suggestions
            <span className="text-gray-400">(Press ⌘↩ to use)</span>
          </div>
          
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getSourceColor(suggestion.source)}`}>
                    {getSourceIcon(suggestion.source)}
                    <span className="ml-1">{suggestion.source}</span>
                  </Badge>
                  {suggestion.category && (
                    <span className="text-xs text-gray-500">{suggestion.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          i < Math.round(suggestion.confidence * 5)
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 mb-1">{suggestion.label}</div>
              
              <div className="text-sm text-gray-900 line-clamp-2">
                {suggestion.value}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper Text */}
      {hasSuggestions && !showSuggestions && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ChevronDown className="w-3 h-3" />
          <span>
            {suggestions.length} smart suggestions available
          </span>
        </div>
      )}
    </div>
  );
}
