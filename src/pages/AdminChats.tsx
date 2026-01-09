import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, Building2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string | null;
  created_at: string | null;
  user_name: string | null;
  institution_name: string | null;
  phone_number: string | null;
  email: string | null;
  role: string | null;
  sender_type: string | null;
  message_content: string | null;
}

interface ConversationGroup {
  phone_number: string;
  user_name: string | null;
  institution_name: string | null;
  messages: ChatMessage[];
  lastMessage: ChatMessage;
}

export default function AdminChats() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: allMessages, isLoading } = useQuery({
    queryKey: ['admin-chat-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_chat_full_view')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
  });

  // Group messages by phone number
  const conversations: ConversationGroup[] = allMessages
    ? Object.values(
        allMessages.reduce((acc: Record<string, ConversationGroup>, msg) => {
          const phone = msg.phone_number || 'unknown';
          if (!acc[phone]) {
            acc[phone] = {
              phone_number: phone,
              user_name: msg.user_name,
              institution_name: msg.institution_name,
              messages: [],
              lastMessage: msg,
            };
          }
          acc[phone].messages.push(msg);
          acc[phone].lastMessage = msg;
          // Update user info if available
          if (msg.user_name) acc[phone].user_name = msg.user_name;
          if (msg.institution_name) acc[phone].institution_name = msg.institution_name;
          return acc;
        }, {})
      ).sort((a, b) => {
        const dateA = new Date(a.lastMessage.created_at || 0).getTime();
        const dateB = new Date(b.lastMessage.created_at || 0).getTime();
        return dateB - dateA;
      })
    : [];

  const selectedConversation = conversations.find(c => c.phone_number === selectedPhone);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedPhone) {
      setSelectedPhone(conversations[0].phone_number);
    }
  }, [conversations, selectedPhone]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">WhatsApp Inspector</h1>
        <p className="text-muted-foreground">Monitor all WhatsApp conversations with the AI bot</p>
      </div>

      <Card className="h-[calc(100vh-220px)] flex overflow-hidden">
        {/* Conversation Sidebar */}
        <div className="w-80 border-r border-border flex flex-col bg-muted/30">
          <div className="p-4 border-b border-border bg-background">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Conversations</h2>
              <Badge variant="secondary" className="ml-auto">
                {conversations.length}
              </Badge>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => (
                  <button
                    key={conv.phone_number}
                    onClick={() => setSelectedPhone(conv.phone_number)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                      selectedPhone === conv.phone_number && 'bg-accent'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground truncate">
                            {conv.user_name || conv.phone_number}
                          </p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDate(conv.lastMessage.created_at)}
                          </span>
                        </div>
                        {conv.institution_name && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {conv.institution_name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conv.lastMessage.message_content?.substring(0, 40)}...
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedConversation.user_name || 'Unknown User'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {selectedConversation.institution_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedConversation.institution_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedConversation.phone_number}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 max-w-3xl mx-auto">
                  {selectedConversation.messages.map((msg, index) => {
                    const isBot = msg.sender_type === 'ai' || msg.sender_type === 'bot' || msg.sender_type === 'assistant';
                    return (
                      <div
                        key={msg.id || index}
                        className={cn(
                          'flex',
                          isBot ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
                            isBot
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-card border border-border text-foreground rounded-bl-md'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.message_content}
                          </p>
                          <p
                            className={cn(
                              'text-xs mt-1',
                              isBot ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            )}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
