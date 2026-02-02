'use client';

import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    link?: string;
}

export function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        } else {
            // Poll for count occasionally? Or just fetch on mount
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
                setUnreadCount(data.notifications.filter((n: Notification) => !n.isRead).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications');
        }
    };

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                body: JSON.stringify({}),
            });
            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark read');
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border border-background" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-2">
                    <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                                e.preventDefault();
                                markAllRead();
                            }}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className="flex flex-col items-start p-4 space-y-1 cursor-pointer"
                            >
                                <div className="flex items-start justify-between w-full">
                                    <span className={cn("font-medium text-sm", !notification.isRead && "text-brand-purple")}>
                                        {notification.title}
                                    </span>
                                    {notification.isRead && <Check className="h-3 w-3 text-muted-foreground" />}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {notification.message}
                                </p>
                                <div className="text-[10px] text-muted-foreground/60 w-full text-right mt-1">
                                    {new Date(notification.createdAt).toLocaleDateString()}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu >
    );
}
