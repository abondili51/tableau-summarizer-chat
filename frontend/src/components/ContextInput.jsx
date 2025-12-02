import React from 'react';

/**
 * Context Input Component
 * Allows workbook authors to provide business context for summarization
 */
function ContextInput({ context, onContextChange, disabled }) {
  return (
    <div className="space-y-3">
      <label htmlFor="context-input" className="block text-sm font-medium text-gray-700">
        Business Context (Optional)
      </label>

      {/* Text area */}
      <textarea
        id="context-input"
        value={context}
        onChange={(e) => onContextChange(e.target.value)}
        disabled={disabled}
        rows={4}
        placeholder="Add specific instructions or business context to guide the AI summary. For example: 'Focus on customer retention metrics' or 'Compare Q4 performance against targets'."
        className={`
          w-full px-4 py-3 border border-gray-300 rounded-lg 
          focus:ring-2 focus:ring-tableau-blue focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          text-sm text-gray-900 placeholder-gray-400
          resize-none
        `}
      />

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        Providing context helps the AI generate more relevant and actionable insights tailored to your specific needs.
      </p>
    </div>
  );
}

export default ContextInput;

