import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    User,
    Mail,
    Calendar,
    CheckCircle,
    Edit,
    Shield,
    Briefcase,
    Phone,
} from 'lucide-react';

import type { UserType } from '../Types/Types';
import apiClient from '../Services/apiClient';
import { authService } from '../Services/User.Services';
import { UserProfileSkeleton } from '../Components/LoadingSkeletons';
import { userAvatarUrl } from '../utils/avatar';
import { getNotificationPermission, registerPushDevice } from '../utils/fcm';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

interface UserProfilePageProps {
    user?: UserType;
    formatDate?: (dateString: string) => string;
    onUserUpdated?: (user: UserType) => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({
    user = {} as UserType,
    formatDate = (d) => d,
    onUserUpdated,
}) => {
    const [resolvedUser, setResolvedUser] = useState<UserType | null>(null);
    const [resolvedUserLoading, setResolvedUserLoading] = useState(false);
    const [googleStatusLoading, setGoogleStatusLoading] = useState(false);
    const [googleActionLoading, setGoogleActionLoading] = useState(false);
    const [googleConnected, setGoogleConnected] = useState<boolean>(false);
    const [googleConnectedAt, setGoogleConnectedAt] = useState<string | null>(null);

    const [pushPermission, setPushPermission] = useState<string>('default');
    const [pushRegistering, setPushRegistering] = useState(false);

    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const hasUserProp = useMemo(() => {
        return Boolean(user && Object.keys(user).length > 0);
    }, [user]);

    const profileUser = useMemo(() => {
        return hasUserProp ? user : resolvedUser;
    }, [hasUserProp, resolvedUser, user]);

    const isOwnProfile = useMemo(() => {
        const profileEmail = (profileUser as any)?.email ? String((profileUser as any).email).trim().toLowerCase() : '';
        if (!profileEmail) return false;
        try {
            const cached = localStorage.getItem('currentUser');
            if (!cached) return false;
            const parsed = JSON.parse(cached);
            const meEmail = parsed?.email ? String(parsed.email).trim().toLowerCase() : '';
            return Boolean(meEmail && meEmail === profileEmail);
        } catch {
            return false;
        }
    }, [profileUser]);

    const avatarUrl = useMemo(() => {
        return userAvatarUrl(profileUser);
    }, [profileUser]);

    const roleLabel = useMemo(() => {
        const raw = (profileUser as any)?.role;
        const key = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        if (!key) return '';
        if (key === 'super_admin') return 'Super Admin';
        if (key === 'admin') return 'Admin';
        if (key === 'md_manager') return 'MD Manager';
        if (key === 'ob_manager') return 'OB Manager';
        if (key === 'manager') return 'Manager';
        if (key === 'sbm') return 'SBM';
        if (key === 'rm') return 'RM';
        if (key === 'am') return 'AM';
        if (key === 'assistant') return 'Assistant';
        if (key === 'sub_assistance' || key === 'sub_assistence') return 'Sub Assistance';
        return String(raw || '').toString().trim();
    }, [profileUser]);

    const getRoleBadgeColor = (role: string) => {
        const r = (role || '').toLowerCase();
        switch (r) {
            case 'super_admin':
            case 'admin':
                return 'bg-purple-100 text-purple-800';
            case 'md_manager':
            case 'ob_manager':
            case 'manager':
                return `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}]`;
            case 'sbm':
            case 'rm':
            case 'am':
                return 'bg-amber-100 text-amber-800';
            case 'assistant':
            case 'sub_assistance':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleIcon = (role: string) => {
        const r = (role || '').toLowerCase();
        if (r === 'super_admin' || r === 'admin') return <Shield className="h-3 w-3" />;
        if (r === 'md_manager' || r === 'ob_manager' || r === 'manager') return <Briefcase className="h-3 w-3" />;
        return <User className="h-3 w-3" />;
    };

    const isPlaceholderUser = useMemo(() => {
        const name = (user as any)?.name;
        if (!name) return false;
        return String(name).trim().toLowerCase() === 'loading...';
    }, [user]);

    const googleCallbackStatus = useMemo(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('google');
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        if (!googleCallbackStatus) return;

        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('google');
            url.searchParams.delete('reason');

            const nextSearch = url.searchParams.toString();
            const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash || ''}`;
            window.history.replaceState({}, document.title, nextUrl);
        } catch {
            return;
        }
    }, [googleCallbackStatus]);

    const fetchGoogleStatus = useCallback(async () => {
        setGoogleStatusLoading(true);
        try {
            const res = await apiClient.get('/google/status');
            const connected = Boolean(res?.data?.connected);
            setGoogleConnected(connected);
            setGoogleConnectedAt(res?.data?.connectedAt || null);
        } catch {
            setGoogleConnected(false);
            setGoogleConnectedAt(null);
        } finally {
            setGoogleStatusLoading(false);
        }
    }, []);

    useEffect(() => {
        const resolveCurrentUser = async () => {
            if (hasUserProp) return;

            setResolvedUserLoading(true);
            try {
                try {
                    const cached = localStorage.getItem('currentUser');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed && typeof parsed === 'object') {
                            setResolvedUser(parsed as UserType);
                            return;
                        }
                    }
                } catch {}

                const current = await authService.getCurrentUser();
                if (current?.success && current.data) {
                    setResolvedUser(current.data);
                    try {
                        localStorage.setItem('currentUser', JSON.stringify(current.data));
                    } catch {}
                }
            } finally {
                setResolvedUserLoading(false);
            }
        };

        resolveCurrentUser();
    }, [hasUserProp]);

    useEffect(() => {
        setPushPermission(getNotificationPermission());
    }, []);

    useEffect(() => {
        fetchGoogleStatus();
    }, [fetchGoogleStatus]);

    const handleConnectGoogle = useCallback(async () => {
        setGoogleActionLoading(true);
        try {
            const res = await apiClient.get('/google/auth-url');
            const url = res?.data?.url;
            if (url && typeof url === 'string') {
                window.location.href = url;
            }
        } finally {
            setGoogleActionLoading(false);
        }
    }, []);

    const handleDisconnectGoogle = useCallback(async () => {
        setGoogleActionLoading(true);
        try {
            await apiClient.post('/google/disconnect');
            await fetchGoogleStatus();
        } finally {
            setGoogleActionLoading(false);
        }
    }, [fetchGoogleStatus]);

    const handleEnableNotifications = useCallback(async () => {
        setPushRegistering(true);
        try {
            const result = await registerPushDevice({ prompt: true, userEmail: profileUser?.email });
            setPushPermission(getNotificationPermission());
            if (result.token) {
                // Success
            }
        } finally {
            setPushRegistering(false);
        }
    }, [profileUser?.email]);

    const handleSelectAvatarFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
        setAvatarFile(file);
    }, []);

    const handleUploadAvatar = useCallback(async () => {
        if (!avatarFile) return;
        setAvatarUploading(true);
        try {
            const res = await authService.uploadProfileAvatar(avatarFile);
            if (!res?.success || !res.data) return;

            try {
                localStorage.setItem('currentUser', JSON.stringify(res.data));
            } catch {}

            if (!hasUserProp) {
                setResolvedUser(res.data as UserType);
            }

            if (typeof onUserUpdated === 'function') {
                onUserUpdated(res.data as UserType);
            }

            setShowAvatarModal(false);
            setAvatarFile(null);
        } finally {
            setAvatarUploading(false);
        }
    }, [avatarFile, hasUserProp, onUserUpdated]);

    const handleRemoveAvatar = useCallback(async () => {
        setAvatarUploading(true);
        try {
            const res = await authService.removeProfileAvatar();
            if (!res?.success || !res.data) return;

            try {
                localStorage.setItem('currentUser', JSON.stringify(res.data));
            } catch {}

            if (!hasUserProp) {
                setResolvedUser(res.data as UserType);
            }

            if (typeof onUserUpdated === 'function') {
                onUserUpdated(res.data as UserType);
            }

            setShowAvatarModal(false);
            setAvatarFile(null);
        } finally {
            setAvatarUploading(false);
        }
    }, [hasUserProp, onUserUpdated]);

    const shouldShowInitialSkeleton = useMemo(() => {
        if (hasUserProp) return false;
        if (resolvedUserLoading) return false;
        return resolvedUser === null;
    }, [hasUserProp, resolvedUser, resolvedUserLoading]);

    if (resolvedUserLoading || shouldShowInitialSkeleton || isPlaceholderUser) {
        return <UserProfileSkeleton />;
    }

    if (!profileUser || Object.keys(profileUser).length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-900">User not found</h2>
                    <p className="text-xs text-gray-600 mt-1">Please select a user to view their profile.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gray-50 p-3 md:p-4">
            <div className="w-full max-w-7xl mx-auto space-y-4">
                {/* Header Section - Compact */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 bg-gradient-to-r from-[${theme.primaryDark}] to-[${theme.primary}] rounded-lg`}>
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">
                                {profileUser.name}'s Profile
                            </h1>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                                View profile information and activity
                            </p>
                        </div>
                    </div>
                </div>

                {/* Profile Content - Compact Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left Column - Profile Information */}
                    <div className="lg:col-span-8">
                        {/* Profile Card */}
                        <div className={`bg-white rounded-lg shadow-sm overflow-hidden`}>
                            <div className="p-4">
                                {/* User Header - Compact */}
                                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-5">
                                    {/* Avatar */}
                                    <div className="relative">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={profileUser.name}
                                                className="w-20 h-20 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className={`w-20 h-20 rounded-lg bg-gradient-to-br from-[${theme.primaryDark}] to-[${theme.primary}] flex items-center justify-center text-white text-2xl font-bold`}>
                                                {profileUser.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full">
                                            <CheckCircle className="h-3 w-3" />
                                        </div>

                                        {isOwnProfile && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAvatarModal(true)}
                                                className="absolute -top-1 -right-1 bg-white text-gray-700 p-1 rounded-full shadow hover:bg-gray-50"
                                                title="Edit profile picture"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Basic Info */}
                                    <div className="flex-1">
                                        <h2 className="text-base font-bold text-gray-900 mb-1">
                                            {profileUser.name}
                                        </h2>
                                        {roleLabel && (
                                            <div className="mb-1">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${getRoleBadgeColor(roleLabel)}`}>
                                                    {getRoleIcon(roleLabel)}
                                                    {roleLabel}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                                            <span className="flex items-center gap-0.5">
                                                <Calendar className="h-3 w-3" />
                                                Member since {formatDate(profileUser.joinDate || new Date().toISOString())}
                                            </span>
                                        </div>
                                        {profileUser.department && (
                                            <div className="mt-1">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full">
                                                    <Briefcase className="h-3 w-3" />
                                                    {profileUser.department}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Information - Compact */}
                                <div className="mb-5">
                                    <h3 className="text-xs font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-200">
                                        Contact Information
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className={`flex items-start gap-3 p-3 bg-[${theme.primaryUltralight}] rounded-lg`}>
                                            <div className={`p-1.5 bg-[${theme.primaryLight}]/20 rounded-lg`}>
                                                <Mail className="h-3.5 w-3.5 text-[${theme.primaryDark}]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-gray-500 mb-0.5">Email Address</p>
                                                <p className="text-xs font-medium text-gray-900 break-all">{profileUser.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Google Calendar - Compact */}
                                <div className="mb-5">
                                    <h3 className="text-xs font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-200">
                                        Google Calendar
                                    </h3>
                                    <div className={`p-3 bg-[${theme.primaryUltralight}] rounded-lg`}>
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] text-gray-500 mb-0.5">Connection Status</p>
                                                <p className="text-xs font-medium text-gray-900">
                                                    {googleStatusLoading
                                                        ? 'Checking...'
                                                        : googleConnected
                                                            ? 'Connected'
                                                            : 'Not connected'}
                                                </p>
                                                {googleConnectedAt && (
                                                    <p className="text-[9px] text-gray-500 mt-0.5">
                                                        Connected {formatDate(googleConnectedAt)}
                                                    </p>
                                                )}
                                                {googleCallbackStatus && (
                                                    <p className="text-[9px] text-gray-500 mt-0.5">
                                                        Last connect: {googleCallbackStatus}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {googleConnected ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleDisconnectGoogle}
                                                        disabled={googleActionLoading}
                                                        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-[10px] font-medium hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        Disconnect
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleConnectGoogle}
                                                        disabled={googleActionLoading}
                                                        className={`px-3 py-1.5 rounded-lg bg-[${theme.primary}] text-white text-[10px] font-medium hover:bg-[${theme.primaryDark}] disabled:opacity-50`}
                                                    >
                                                        Connect Google Calendar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Push Notifications Section */}
                                {isOwnProfile && (
                                    <div className="mb-5">
                                        <h3 className="text-xs font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-200">
                                            Push Notifications
                                        </h3>
                                        <div className={`p-3 bg-[${theme.primaryUltralight}] rounded-lg`}>
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 mb-0.5">Status</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-xs font-medium ${pushPermission === 'granted' ? 'text-emerald-700' : pushPermission === 'denied' ? 'text-red-700' : 'text-gray-900'}`}>
                                                            {pushPermission === 'granted'
                                                                ? 'Enabled'
                                                                : pushPermission === 'denied'
                                                                    ? 'Blocked'
                                                                    : pushPermission === 'unsupported'
                                                                        ? 'Not supported on this browser'
                                                                        : 'Not enabled'}
                                                        </p>
                                                        {pushPermission === 'granted' && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 mt-0.5">
                                                        Receive updates for new tasks and reminders on your device.
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                                                        <button
                                                            type="button"
                                                            onClick={handleEnableNotifications}
                                                            disabled={pushRegistering}
                                                            className={`px-3 py-1.5 rounded-lg bg-[${theme.primary}] text-white text-[10px] font-medium hover:bg-[${theme.primaryDark}] disabled:opacity-50 flex items-center gap-1.5`}
                                                        >
                                                            {pushRegistering ? (
                                                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            ) : null}
                                                            Enable Notifications
                                                        </button>
                                                    )}
                                                    {pushPermission === 'granted' && (
                                                        <button
                                                            type="button"
                                                            onClick={handleEnableNotifications}
                                                            disabled={pushRegistering}
                                                            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-[10px] font-medium hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            Refresh Token
                                                        </button>
                                                    )}
                                                    {pushPermission === 'denied' && (
                                                        <p className="text-[9px] text-red-600 font-medium text-right">
                                                            Blocked in browser settings.<br/>Please enable manually.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Additional Info if available */}
                                {(profileUser.position || profileUser.phone) && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-200">
                                            Additional Information
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {profileUser.position && (
                                                <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                    <Briefcase className="h-3 w-3 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <p className="text-[9px] text-gray-500">Position</p>
                                                        <p className="text-[10px] font-medium text-gray-900">{profileUser.position}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {profileUser.phone && (
                                                <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                    <Phone className="h-3 w-3 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <p className="text-[9px] text-gray-500">Phone</p>
                                                        <p className="text-[10px] font-medium text-gray-900">{profileUser.phone}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Summary Card - Compact */}
                    <div className="lg:col-span-4">
                        <div className={`bg-gradient-to-br from-[${theme.primaryDark}] to-[${theme.primary}] rounded-lg p-4 text-white shadow-sm`}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <User className="h-3.5 w-3.5" />
                                </div>
                                <h3 className="text-xs font-semibold">Profile Overview</h3>
                            </div>

                            <div className="space-y-2.5">
                                <div>
                                    <p className="text-blue-100 text-[9px] mb-0.5">Full Name</p>
                                    <p className="text-xs font-medium truncate">{profileUser.name}</p>
                                </div>
                                <div>
                                    <p className="text-blue-100 text-[9px] mb-0.5">Email</p>
                                    <p className="text-xs font-medium truncate">{profileUser.email}</p>
                                </div>
                                {profileUser.department && (
                                    <div>
                                        <p className="text-blue-100 text-[9px] mb-0.5">Department</p>
                                        <p className="text-xs font-medium">{profileUser.department}</p>
                                    </div>
                                )}
                                {profileUser.position && (
                                    <div>
                                        <p className="text-blue-100 text-[9px] mb-0.5">Position</p>
                                        <p className="text-xs font-medium">{profileUser.position}</p>
                                    </div>
                                )}
                                {roleLabel && (
                                    <div>
                                        <p className="text-blue-100 text-[9px] mb-0.5">Role</p>
                                        <p className="text-xs font-medium">{roleLabel}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 pt-3 border-t border-blue-400">
                                <p className="text-[9px] text-blue-100">
                                    Profile information is read-only
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Avatar Modal - Compact */}
            {showAvatarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowAvatarModal(false)} />
                    <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
                        <div className={`px-4 py-3 border-b border-gray-200 bg-[${theme.primaryUltralight}]`}>
                            <h3 className="text-sm font-semibold text-gray-900">Update Profile Picture</h3>
                        </div>
                        <div className="px-4 py-4 space-y-3">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleSelectAvatarFile}
                                disabled={avatarUploading}
                                className="text-xs w-full"
                            />
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[10px] font-medium hover:bg-red-100 disabled:opacity-50"
                                    disabled={avatarUploading}
                                >
                                    Remove
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAvatarModal(false);
                                        setAvatarFile(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-[10px] font-medium hover:bg-gray-50"
                                    disabled={avatarUploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUploadAvatar}
                                    className={`px-3 py-1.5 rounded-lg bg-[${theme.primary}] text-white text-[10px] font-medium hover:bg-[${theme.primaryDark}] disabled:opacity-50`}
                                    disabled={!avatarFile || avatarUploading}
                                >
                                    {avatarUploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfilePage;