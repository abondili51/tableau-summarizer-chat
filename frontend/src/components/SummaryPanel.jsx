import React, { useState } from 'react';

/**
 * Summary Panel Component
 * Displays the AI-generated summary with formatting and actions
 */
function SummaryPanel({ summary, loading }) {
  const [copied, setCopied] = useState(false);

  /**
   * Copy summary to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  /**
   * Download summary as text file
   */
  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-summary-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Format summary text with markdown-like rendering
   * Converts bullet points, bold text, etc. for better readability
   */
  const formatSummary = (text) => {
    if (!text) return [];

    const lines = text.split('\n');
    const formatted = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        // Empty line - add spacing
        formatted.push({ type: 'space', key: `space-${index}` });
      } else if (trimmed.startsWith('##')) {
        // Heading level 2
        formatted.push({ 
          type: 'h2', 
          content: trimmed.replace(/^##\s*/, ''),
          key: `h2-${index}`
        });
      } else if (trimmed.startsWith('#')) {
        // Heading level 1
        formatted.push({ 
          type: 'h1', 
          content: trimmed.replace(/^#\s*/, ''),
          key: `h1-${index}`
        });
      } else if (trimmed.match(/^[-*•]\s/)) {
        // Bullet point
        formatted.push({ 
          type: 'bullet', 
          content: trimmed.replace(/^[-*•]\s/, ''),
          key: `bullet-${index}`
        });
      } else if (trimmed.match(/^\d+\.\s/)) {
        // Numbered list
        formatted.push({ 
          type: 'numbered', 
          content: trimmed,
          key: `numbered-${index}`
        });
      } else {
        // Regular paragraph
        formatted.push({ 
          type: 'paragraph', 
          content: trimmed,
          key: `para-${index}`
        });
      }
    });

    return formatted;
  };

  /**
   * Render formatted line with bold text support
   */
  const renderContent = (content) => {
    // Simple bold text support: **text** -> <strong>text</strong>
    const parts = content.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const formattedContent = formatSummary(summary);

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-tableau-blue to-blue-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-white">AI-Generated Summary</h2>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy to clipboard"
          >
            {copied ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download as text file"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-tableau-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            {formattedContent.map((item) => {
              switch (item.type) {
                case 'h1':
                  return (
                    <h3 key={item.key} className="text-xl font-bold text-gray-900 mt-6 mb-3">
                      {renderContent(item.content)}
                    </h3>
                  );
                case 'h2':
                  return (
                    <h4 key={item.key} className="text-lg font-semibold text-gray-800 mt-5 mb-2">
                      {renderContent(item.content)}
                    </h4>
                  );
                case 'bullet':
                  return (
                    <div key={item.key} className="flex items-start gap-3 mb-2">
                      <span className="text-tableau-blue mt-1.5">●</span>
                      <p className="text-gray-700 leading-relaxed flex-1">
                        {renderContent(item.content)}
                      </p>
                    </div>
                  );
                case 'numbered':
                  return (
                    <p key={item.key} className="text-gray-700 leading-relaxed mb-2 ml-4">
                      {renderContent(item.content)}
                    </p>
                  );
                case 'space':
                  return <div key={item.key} className="h-3" />;
                case 'paragraph':
                default:
                  return (
                    <p key={item.key} className="text-gray-700 leading-relaxed mb-3">
                      {renderContent(item.content)}
                    </p>
                  );
              }
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      {!loading && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center text-xs text-gray-500">
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Generated by Google Gemini AI. Please review insights for accuracy and context.
          </div>
        </div>
      )}
    </div>
  );
}

export default SummaryPanel;

