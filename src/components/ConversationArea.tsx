import { useEffect, useRef } from 'react';
import { ChatMessage } from './BuddyApp';

interface ConversationAreaProps {
  messages: ChatMessage[];
}

export function ConversationArea({ messages }: ConversationAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  return (
    <div 
      ref={scrollRef}
      className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
    >
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-center">
          <div className="space-y-2">
            <div className="text-6xl">👋</div>
            <p className="text-xl font-medium text-foreground">
              Welcome to Buddy!
            </p>
            <p className="text-muted-foreground">
              Your conversations will appear here
            </p>
          </div>
        </div>
      )}
      
      {messages.map((message, index) => (
        <div
          key={`${message.ts}-${index}`}
          className={`flex ${message.role === 'child' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`
              max-w-[80%] p-4 rounded-2xl shadow-chat
              ${message.role === 'child'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-secondary text-secondary-foreground rounded-bl-md'
              }
              ${message.text.includes('[voice note captured]') 
                ? 'bg-gradient-to-r from-accent to-buddy-yellow text-accent-foreground' 
                : ''
              }
            `}
          >
            <div className="flex items-start gap-2">
              {message.role === 'buddy' && (
                <div className="w-8 h-8 rounded-full bg-buddy-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  B
                </div>
              )}
              
              <div className="flex-1">
                <p className="text-base leading-relaxed">
                  {message.text}
                </p>
                <p className={`text-xs mt-1 opacity-70`}>
                  {formatTime(message.ts)}
                </p>
              </div>
              
              {message.role === 'child' && (
                <div className="w-8 h-8 rounded-full bg-buddy-pink flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {message.text.includes('[voice note captured]') ? '🎤' : '👶'}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}