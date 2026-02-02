'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { createSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';

interface Message {
    id: string;
    content: string;
    user_id: string;
    user_name: string;
    channel_id: string;
    reply_to_id?: string | null;
    created_at: string;
}

export function ChatWindow({ channelId }: { channelId: string }) {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let supabase: any;

        const setupSupabase = async () => {
            const token = await getToken({ template: 'supabase' });
            // Note: If token is missing, check Clerk Dashboard -> JWT Templates -> 'supabase'
            supabase = createSupabaseClient(token || undefined);

            // 1. Fetch Initial Messages
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('channel_id', channelId)
                .order('created_at', { ascending: true });

            if (error) console.error('Fetch messages error:', error);
            if (data) setMessages(data);
            setIsLoading(false);

            // 2. Subscribe to new messages & deletes
            const channel = supabase
                .channel(`chat:${channelId}`)
                .on('postgres_changes', {
                    event: '*', // Listen to ALL events (INSERT, DELETE, UPDATE)
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`
                }, (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new as Message;
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev; // Dedup
                            return [...prev, newMsg];
                        });
                        // Auto scroll
                        if (scrollRef.current) {
                            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupSupabase();
    }, [getToken, channelId]);

    // Scroll to bottom on load/new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const [pendingMessages, setPendingMessages] = useState<Message[]>([]);

    // ...

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const tempId = `temp-${Date.now()}`;
        const msgContent = newMessage;
        const msgReplyTo = replyingTo?.id || null;

        const optimisticMsg: Message = {
            id: tempId,
            content: msgContent,
            user_id: user.id,
            user_name: user.fullName || user.primaryEmailAddress?.emailAddress || 'User',
            channel_id: channelId,
            reply_to_id: msgReplyTo,
            created_at: new Date().toISOString()
        };

        // 1. Optimistic Update
        setPendingMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setReplyingTo(null);

        // Scroll
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);

        const token = await getToken({ template: 'supabase' });
        const supabase = createSupabaseClient(token || undefined);

        const msgPayload = {
            content: msgContent,
            user_id: user.id,
            user_name: user.fullName || user.primaryEmailAddress?.emailAddress || 'Anonymous',
            channel_id: channelId,
            reply_to_id: msgReplyTo
        };

        const { data, error } = await supabase
            .from('messages')
            .insert(msgPayload)
            .select()
            .single();

        if (error) {
            console.error('Send message error:', error);
            alert(`Error sending: ${error.message}`);
            // Rollback
            setPendingMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(msgContent); // Restore text
        } else if (data) {
            // Success: Add real message to state immediately (Client-side confirmation)
            setMessages(prev => {
                // Prevent duplicates if Realtime already added it (unlikely this fast, but safe)
                if (prev.some(m => m.id === data.id)) return prev;
                return [...prev, data as Message];
            });
            // Remove optimistic message
            setPendingMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    // Effect to clean up pending messages when they appear in real messages
    useEffect(() => {
        if (pendingMessages.length === 0) return;

        const newMessagesIds = new Set(messages.map(m => m.content + m.created_at)); // fuzzy match or better?
        // Actually, realtime event gives us the exact row.
        // Let's just clear pending messages that match content of new real messages

        setPendingMessages(prev => prev.filter(p =>
            !messages.some(m => m.content === p.content && m.user_id === p.user_id)
        ));
    }, [messages]);

    const handleDelete = async (messageId: string) => {
        if (!confirm('Delete this message?')) return;
        const token = await getToken({ template: 'supabase' });
        const supabase = createSupabaseClient(token || undefined);

        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('Delete error:', error);
            alert('Failed to delete message');
        }
    };

    return (
        <div className="flex flex-col h-[500px] border rounded-lg bg-background">
            <div className="p-4 border-b">
                <h3 className="font-semibold">Team Chat</h3>
            </div>

            <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => {
                            const isMe = msg.user_id === user?.id;
                            const replyParent = messages.find(m => m.id === msg.reply_to_id);

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        {/* Reply Context */}
                                        {replyParent && (
                                            <div className="mb-2 p-1 border-l-2 border-white/30 text-xs opacity-70 bg-black/10 rounded">
                                                <strong>{replyParent.user_name}</strong>: {replyParent.content.substring(0, 30)}...
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <p className="text-xs opacity-70 mb-1 font-bold">{msg.user_name}</p>
                                                <p className="text-sm">{msg.content}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setReplyingTo(msg)} className="hover:underline">Reply</button>
                                        {isMe && (
                                            <button onClick={() => handleDelete(msg.id)} className="text-red-500 hover:underline">Delete</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pending Messages (Optimistic UI) */}
                        {pendingMessages.map((msg) => (
                            <div key={msg.id} className="flex flex-col items-end opacity-70">
                                <div className="max-w-[70%] rounded-lg p-3 bg-primary text-primary-foreground">
                                    {msg.reply_to_id && (
                                        <div className="mb-2 p-1 border-l-2 border-white/30 text-xs opacity-70 bg-black/10 rounded">
                                            Reply...
                                        </div>
                                    )}
                                    <p className="text-sm">{msg.content}</p>
                                </div>
                                <span className="text-xs text-muted-foreground">Sending...</span>
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>
                )}
            </ScrollArea>

            {replyingTo && (
                <div className="px-4 py-2 bg-muted/50 border-t flex justify-between items-center text-sm">
                    <span>Replying to <strong>{replyingTo.user_name}</strong></span>
                    <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
            )}

            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                    className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
