import { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChildProfile, ChatMessage } from './BuddyApp';
import { useToast } from '@/hooks/use-toast';

interface DevConsoleProps {
  childProfile: ChildProfile;
  audioBlob: Blob | null;
  transcriptText: string;
  chatLog: ChatMessage[];
  onClose: () => void;
}

export function DevConsole({ 
  childProfile, 
  audioBlob, 
  transcriptText, 
  chatLog,
  onClose 
}: DevConsoleProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    });
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div className="bg-gray-900 text-green-400 font-mono text-sm border-b border-gray-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="font-semibold">Developer Console</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                const resp = await fetch("/functions/v1/transcribe-audio", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ audio: "" })
                });
                const result = await resp.json();
                alert(`STT Self-test Response:\n${JSON.stringify(result, null, 2)}`);
              } catch (e) {
                alert(`STT Self-test Error:\n${e}`);
              }
            }}
            className="text-purple-400 hover:text-purple-300 hover:bg-gray-700 text-xs"
          >
            Run STT Self-test
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-green-400 hover:text-green-300 hover:bg-gray-700"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-red-400 hover:text-red-300 hover:bg-gray-700"
          >
            ✕
          </Button>
        </div>
      </div>
      
      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
          {/* Child Profile */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-yellow-400 font-semibold">Child Profile:</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(childProfile, null, 2), "Child Profile")}
                className="text-blue-400 hover:text-blue-300 hover:bg-gray-700 h-6 px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="bg-gray-800 p-3 rounded border border-gray-600">
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(childProfile, null, 2)}
              </pre>
            </div>
          </div>
          
          {/* Audio Blob */}
          <div className="space-y-2">
            <h4 className="text-yellow-400 font-semibold">Audio Blob:</h4>
            <div className="bg-gray-800 p-3 rounded border border-gray-600">
              <div className="text-xs space-y-1">
                <div>Size: {audioBlob ? formatBytes(audioBlob.size) : 'No audio recorded'}</div>
                <div>Type: {audioBlob?.type || 'N/A'}</div>
                <div>Last Modified: {audioBlob ? new Date().toLocaleString() : 'N/A'}</div>
              </div>
            </div>
          </div>
          
          {/* Transcript */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-yellow-400 font-semibold">Transcript Text:</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(transcriptText, "Transcript")}
                className="text-blue-400 hover:text-blue-300 hover:bg-gray-700 h-6 px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="bg-gray-800 p-3 rounded border border-gray-600">
              <div className="text-xs">
                {transcriptText || 'No transcript available'}
              </div>
            </div>
          </div>
          
          {/* Chat Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-yellow-400 font-semibold">Chat Log ({chatLog.length} messages):</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(chatLog, null, 2), "Chat Log")}
                className="text-blue-400 hover:text-blue-300 hover:bg-gray-700 h-6 px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="bg-gray-800 p-3 rounded border border-gray-600 max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(chatLog, null, 2)}
              </pre>
            </div>
          </div>
          
          {/* Console Logs */}
          <div className="space-y-2">
            <h4 className="text-yellow-400 font-semibold">Browser Console:</h4>
            <div className="bg-gray-800 p-3 rounded border border-gray-600">
              <div className="text-xs text-gray-400">
                Check browser DevTools console for additional logs...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}