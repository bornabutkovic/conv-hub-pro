import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircle,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

interface ChatMessage {
  id: string;
  created_at: string | null;
  session_id: string;
  sender_name: string | null;
  event_id: string | null;
  event_name: string | null;
  Sender: any;
  message: any;
}

interface ConversationGroup {
  phone_number: string;
  user_name: string;
  messages: ChatMessage[];
  lastMessage: ChatMessage;
}

interface SessionState {
  step: string | null;
  event_name: string | null;
  payer_type: string | null;
  payment_method: string | null;
  cart_items: string | null;
  cart_services: string | null;
  registration_type: string | null;
  updated_at: string | null;
  next_action: string | null;
  first_name: string | null;
  last_name: string | null;
}

const getSenderType = (msg: ChatMessage): 'human' | 'ai' => {
  const raw = typeof msg.Sender === 'string' ? msg.Sender : (msg.Sender?.[''] ?? '');
  return raw === 'User' ? 'human' : 'ai';
};

const getMessageContent = (msg: ChatMessage): string => {
  const raw = msg.message;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return String(raw ?? '');
};

export default function AdminChats() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial fetch + realtime
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, created_at, session_id, sender_name, event_id, event_name, Sender, message')
        .order('created_at', { ascending: true });
      if (!error && data) setAllMessages(data as ChatMessage[]);
      setIsLoading(false);
    };
    fetchMessages();

    const channel = supabase
      .channel('chat-messages-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async () => {
          // Refetch all messages on any new insert — reliable regardless of RLS
          const { data } = await supabase
            .from('chat_messages')
            .select('id, created_at, session_id, sender_name, event_id, event_name, Sender, message')
            .order('created_at', { ascending: true });
          if (data) setAllMessages(data as ChatMessage[]);
        }
      )
      .subscribe((status) => setIsLive(status === 'SUBSCRIBED'));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group messages by session_id
  const conversations: ConversationGroup[] = useMemo(() => {
    if (!allMessages.length) return [];
    const grouped = allMessages.reduce((acc: Record<string, ConversationGroup>, msg) => {
      const phone = msg.session_id;
      if (!acc[phone]) {
        acc[phone] = {
          phone_number: phone,
          user_name: msg.sender_name || phone,
          messages: [],
          lastMessage: msg,
        };
      }
      acc[phone].messages.push(msg);
      acc[phone].lastMessage = msg;
      if (msg.sender_name && msg.sender_name !== phone) {
        acc[phone].user_name = msg.sender_name;
      }
      return acc;
    }, {});
    return Object.values(grouped).sort(
      (a, b) =>
        new Date(b.lastMessage.created_at ?? 0).getTime() -
        new Date(a.lastMessage.created_at ?? 0).getTime()
    );
  }, [allMessages]);

  // Distinct events from messages
  const availableEvents = useMemo(() => {
    const seen = new Map<string, string>();
    allMessages.forEach((m) => {
      if (m.event_id && m.event_name) seen.set(m.event_id, m.event_name);
    });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allMessages]);

  // Filter conversations by event
  const filteredConversations = selectedEventId
    ? conversations.filter((conv) =>
        conv.messages.some((m) => m.event_id === selectedEventId)
      )
    : conversations;

  const selectedConversation = filteredConversations.find(
    (c) => c.phone_number === selectedPhone
  );

  // Auto-select first conversation
  useEffect(() => {
    if (filteredConversations.length > 0 && !selectedConversation) {
      setSelectedPhone(filteredConversations[0].phone_number);
    }
  }, [filteredConversations, selectedConversation]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages.length, selectedPhone]);

  // Fetch session state
  const fetchSession = () => {
    if (!selectedPhone) return;
    supabase
      .from('whatsapp_session')
      .select(
        'step, event_name, payer_type, payment_method, cart_items, cart_services, registration_type, updated_at, next_action, first_name, last_name'
      )
      .eq('wa_id', selectedPhone)
      .single()
      .then(({ data }) => setSessionState(data as SessionState | null));
  };

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhone]);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const parseJsonSafe = (str: string | null): string[] => {
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map((i) => (typeof i === 'string' ? i : i.name || i.label || JSON.stringify(i)));
      return [String(parsed)];
    } catch {
      return [str];
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">WhatsApp Inspector</h1>
          <p className="text-muted-foreground">Monitor all WhatsApp conversations with the AI bot</p>
        </div>
        <Card className="h-[calc(100vh-220px)] flex overflow-hidden">
          <div className="w-80 border-r border-border p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <Skeleton className="h-12 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        </Card>
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
              {isLive ? (
                <Badge variant="outline" className="ml-auto text-xs gap-1 border-green-500 text-green-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-auto">
                  {filteredConversations.length}
                </Badge>
              )}
            </div>
          </div>

          {/* Event Filter */}
          {availableEvents.length > 1 && (
            <div className="px-3 py-2 border-b border-border bg-background">
              <Select
                value={selectedEventId || 'all'}
                onValueChange={(val) => setSelectedEventId(val === 'all' ? null : val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {availableEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{allMessages.length === 0 ? 'No messages found. Check that RLS policies allow admin access to chat_messages.' : 'No conversations match this filter'}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => (
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
                            {conv.user_name}
                          </p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDate(conv.lastMessage.created_at)}
                          </span>
                        </div>
                        {!selectedEventId && conv.lastMessage.event_name && (
                          <div className="mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                              {conv.lastMessage.event_name}
                            </Badge>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {getMessageContent(conv.lastMessage)?.substring(0, 40)}...
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {selectedConversation.user_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedConversation.phone_number}
                      </span>
                      {selectedConversation.lastMessage.event_name && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {selectedConversation.lastMessage.event_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSession(!showSession)}
                    className="ml-auto shrink-0"
                  >
                    Session {showSession ? <ChevronRight className="h-4 w-4 ml-1" /> : <ChevronLeft className="h-4 w-4 ml-1" />}
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {selectedConversation.messages.map((msg, index) => {
                      const isBot = getSenderType(msg) === 'ai';
                      const content = getMessageContent(msg);
                      return (
                        <div
                          key={msg.id || index}
                          className={cn('flex', isBot ? 'justify-end' : 'justify-start')}
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
                              {content}
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

                {/* Session State Panel */}
                {showSession && (
                  <div className="w-64 border-l border-border overflow-y-auto bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Session State</h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchSession}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    {sessionState ? (
                      <div className="space-y-3 text-xs">
                        <SessionRow label="Step">
                          {sessionState.step ? <Badge variant="secondary" className="text-[10px]">{sessionState.step}</Badge> : <span className="text-muted-foreground">—</span>}
                        </SessionRow>
                        <SessionRow label="Event">{sessionState.event_name || '—'}</SessionRow>
                        <SessionRow label="Name">
                          {[sessionState.first_name, sessionState.last_name].filter(Boolean).join(' ') || '—'}
                        </SessionRow>
                        <SessionRow label="Payer Type">{sessionState.payer_type || '—'}</SessionRow>
                        <SessionRow label="Payment">{sessionState.payment_method || '—'}</SessionRow>
                        <SessionRow label="Reg. Type">{sessionState.registration_type || '—'}</SessionRow>
                        <SessionRow label="Cart Items">
                          {parseJsonSafe(sessionState.cart_items).length > 0
                            ? parseJsonSafe(sessionState.cart_items).map((item, i) => (
                                <span key={i} className="block text-muted-foreground">{item}</span>
                              ))
                            : '—'}
                        </SessionRow>
                        <SessionRow label="Services">
                          {parseJsonSafe(sessionState.cart_services).length > 0
                            ? parseJsonSafe(sessionState.cart_services).map((item, i) => (
                                <span key={i} className="block text-muted-foreground">{item}</span>
                              ))
                            : '—'}
                        </SessionRow>
                        <SessionRow label="Next Action">
                          {sessionState.next_action ? (
                            <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-300" variant="outline">
                              {sessionState.next_action}
                            </Badge>
                          ) : '—'}
                        </SessionRow>
                        <SessionRow label="Updated">{formatRelativeTime(sessionState.updated_at)}</SessionRow>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No active session</p>
                    )}
                  </div>
                )}
              </div>
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

function SessionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground mb-0.5">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
