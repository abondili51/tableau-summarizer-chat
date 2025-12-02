import React, { useState, useRef, useEffect } from 'react';

/**
 * Sheet Selector Component
 * Multi-select dropdown for choosing worksheets to include in summary
 */
function SheetSelector({ sheets, selectedSheets, onSelectionChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Toggle sheet selection
   */
  const handleSheetToggle = (sheetName) => {
    if (selectedSheets.includes(sheetName)) {
      onSelectionChange(selectedSheets.filter(s => s !== sheetName));
    } else {
      onSelectionChange([...selectedSheets, sheetName]);
    }
  };

  /**
   * Select all sheets
   */
  const handleSelectAll = () => {
    onSelectionChange([...sheets]);
  };

  /**
   * Clear all selections
   */
  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Sheets
      </label>

      <div className="relative" ref={dropdownRef}>
        {/* Dropdown button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <span className={selectedSheets.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
            {selectedSheets.length === 0 
              ? 'Select sheets...' 
              : `${selectedSheets.length} sheet${selectedSheets.length > 1 ? 's' : ''} selected`}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Action buttons */}
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={sheets.length === 0}
              className="text-xs text-tableau-blue hover:text-blue-700 disabled:text-gray-400 font-medium"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={selectedSheets.length === 0}
              className="text-xs text-tableau-blue hover:text-blue-700 disabled:text-gray-400 font-medium"
            >
              Clear All
            </button>
          </div>

          {/* Sheet list */}
          <div className="max-h-64 overflow-y-auto">
            {sheets.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No sheets available
              </div>
            ) : (
              sheets.map((sheetName, index) => (
                <label
                  key={index}
                  className={`
                    flex items-center px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50
                    ${selectedSheets.includes(sheetName) ? 'bg-blue-50' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedSheets.includes(sheetName)}
                    onChange={() => handleSheetToggle(sheetName)}
                    className="h-4 w-4 text-tableau-blue border-gray-300 rounded focus:ring-tableau-blue"
                  />
                  <span className="ml-3 text-sm text-gray-900">
                    {sheetName}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        Select one or more sheets to include in the AI summary.
      </p>
    </div>
  );
}

export default SheetSelector;

