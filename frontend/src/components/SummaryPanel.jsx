import React, { useState } from 'react';

/**
 * Summary Panel Component
 * Displays the AI-generated summary with formatting and actions
 */
function SummaryPanel({ summary, loading }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  /**
   * Strip HTML tags from text while preserving structure
   */
  const stripHTMLTags = (text) => {
    if (!text) return '';
    
    // Remove all HTML tags
    let cleaned = text.replace(/<[^>]*>/g, '');
    
    // Decode common HTML entities
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    
    return cleaned;
  };

  /**
   * Copy summary to clipboard with fallback for better compatibility
   * Copies as plain text without HTML tags
   */
  const handleCopy = async () => {
    setCopyError(false);
    
    // Strip HTML tags from summary before copying
    const plainText = stripHTMLTags(summary);
    
    // Method 1: Try modern Clipboard API first
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback method:', err);
    }

    // Method 2: Fallback to legacy execCommand (more reliable in iframes/extensions)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = plainText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('execCommand returned false');
      }
    } catch (err) {
      console.error('All copy methods failed:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  /**
   * Convert summary to HTML with all formatting preserved
   */
  const convertToHTML = (text) => {
    // Convert markdown to HTML while preserving existing HTML color spans
    let html = '<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">\n';
    
    const lines = text.split('\n');
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        html += '<br>\n';
        return;
      }
      
      // Handle headings
      if (trimmed.startsWith('##')) {
        const content = trimmed.replace(/^##\s*/, '');
        html += `<h3 style="font-size: 18px; font-weight: bold; margin-top: 16px; margin-bottom: 8px;">${formatHTMLContent(content)}</h3>\n`;
        return;
      } else if (trimmed.startsWith('#')) {
        const content = trimmed.replace(/^#\s*/, '');
        html += `<h2 style="font-size: 20px; font-weight: bold; margin-top: 20px; margin-bottom: 12px;">${formatHTMLContent(content)}</h2>\n`;
        return;
      }
      
      // Handle bullet points
      if (trimmed.match(/^[-*•]\s/)) {
        const content = trimmed.replace(/^[-*•]\s/, '');
        html += `<div style="margin-left: 20px; margin-bottom: 8px;"><span style="color: #1d4ed8;">●</span> ${formatHTMLContent(content)}</div>\n`;
        return;
      }
      
      // Handle numbered lists
      if (trimmed.match(/^\d+\.\s/)) {
        html += `<p style="margin-left: 20px; margin-bottom: 8px;">${formatHTMLContent(trimmed)}</p>\n`;
        return;
      }
      
      // Regular paragraph
      html += `<p style="margin-bottom: 12px;">${formatHTMLContent(trimmed)}</p>\n`;
    });
    
    html += '</div>';
    return html;
  };
  
  /**
   * Format content - convert markdown to HTML and normalize tags
   */
  const formatHTMLContent = (content) => {
    // Convert **bold** to <strong>
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Normalize <b> to <strong> for consistency
    formatted = formatted.replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>');
    
    // Convert deprecated <font color="..."> tags to modern <span style="color:...">
    formatted = formatted.replace(/<font\s+color=['"]([^'"]+?)['"]>(.*?)<\/font>/gi, 
      '<span style="color:$1">$2</span>');
    
    // HTML spans and strong tags are already in the right format
    return formatted;
  };

  /**
   * Download summary as HTML file with all formatting preserved
   */
  const handleDownload = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Summary - ${new Date().toLocaleDateString()}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      border-bottom: 2px solid #1d4ed8;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0;
      color: #1e293b;
      font-size: 24px;
    }
    .timestamp {
      color: #64748b;
      font-size: 14px;
      margin-top: 8px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dashboard Summary</h1>
      <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
    </div>
    ${convertToHTML(summary)}
    <div class="footer">
      Generated by Tableau Summarizer Extension | Powered by Google Gemini AI
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-summary-${new Date().toISOString().split('T')[0]}.html`;
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
   * Render formatted line with markdown and HTML color support
   * Supports:
   * - Bold: **text**
   * - HTML colors: <span style='color:red'>text</span>
   */
  const renderContent = (content) => {
    if (!content) return content;

    // Parse HTML color spans and bold text
    return parseHTMLColors(content);
  };

  /**
   * Parse HTML color tags: <span style='color:VALUE'>text</span> or <font color="VALUE">text</font>
   * Supports ALL CSS color formats: named, hex, rgb, rgba, hsl, hsla, etc.
   */
  const parseHTMLColors = (text) => {
    const parts = [];
    let lastIndex = 0;
    
    // Pattern 1: <span style='color:...'> format
    const spanPattern = /<span\s+style=['"]color:\s*([^'"]+?);?['"]>(.*?)<\/span>/gi;
    
    // Pattern 2: <font color="..."> format (deprecated but LLMs often use it)
    const fontPattern = /<font\s+color=['"]([^'"]+?)['"]>(.*?)<\/font>/gi;
    
    // Combine both patterns to find all color tags
    const allMatches = [];
    
    let match;
    while ((match = spanPattern.exec(text)) !== null) {
      allMatches.push({
        type: 'span',
        color: match[1].trim(),
        text: match[2],
        index: match.index,
        length: match[0].length
      });
    }
    
    while ((match = fontPattern.exec(text)) !== null) {
      allMatches.push({
        type: 'font',
        color: match[1].trim(),
        text: match[2],
        index: match.index,
        length: match[0].length
      });
    }
    
    // Sort matches by position
    allMatches.sort((a, b) => a.index - b.index);
    
    // Process all matches
    allMatches.forEach((colorMatch, idx) => {
      // Add text before this color tag
      if (colorMatch.index > lastIndex) {
        const beforeText = text.substring(lastIndex, colorMatch.index);
        parts.push(...parseBoldText(beforeText, `plain-${lastIndex}`));
      }
      
      // Add colored text (also parse bold within it)
      const innerContent = parseBoldText(colorMatch.text, `color-${colorMatch.index}`);
      
      parts.push(
        <span key={`color-${colorMatch.index}`} style={{ color: colorMatch.color, fontWeight: 600 }}>
          {innerContent}
        </span>
      );
      
      lastIndex = colorMatch.index + colorMatch.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(...parseBoldText(remainingText, `plain-${lastIndex}`));
    }

    // If no color tags found, just parse bold
    if (parts.length === 0) {
      return parseBoldText(text, 'plain');
    }

    return parts;
  };

  /**
   * Parse bold text: **text**, <b>text</b>, or <strong>text</strong>
   */
  const parseBoldText = (text, keyPrefix) => {
    const parts = [];
    let lastIndex = 0;
    
    // Pattern 1: Markdown bold **text**
    const markdownBoldPattern = /\*\*(.*?)\*\*/g;
    
    // Pattern 2: HTML <b>text</b>
    const bTagPattern = /<b>(.*?)<\/b>/gi;
    
    // Pattern 3: HTML <strong>text</strong>
    const strongTagPattern = /<strong>(.*?)<\/strong>/gi;
    
    // Find all bold patterns
    const allMatches = [];
    
    let match;
    while ((match = markdownBoldPattern.exec(text)) !== null) {
      allMatches.push({
        type: 'markdown',
        text: match[1],
        index: match.index,
        length: match[0].length
      });
    }
    
    while ((match = bTagPattern.exec(text)) !== null) {
      allMatches.push({
        type: 'b',
        text: match[1],
        index: match.index,
        length: match[0].length
      });
    }
    
    while ((match = strongTagPattern.exec(text)) !== null) {
      allMatches.push({
        type: 'strong',
        text: match[1],
        index: match.index,
        length: match[0].length
      });
    }
    
    // Sort by position
    allMatches.sort((a, b) => a.index - b.index);
    
    // Process all matches
    allMatches.forEach((boldMatch, idx) => {
      // Add text before this bold
      if (boldMatch.index > lastIndex) {
        const beforeText = text.substring(lastIndex, boldMatch.index);
        parts.push(<span key={`${keyPrefix}-plain-${lastIndex}`}>{beforeText}</span>);
      }
      
      // Add bold text
      parts.push(<strong key={`${keyPrefix}-bold-${boldMatch.index}`}>{boldMatch.text}</strong>);
      
      lastIndex = boldMatch.index + boldMatch.length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(<span key={`${keyPrefix}-plain-${lastIndex}`}>{remainingText}</span>);
    }
    
    // If no bold found, return as plain text
    if (parts.length === 0) {
      return [<span key={`${keyPrefix}-plain-0`}>{text}</span>];
    }
    
    return parts;
  };


  const formattedContent = formatSummary(summary);

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-tableau-blue to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
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
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              copyError ? 'bg-red-500/30' : 'bg-white/20 hover:bg-white/30'
            }`}
            title={copyError ? "Copy failed - try download instead" : "Copy to clipboard"}
          >
            {copied ? (
              <svg className="w-5 h-5 text-green-100" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : copyError ? (
              <svg className="w-5 h-5 text-red-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            disabled={loading}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download as HTML file (preserves all formatting and colors)"
          >
            <svg className="w-5 h-5 text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
        </div>
        
        {/* Copy Error Message */}
        {copyError && (
          <div className="mt-3 px-3 py-2 bg-red-500/20 border border-red-300/30 rounded-lg">
            <p className="text-xs text-red-50 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Copy failed. Please use the download button instead or try Cmd+C to manually copy the text below.</span>
            </p>
          </div>
        )}
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

