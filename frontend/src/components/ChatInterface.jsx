import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * ChatInterface Component
 * Provides a chat interface for asking questions about the datasource
 */
function ChatInterface({ 
  datasourceId, 
  datasourceName,
  accessToken, 
  summaryContext,
  onAuthRequired 
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    if (!accessToken) {
      onAuthRequired();
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const { sendChatQuery } = await import('../services/ChatService');
      
      console.log('Sending chat query...', {
        question: inputValue,
        datasourceId,
        hasToken: !!accessToken,
        sessionId
      });
      
      const response = await sendChatQuery({
        question: inputValue,
        datasourceId: datasourceId,
        accessToken: accessToken,
        sessionId: sessionId,
        summaryContext: summaryContext
      });

      console.log('Received chat response:', response);

      // Ensure we have a valid answer
      if (!response || typeof response.answer !== 'string') {
        throw new Error('Invalid response format from chat agent');
      }

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer || 'No response received',
        timestamp: new Date(),
        metadata: {
          status: response.status,
          executionTime: response.executionTime,
          reasoningProcess: response.reasoningProcess
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Chat error:', err);
      console.error('Error details:', err.stack);
      setError(err.message || 'Failed to get response');
      
      // If auth error, trigger auth flow
      if (err.message.includes('401') || err.message.includes('Authentication')) {
        onAuthRequired();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const exampleQuestions = [
    "What are the top 5 products by sales?",
    "Show me sales trends over time",
    "Which region has the highest profit margin?",
    "What's the average order value?",
    "Compare performance across categories"
  ];

  const handleExampleClick = (question) => {
    setInputValue(question);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chat with your Data</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ask questions about {datasourceName || 'your datasource'}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-tableau-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Ask questions about your data and get instant answers powered by AI and Tableau VDS queries
            </p>
            
            {/* Example Questions */}
            <div className="max-w-2xl mx-auto">
              <p className="text-xs font-medium text-gray-700 mb-3">Try these examples:</p>
              <div className="grid grid-cols-1 gap-2">
                {exampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(question)}
                    className="text-left px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl ${
                    message.role === 'user'
                      ? 'bg-tableau-blue text-white rounded-lg px-4 py-2.5'
                      : 'bg-gray-100 text-gray-900 rounded-lg px-4 py-3 border border-gray-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      {message.content ? (
                        <ReactMarkdown
                          components={{
                            // Override code blocks to prevent rendering issues
                            code: ({node, inline, className, children, ...props}) => (
                              inline ? 
                                <code className="bg-gray-200 px-1 rounded text-xs" {...props}>{children}</code> :
                                <pre className="bg-gray-800 text-white p-2 rounded overflow-x-auto"><code {...props}>{children}</code></pre>
                            )
                          }}
                        >
                          {String(message.content)}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-gray-500 italic">Empty response</p>
                      )}
                      {message.metadata?.executionTime && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                          Execution time: {message.metadata.executionTime.toFixed(2)}s
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content || '(empty message)'}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.1s' }}></div>
                    <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mb-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your data..."
              rows="2"
              disabled={loading || !accessToken}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tableau-blue focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={loading || !inputValue.trim() || !accessToken}
            className="px-6 py-2.5 bg-tableau-blue hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </>
            )}
          </button>
        </div>
        {!accessToken && (
          <p className="mt-2 text-xs text-gray-500">
            Please authenticate to start chatting with your data
          </p>
        )}
      </div>
    </div>
  );
}

export default ChatInterface;

