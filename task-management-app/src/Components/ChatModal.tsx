import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreVertical, CheckCheck, Check } from 'lucide-react';
import { chatService } from '../Services/Chat.service';
import type { ChatMessage } from '../Services/Chat.service';
import { userAvatarUrl } from '../utils/avatar';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedUser: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
        role?: string;
    } | null;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, selectedUser }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [imgError, setImgError] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && selectedUser) {
            setImgError(false);
            loadChatHistory();
            checkOnlineStatus();
            inputRef.current?.focus();
        }
    }, [isOpen, selectedUser]);

    const checkOnlineStatus = async () => {
        if (!selectedUser) return;
        try {
            const onlineUsersList = await chatService.getOnlineUsers();
            setIsOnline(onlineUsersList.includes(selectedUser.id));
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleNewMessage = (message: ChatMessage) => {
            if (
                (message.senderId === selectedUser?.id && message.receiverId === chatService.getCurrentUser()?.id) ||
                (message.senderId === chatService.getCurrentUser()?.id && message.receiverId === selectedUser?.id)
            ) {
                setMessages(prev => [...prev, message]);
                if (message.senderId === selectedUser?.id) {
                    chatService.markMessageAsRead(message.id);
                }
            }
        };

        const handleUserStatusChange = (data: { userId: string; online: boolean }) => {
            if (data.userId === selectedUser?.id) {
                setIsOnline(data.online);
            }
        };

        const unsubscribeNewMessage = chatService.onNewMessage(handleNewMessage);
        const unsubscribeStatus = chatService.onUserStatusChange(handleUserStatusChange);

        return () => {
            unsubscribeNewMessage?.();
            unsubscribeStatus?.();
        };
    }, [isOpen, selectedUser]);

    const loadChatHistory = async () => {
        if (!selectedUser) return;
        setLoading(true);
        try {
            const history = await chatService.getChatHistory(selectedUser.id);
            const normalized = history.map((m) => ({
                ...m,
                timestamp: new Date(m.timestamp as any),
            }));
            setMessages(normalized.reverse());
        } catch (error) {
            console.error('Failed to load chat history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedUser || sending) return;
        setSending(true);
        try {
            const message = await chatService.sendMessage(selectedUser.id, newMessage.trim());
            setMessages(prev => [...prev, message]);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date: Date) => {
        const today = new Date();
        const messageDate = new Date(date);

        if (messageDate.toDateString() === today.toDateString()) {
            return 'Today';
        }

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (messageDate.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }

        return messageDate.toLocaleDateString();
    };

    const groupMessagesByDate = (messages: ChatMessage[]) => {
        const groups: { [date: string]: ChatMessage[] } = {};
        messages.forEach(message => {
            const date = formatDate(message.timestamp);
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
        });
        return groups;
    };

    if (!isOpen || !selectedUser) return null;

    const messageGroups = groupMessagesByDate(messages);
    const currentUser = chatService.getCurrentUser();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className={`bg-white rounded-lg shadow-xl w-full max-w-md h-[500px] flex flex-col`}>
                {/* Header - Compact */}
                <div className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-gray-600" />
                        </button>

                        <div className="relative">
                            {selectedUser.avatar && !imgError ? (
                                <img
                                    src={userAvatarUrl(selectedUser)}
                                    alt={selectedUser.name}
                                    onError={() => setImgError(true)}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                />
                            ) : (
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200"
                                    style={{ backgroundColor: theme.primaryUltralight }}
                                >
                                    <span 
                                        className="text-[12px] font-bold"
                                        style={{ color: theme.primary }}
                                    >
                                        {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                                    </span>
                                </div>
                            )}
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-sm text-gray-900">{selectedUser.name}</h3>
                            <p className="text-[10px] text-gray-500">
                                {isOnline ? 'Online' : 'Offline'} • {selectedUser.role?.toUpperCase() || 'User'}
                            </p>
                        </div>
                    </div>

                    <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                </div>

                {/* Messages - Compact */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32">
                            <p className="text-xs text-gray-500">No messages yet</p>
                            <p className="text-[10px] text-gray-400">Start a conversation!</p>
                        </div>
                    ) : (
                        Object.entries(messageGroups).map(([date, dateMessages]) => (
                            <div key={date}>
                                <div className="flex items-center justify-center my-3">
                                    <div className="bg-gray-200 px-2 py-0.5 rounded-full">
                                        <span className="text-[9px] text-gray-600">{date}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {dateMessages.map((message) => {
                                        const isFromMe = message.senderId === currentUser?.id;
                                        return (
                                            <div
                                                key={message.id}
                                                className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[75%] ${isFromMe ? 'order-2' : 'order-1'}`}>
                                                    {!isFromMe && (
                                                        <p className="text-[9px] text-gray-500 mb-0.5">{message.senderName}</p>
                                                    )}
                                                    <div
                                                        className={`px-3 py-1.5 rounded-lg text-[11px] ${
                                                            isFromMe
                                                                ? `bg-[${theme.primary}] text-white`
                                                                : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                                                        }`}
                                                    >
                                                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                                    </div>
                                                    <div className={`flex items-center gap-1 mt-0.5 text-[9px] text-gray-400 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                                                        <span>{formatTime(message.timestamp)}</span>
                                                        {isFromMe && (
                                                            <span>
                                                                {message.read ? (
                                                                    <CheckCheck className="w-2.5 h-2.5 text-blue-500" />
                                                                ) : (
                                                                    <Check className="w-2.5 h-2.5" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input - Compact */}
                <div className="p-3 border-t border-gray-100 bg-white">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message..."
                            className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={sending}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending}
                            className={`px-3 py-1.5 rounded-full transition-colors flex items-center justify-center ${
                                !newMessage.trim() || sending
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                            }`}
                        >
                            {sending ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                            ) : (
                                <Send className="w-3.5 h-3.5 text-white" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;