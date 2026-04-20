import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, apiFetch } from "@/hooks/useApi";
import { formatRelative } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

interface Props {
  projectId: string;
}

export function ProjectChat({ projectId }: Props) {
  const { user } = useAuth();
  const { data, loading, refetch } = useQuery<Message[]>(`/api/projects/${projectId}/messages`);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(refetch, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: content.trim() }),
      });
      setContent("");
      refetch();
    } catch (e) {}
    finally { setSending(false); }
  };

  const messages = data || [];

  return (
    <div className="flex flex-col h-[500px] border border-border rounded-lg overflow-hidden bg-card">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender.id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">{msg.sender.name.charAt(0)}</span>
                </div>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    {!isMe && <span className="text-xs font-medium text-foreground">{msg.sender.name}</span>}
                    <span className="text-xs text-muted-foreground">{formatRelative(msg.createdAt)}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-lg text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none min-h-9 max-h-24"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e as any);
              }
            }}
            data-testid="input-message"
          />
          <Button type="submit" size="sm" disabled={sending || !content.trim()} className="self-end" data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
