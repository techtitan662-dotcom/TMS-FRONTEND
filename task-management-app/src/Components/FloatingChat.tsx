import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Search, User, Users } from 'lucide-react';
import { authService } from '../Services/User.Services';
import { chatService } from '../Services/Chat.service';

// Theme colors matching the app
const theme = {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#60a5fa',
    primaryLighter: '#93c5fd',
    primaryUltralight: '#dbeafe',
};

interface CompanyUser {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    isOnline?: boolean;
}

interface FloatingChatProps {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    primaryColor?: string;
    title?: string;
    placeholder?: string;
    onUserSelect?: (user: CompanyUser) => void;
    isOpen?: boolean;
    onToggle?: () => void;
    unreadCounts?: Record<string, number>;
    lastMessageAt?: Record<string, string>;
}

const FloatingChat: React.FC<FloatingChatProps> = ({
    position = 'bottom-right',
    title = 'Company Chat',
    placeholder = 'Search users...',
    onUserSelect,
    isOpen: controlledIsOpen,
    onToggle,
    unreadCounts,
    lastMessageAt
}) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const getPositionClasses = () => {
        switch (position) {
            case 'bottom-right': return 'bottom-16 lg:bottom-5 right-5';
            case 'bottom-left': return 'bottom-16 lg:bottom-5 left-5';
            case 'top-right': return 'top-5 right-5';
            case 'top-left': return 'top-5 left-5';
            default: return 'bottom-16 lg:bottom-5 right-5';
        }
    };

    const getChatPositionClasses = () => {
        switch (position) {
            case 'bottom-right': return 'bottom-28 lg:bottom-16 right-0';
            case 'bottom-left': return 'bottom-28 lg:bottom-16 left-0';
            case 'top-right': return 'top-16 right-0';
            case 'top-left': return 'top-16 left-0';
            default: return 'bottom-28 lg:bottom-16 right-0';
        }
    };

    const fetchCompanyUsers = async () => {
        setLoading(true);
        try {
            const currentUserResponse = await authService.getCurrentUser();
            if (!currentUserResponse?.success || !currentUserResponse?.data) {
                console.error('Could not fetch current user');
                return;
            }

            const currentUserData = currentUserResponse.data;
            const userCompany = currentUserData.companyName || currentUserData.company;
            const currentRole = String(currentUserData.role || '').trim().toLowerCase();
            const isAdminLike = currentRole === 'admin' || currentRole === 'super_admin';

            if (!isAdminLike && !userCompany) {
                console.warn('Current user has no company specified');
                setUsers([]);
                return;
            }

            const [response, onlineUsersList] = await Promise.all([
                authService.getAllUsers(),
                chatService.getOnlineUsers().catch(() => [])
            ]);
            const onlineSet = new Set(onlineUsersList);

            if (response?.success && response?.data) {
                const userList = response.data
                    .filter((user: any) => {
                        const role = String(user?.role || '').trim().toLowerCase();
                        const targetIsAdminLike = role === 'admin' || role === 'super_admin';
                        if (isAdminLike) return true;
                        if (targetIsAdminLike) return true;
                        const userCompanyToCheck = user.companyName || user.company;
                        return userCompanyToCheck && userCompanyToCheck.toLowerCase() === String(userCompany).toLowerCase();
                    })
                    .map((user: any) => ({
                        id: user._id || user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar,
                        isOnline: onlineSet.has(String(user._id || user.id))
                    }));

                setUsers(userList);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const response = await authService.getCurrentUser();
            if (response?.success && response?.data) {
                setCurrentUser(response.data);
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCompanyUsers();
            fetchCurrentUser();
        }
    }, [isOpen]);

    useEffect(() => {
        const unsub = chatService.onUserStatusChange(({ userId, online }) => {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isOnline: online } : u));
        });
        return () => unsub?.();
    }, []);

    const handleToggle = () => {
        if (isControlled && onToggle) {
            onToggle();
        } else {
            setInternalIsOpen(!internalIsOpen);
        }
        setSearchQuery('');
    };

    const handleUserClick = (user: CompanyUser) => {
        if (onUserSelect) {
            onUserSelect(user);
        }
        handleToggle();
    };

    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase();
        return (
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        );
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        const aTs = lastMessageAt?.[String(a.id)] ? Date.parse(String(lastMessageAt[String(a.id)])) : 0;
        const bTs = lastMessageAt?.[String(b.id)] ? Date.parse(String(lastMessageAt[String(b.id)])) : 0;
        return bTs - aTs;
    });

    const getRoleColor = (role: string) => {
        const roleColors: { [key: string]: string } = {
            'admin': 'bg-purple-100 text-purple-700',
            'md_manager': `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}]`,
            'ob_manager': `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}]`,
            'manager': `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}]`,
            'sbm': 'bg-amber-100 text-amber-700',
            'rm': 'bg-amber-100 text-amber-700',
            'am': 'bg-amber-100 text-amber-700',
            'assistant': 'bg-green-100 text-green-700',
            'sub_assistance': 'bg-green-100 text-green-700'
        };
        return roleColors[role.toLowerCase()] || 'bg-gray-100 text-gray-700';
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (!isOpen) {
        return (
            <div className={`fixed z-50 ${getPositionClasses()}`}>
                <button
                    onClick={handleToggle}
                    className="relative flex items-center justify-center w-10 h-10 text-white rounded-full shadow-md transition-all duration-300 hover:scale-105 group"
                    style={{ backgroundColor: theme.primary }}
                >
                    <MessageCircle className="w-4 h-4" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 border border-white rounded-full animate-pulse"></span>
                    <div className="absolute bottom-full mb-1 px-2 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {title}
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed z-50 ${getChatPositionClasses()} w-72 h-[420px]`}>
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 h-full flex flex-col overflow-hidden">
                {/* Header - Blue */}
                <div 
                    className="flex items-center justify-between px-3 py-2 text-white"
                    style={{ backgroundColor: theme.primary }}
                >
                    <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <h3 className="font-semibold text-xs">{title}</h3>
                        <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">
                            {users.length}
                        </span>
                    </div>
                    <button
                        onClick={handleToggle}
                        className="p-0.5 hover:bg-white/20 rounded transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={placeholder}
                            className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[11px]"
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-24">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                            <User className="w-6 h-6 mb-1" />
                            <p className="text-[10px]">
                                {searchQuery ? 'No users found' : 'No users available'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {sortedUsers.map((user) => {
                                const isCurrentUser = currentUser?.email === user.email;
                                const unread = unreadCounts?.[String(user.id)] || 0;
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => !isCurrentUser && handleUserClick(user)}
                                        className={`flex items-center p-2 hover:bg-gray-50 transition-colors ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            {user.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full bg-[${theme.primaryUltralight}] flex items-center justify-center`}>
                                                    <span className="text-[10px] font-medium text-[${theme.primary}]">
                                                        {getInitials(user.name)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${user.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        </div>

                                        {/* User Info */}
                                        <div className="ml-2 flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="text-[11px] font-medium text-gray-900 truncate">
                                                    {user.name}
                                                    {isCurrentUser && <span className="ml-1 text-[9px] text-gray-400">(You)</span>}
                                                </p>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {unread > 0 && (
                                                        <span className="min-w-[16px] h-4 px-1 flex items-center justify-center text-[8px] font-semibold bg-red-500 text-white rounded-full">
                                                            {unread > 99 ? '99+' : unread}
                                                        </span>
                                                    )}
                                                    <span className={`px-1.5 py-0.5 text-[8px] font-medium rounded-full ${getRoleColor(user.role)}`}>
                                                        {user.role.split('_')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-gray-400 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-2 py-1.5 border-t border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <p className="text-[8px] text-gray-500 text-center flex items-center justify-center gap-1">
                        <Users className="w-2.5 h-2.5" />
                        {users.filter(u => u.isOnline).length} online • {users.length} total
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FloatingChat;