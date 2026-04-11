import { Navigate, Outlet, useLocation } from "react-router";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";

import { Toaster } from 'react-hot-toast';

import { routepath } from "./Routes/route";

import { initForegroundPushListener, initPushIfAlreadyGranted, linkPushDeviceToUser } from "./utils/fcm";

import FloatingChat from "./Components/FloatingChat";

import ChatModal from "./Components/ChatModal";

import TaskReminderCard from "./Components/TaskReminderCard";

import PersonalTaskReminderCard from "./Components/PersonalTaskReminderCard";
import HeadlineBanner from "./Components/HeadlineBanner";

import { chatService } from "./Services/Chat.service";

import apiClient from "./Services/apiClient";

import { io, Socket } from "socket.io-client";

import toast from 'react-hot-toast';

type TaskReminderClientItem = {
  id: string;
  taskId: string;
  fromEmail: string;
  message: string;
  createdAt?: string | Date | null;
  task?: {
    title?: string;
    dueDate?: string | Date | null;
    status?: string;
    companyName?: string;
    brand?: string;
  };
};

type PersonalTaskReminderItem = {
  id: string;
  taskId: string;
  title: string;
  purpose?: string;
  priority?: string;
  fromEmail?: string;
  fromName?: string;
  message?: string;
  createdAt?: string | Date | null;
  task?: {
    title?: string;
    dueDate?: string | Date | null;
    status?: string;
    purpose?: string;
    priority?: string;
  };
};

const resolveSocketUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const isDev = Boolean(import.meta.env.DEV);

  if (typeof envSocketUrl === 'string' && envSocketUrl.trim().length > 0) {
    return String(envSocketUrl).trim().replace(/\/+$/, '');
  }

  const apiBase =
    typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0
      ? envBaseUrl
      : isDev
        ? 'http://localhost:8100/api'
        : 'https://tms-backend-sand.vercel.app/api';

  const trimmed = String(apiBase || '').trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

