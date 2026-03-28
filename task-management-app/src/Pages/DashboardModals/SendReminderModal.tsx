import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Bell, Send, X } from 'lucide-react';
import type { Task } from '../../Types/Types';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

type Props = {
    open: boolean;
    task: Task | null;
    onClose: () => void;
    onSend: (message: string) => void | Promise<void>;
    isSending?: boolean;
};

const SendReminderModal = ({ open, task, onClose, onSend, isSending = false }: Props) => {
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (open) setMessage('');
    }, [open]);

    const taskTitle = useMemo(() => {
        return String((task as any)?.title || '').trim();
    }, [task]);

    const canSend = useMemo(() => {
        return Boolean(open && task && !isSending);
    }, [open, task, isSending]);

    const handleSend = useCallback(() => {
        if (!canSend) return;
        onSend(message.trim());
    }, [canSend, message, onSend]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
        },
        [handleSend, onClose]
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3" onKeyDown={handleKeyDown as any}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl border border-gray-200">
                {/* Header - Compact */}
                <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                <Bell className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-gray-900">Send Reminder</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                    {taskTitle ? `Task: ${taskTitle.substring(0, 40)}${taskTitle.length > 40 ? '...' : ''}` : 'Task reminder message'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isSending}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content - Compact */}
                <div className="px-4 py-4">
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                        Reminder message (optional)
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        placeholder="Write a reminder for the assignee..."
                        disabled={isSending}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 resize-y"
                    />
                    <div className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1">
                            <span className="px-1 py-0.5 bg-gray-100 rounded text-[9px] font-mono">Ctrl</span>
                            <span>+</span>
                            <span className="px-1 py-0.5 bg-gray-100 rounded text-[9px] font-mono">Enter</span>
                        </span>
                        <span>to send</span>
                    </div>
                </div>

                {/* Footer - Compact */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            className="px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!canSend}
                            className={`inline-flex items-center px-3 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors ${
                                !canSend
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                            }`}
                        >
                            <Send className="h-3 w-3 mr-1.5" />
                            {isSending ? 'Sending...' : 'Send Reminder'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SendReminderModal;