export default function App() {

  const token = localStorage.getItem('token');

  const location = useLocation();

  const pathname = location?.pathname || '/';

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [chatInitialized] = useState(true);

  const [unreadByUserId, setUnreadByUserId] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('chat_unreadByUserId');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  const [lastMessageAtByUserId, setLastMessageAtByUserId] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('chat_lastMessageAtByUserId');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  // Global Reminder State
  const [unreadReminders, setUnreadReminders] = useState<TaskReminderClientItem[]>([]);
  const [activeReminderId, setActiveReminderId] = useState<string>('');

  // Personal Task Reminder State
  const [personalReminders, setPersonalReminders] = useState<PersonalTaskReminderItem[]>([]);
  const [activePersonalReminderId, setActivePersonalReminderId] = useState<string>('');

  const socketRef = useRef<Socket | null>(null);
  const currentUserRef = useRef<any>(null);

  const activeReminder = useMemo(() => {
    const id = String(activeReminderId || '').trim();
    if (!id) return null;
    return (unreadReminders || []).find((r) => r.id === id) || null;
  }, [activeReminderId, unreadReminders]);

  const activePersonalReminder = useMemo(() => {
    const id = String(activePersonalReminderId || '').trim();
    if (!id) return null;
    return (personalReminders || []).find((r) => r.id === id) || null;
  }, [activePersonalReminderId, personalReminders]);

  const fetchMyReminders = useCallback(async () => {
    try {
      const res = await apiClient.get('/reminders/my');
      const list = Array.isArray(res?.data?.data) ? (res.data.data as any[]) : [];
      const normalized: TaskReminderClientItem[] = list
        .map((r: any) => ({
          id: String(r?.id || r?._id || '').trim(),
          taskId: String(r?.taskId || '').trim(),
          fromEmail: String(r?.fromEmail || '').trim(),
          message: String(r?.message || '').trim(),
          createdAt: r?.createdAt || null,
          task: r?.task || {},
        }))
        .filter((r) => Boolean(r.id));
      setUnreadReminders(normalized);
      setActiveReminderId((prev) => {
        if (prev && normalized.some((x) => x.id === prev)) return prev;
        return normalized[0]?.id || '';
      });
    } catch {
      // ignore
    }
  }, []);

  const acknowledgeReminder = useCallback(async (reminderId: string) => {
    const id = String(reminderId || '').trim();
    if (!id) return;
    try {
      await apiClient.patch(`/reminders/${id}/seen`);
    } catch {
      // ignore
    }
    setUnreadReminders((prev) => prev.filter((r) => r.id !== id));
    setActiveReminderId((prev) => {
      if (prev !== id) return prev;
      const remaining = unreadReminders.filter((r) => r.id !== id);
      return remaining[0]?.id || '';
    });
  }, [unreadReminders]);

  const acknowledgePersonalReminder = useCallback(async (reminderId: string) => {
    const id = String(reminderId || '').trim();
    if (!id) return;
    
    setPersonalReminders((prev) => prev.filter((r) => r.id !== id));
    setActivePersonalReminderId((prev) => {
      if (prev !== id) return prev;
      const remaining = personalReminders.filter((r) => r.id !== id);
      return remaining[0]?.id || '';
    });
  }, [personalReminders]);

  const completePersonalTask = useCallback(async (taskId: string) => {
    if (!taskId) return;
    try {
      await apiClient.patch(`/personal-tasks/${taskId}/status`, { status: 'completed' });
      
      setPersonalReminders((prev) => prev.filter((r) => r.taskId !== taskId));
      setActivePersonalReminderId((prev) => {
        const active = personalReminders.find((r) => r.id === prev);
        if (active?.taskId === taskId) {
          const remaining = personalReminders.filter((r) => r.taskId !== taskId);
          return remaining[0]?.id || '';
        }
        return prev;
      });
      
      toast('Task marked as completed!', { icon: '✅' });
    } catch {
      toast('Failed to complete task', { icon: '❌' });
    }
  }, [personalReminders]);

  // Socket.io for global reminders
  useEffect(() => {
    if (!token) return;

    // Get current user info from localStorage or decode token
    const getCurrentUser = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          return JSON.parse(userStr);
        }
      } catch {
        // ignore
      }
      return null;
    };

    const user = getCurrentUser();
    if (!user) return;

    currentUserRef.current = user;
    const userId = String(user?.id || user?._id || '').trim();
    const role = String(user?.role || '').trim().toLowerCase();
    const companyName = String(user?.companyName || user?.company || '').trim();

    const socketUrl = resolveSocketUrl();
    if (!socketUrl) return;

    // Initial fetch of reminders
    void fetchMyReminders();

    // Disconnect existing socket
    try {
      socketRef.current?.disconnect();
    } catch {
      // ignore
    }

    const socket = io(socketUrl, {
      auth: { userId, role, companyName },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] connected for reminders', { id: socket.id });
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected', { reason });
    });

    socket.on('connect_error', (err: any) => {
      console.error('[socket] connect_error', err?.message || err);
    });

    const onPersonalReminder = (payload: any) => {
      try {
        const raw = payload?.reminder || payload;
        const id = String(raw?.id || raw?._id || '').trim();
        if (!id) return;

        const next: PersonalTaskReminderItem = {
          id,
          taskId: String(raw?.taskId || '').trim(),
          title: String(raw?.title || raw?.task?.title || '').trim(),
          purpose: String(raw?.purpose || raw?.task?.purpose || '').trim(),
          priority: String(raw?.priority || raw?.task?.priority || '').trim(),
          fromEmail: String(raw?.fromEmail || 'system').trim(),
          fromName: String(raw?.fromName || 'Personal Task Reminder').trim(),
          message: String(raw?.message || '').trim(),
          createdAt: raw?.createdAt || null,
          task: raw?.task || {},
        };

        setPersonalReminders((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const merged = [next, ...list.filter((x) => String(x?.id || '').trim() !== id)];
          return merged;
        });

        setActivePersonalReminderId((prev) => (prev ? prev : id));

        toast(`Personal Task Reminder: ${next.title}`, {
          icon: '📌',
        });
      } catch {
        // ignore
      }
    };

    const onReminderNew = (payload: any) => {
      try {
        const raw = payload?.reminder || payload;
        const id = String(raw?.id || raw?._id || '').trim();
        if (!id) return;

        const next: TaskReminderClientItem = {
          id,
          taskId: String(raw?.taskId || '').trim(),
          fromEmail: String(raw?.fromEmail || '').trim(),
          message: String(raw?.message || '').trim(),
          createdAt: raw?.createdAt || null,
          task: raw?.task || raw?.taskSnapshot || {},
        };

        setUnreadReminders((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const merged = [next, ...list.filter((x) => String(x?.id || '').trim() !== id)];
          return merged;
        });

        setActiveReminderId((prev) => (prev ? prev : id));

        // Show toast notification
        toast(`New reminder from ${next.fromEmail}: ${next.message || 'Task reminder'}`, {
          icon: '🔔',
        });
      } catch {
        // ignore
      }
    };

    socket.on('reminder:new', onReminderNew);
    socket.on('personal:reminder', onPersonalReminder);

    return () => {
      try {
        socket.off('reminder:new', onReminderNew);
        socket.off('personal:reminder', onPersonalReminder);
        socket.disconnect();
      } catch {
        // ignore
      }
    };
  }, [token, fetchMyReminders]);

  useEffect(() => {
    if (!token) return;

    try {
      localStorage.setItem('chat_unreadByUserId', JSON.stringify(unreadByUserId || {}));
    } catch {
      return;
    }
  }, [token, unreadByUserId]);

  useEffect(() => {
    if (!token) return;

    try {
      localStorage.setItem('chat_lastMessageAtByUserId', JSON.stringify(lastMessageAtByUserId || {}));
    } catch {
      return;
    }
  }, [token, lastMessageAtByUserId]);

  useEffect(() => {
    if (!chatInitialized) return;

    const handler = (data: any) => {
      console.log('Received chat list update:', data);

      const otherUserId = data?.otherUserId;
      if (!otherUserId) return;

      const ts = data?.lastMessageAt ? new Date(data.lastMessageAt).toISOString() : new Date().toISOString();

      setLastMessageAtByUserId((prev) => ({
        ...prev,
        [String(otherUserId)]: ts,
      }));

      const selectedId = selectedChatUser?.id || selectedChatUser?._id;
      const isChatOpenForThatUser = Boolean(chatModalOpen && selectedId && String(selectedId) === String(otherUserId));
      const inc = Number(data?.unreadIncrement || 0);

      if (!isChatOpenForThatUser && inc > 0) {
        setUnreadByUserId((prev) => ({
          ...prev,
          [String(otherUserId)]: (prev[String(otherUserId)] || 0) + inc,
        }));
      }
    };

    const unsubscribe = chatService.onChatListUpdate(handler);

    return () => {
      unsubscribe?.();
    };
  }, [chatInitialized, chatModalOpen, selectedChatUser]);

  useEffect(() => {
    if (!chatInitialized) return;

    const handler = (message: any) => {
      const me = chatService.getCurrentUser();
      const myId = me?.id || me?._id;
      if (!myId) return;

      const otherUserId = message?.senderId === myId ? message?.receiverId : message?.senderId;
      if (!otherUserId) return;

      if (message?.receiverId === myId) {
        const ts = message?.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString();

        setLastMessageAtByUserId((prev) => ({
          ...prev,
          [String(otherUserId)]: ts,
        }));
      }

      const selectedId = selectedChatUser?.id || selectedChatUser?._id;
      const isChatOpenForThatUser = Boolean(chatModalOpen && selectedId && String(selectedId) === String(otherUserId));

      if (!isChatOpenForThatUser && message?.receiverId === myId) {
        const senderName = String(message?.senderName || 'Someone');
        const body = String(message?.content || 'New message');
        toast(`${senderName}: ${body}`);
      }

      if (isChatOpenForThatUser) {
        setUnreadByUserId((prev) => ({
          ...prev,
          [String(otherUserId)]: 0,
        }));
      }
    };

    const unsubscribe = chatService.onNewMessage(handler);

    return () => {
      unsubscribe?.();
    };
  }, [chatInitialized, chatModalOpen, selectedChatUser]);

  const handleUserSelect = (user: any) => {
    console.log('Selected user for chat:', user);

    setSelectedChatUser(user);

    setChatModalOpen(true);

    const uid = user?.id || user?._id;
    if (uid) {
      setUnreadByUserId((prev) => ({
        ...prev,
        [String(uid)]: 0,
      }));
    }
  };

  const handleCloseChatModal = () => {
    setChatModalOpen(false);
    setSelectedChatUser(null);
  };

  useEffect(() => {
    void initPushIfAlreadyGranted();
    void initForegroundPushListener();

    // Check for mobile and prompt if not enabled
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && 'Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        toast("Enable notifications to receive task updates on your phone!", {
          icon: '🔔',
          duration: 6000,
          position: 'bottom-center'
        });
      }, 3000);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void linkPushDeviceToUser({});
  }, [token]);

  const publicAuthPaths = useMemo(() => {
    return new Set<string>([
      '/',
      routepath.privacyPolicy,
      routepath.termsAndConditions,
      routepath.login,
      routepath.forgetPassword,
      routepath.verifyOtp,
      routepath.changePassword,
    ]);
  }, []);

  const isPublicAuthPath = publicAuthPaths.has(pathname);

  const authOnlyPaths = useMemo(() => {
    return new Set<string>([
      routepath.login,
      routepath.forgetPassword,
      routepath.verifyOtp,
      routepath.changePassword,
    ]);
  }, []);

  const isAuthOnlyPath = authOnlyPaths.has(pathname);

  const redirectElement = useMemo(() => {
    if (!token && !isPublicAuthPath) {
      return <Navigate to={routepath.login} replace />;
    }

    if (token && isAuthOnlyPath) {
      return <Navigate to={routepath.dashboard} replace />;
    }

    return null;
  }, [isAuthOnlyPath, isPublicAuthPath, token]);

  if (redirectElement) return redirectElement;

  return (
    <>
      {token && <HeadlineBanner />}
      <Toaster position="top-right" reverseOrder={false} />
      <Outlet />
      {token && <FloatingChat
        position="bottom-right"
        primaryColor="#10B982"
        onUserSelect={handleUserSelect}
        unreadCounts={unreadByUserId}
        lastMessageAt={lastMessageAtByUserId}
      />}
      {token && chatInitialized && <ChatModal
        isOpen={chatModalOpen}
        onClose={handleCloseChatModal}
        selectedUser={selectedChatUser}
      />}
      {token && activeReminder && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-[92vw] max-w-md">
            <TaskReminderCard
              reminder={activeReminder as any}
              onAcknowledge={() => acknowledgeReminder(activeReminder.id)}
            />
          </div>
        </div>
      )}
      {token && activePersonalReminder && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-[92vw] max-w-md">
            <PersonalTaskReminderCard
              reminder={activePersonalReminder as any}
              onAcknowledge={() => acknowledgePersonalReminder(activePersonalReminder.id)}
              onComplete={() => completePersonalTask(activePersonalReminder.taskId)}
            />
          </div>
        </div>
      )}
    </>
  );
}