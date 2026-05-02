import { useState, useEffect, memo, useMemo, useRef } from 'react';
import { X, ChevronDown, Search, Calendar, Clock, Users, AlignLeft, Video } from 'lucide-react';
import type { UserType } from '../../Types/Types';

interface MeetingForm {
  meetingName: string;
  startTime: string;
  endTime: string;
  participants: string[]; // array of user IDs
  description: string;
  isZoomMeeting: boolean;
}

type FormErrors = Record<string, string>;

type Props = {
  open: boolean;
  onClose: () => void;
  users: UserType[];
  onSubmit: (data: MeetingForm) => void;
  isSubmitting: boolean;
};

const ScheduleMeetingModal = ({
  open,
  onClose,
  users,
  onSubmit,
  isSubmitting,
}: Props) => {
  const [localMeeting, setLocalMeeting] = useState<MeetingForm>({
    meetingName: '',
    startTime: '',
    endTime: '',
    participants: [],
    description: '',
    isZoomMeeting: false,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const participantsDropdownRef = useRef<HTMLDivElement | null>(null);
  const nowStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  }, [open]);

  useEffect(() => {
    if (open) {
      setLocalMeeting({
        meetingName: '',
        startTime: '',
        endTime: '',
        participants: [],
        description: '',
        isZoomMeeting: false,
      });
      setFormErrors({});
      setParticipantsOpen(false);
      setParticipantSearch('');
    }
  }, [open]);

  const filteredUsers = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = String(u?.name || '').trim().toLowerCase();
      const email = String(u?.email || '').trim().toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, participantSearch]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (participantsOpen && participantsDropdownRef.current && target && !participantsDropdownRef.current.contains(target)) {
        setParticipantsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [participantsOpen]);

  const handleFieldChange = (field: keyof MeetingForm, value: any) => {
    setLocalMeeting((prev) => {
      const updated = { ...prev, [field]: value };

      // Convenience: If start time is set, suggest an end time (+1 hour) 
      // if end time is empty or if start time is now after the current end time.
      if (field === 'startTime' && value) {
        const start = new Date(value);
        if (!isNaN(start.getTime())) {
          const currentEnd = prev.endTime ? new Date(prev.endTime) : null;
          if (!currentEnd || isNaN(currentEnd.getTime()) || start >= currentEnd) {
            const end = new Date(start.getTime() + 40 * 60 * 1000); // default +40 minutes

            // Format to YYYY-MM-DDTHH:mm for datetime-local
            const year = end.getFullYear();
            const month = String(end.getMonth() + 1).padStart(2, '0');
            const day = String(end.getDate()).padStart(2, '0');
            const hours = String(end.getHours()).padStart(2, '0');
            const mins = String(end.getMinutes()).padStart(2, '0');
            updated.endTime = `${year}-${month}-${day}T${hours}:${mins}`;
          }
        }
      }
      return updated;
    });

    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        // If we adjusted endTime automatically by changing startTime, also clear its error
        if (field === 'startTime') delete next.endTime;
        return next;
      });
    }
  };

  const toggleParticipant = (userId: string) => {
    setLocalMeeting((prev) => {
      const participants = prev.participants.includes(userId)
        ? prev.participants.filter((id) => id !== userId)
        : [...prev.participants, userId];
      return { ...prev, participants };
    });
  };

  const validate = () => {
    const errors: FormErrors = {};
    if (!localMeeting.meetingName.trim()) errors.meetingName = 'Meeting name is required';
    if (!localMeeting.startTime) errors.startTime = 'Start time is required';
    if (!localMeeting.endTime) errors.endTime = 'End time is required';

    if (localMeeting.startTime) {
      const start = new Date(localMeeting.startTime);
      if (start < new Date(new Date().getTime() - 60000)) { // Allow 1 min buffer
        errors.startTime = 'Start time cannot be in the past';
      }
    }

    if (localMeeting.startTime && localMeeting.endTime) {
      const start = new Date(localMeeting.startTime);
      const end = new Date(localMeeting.endTime);
      if (start >= end) {
        errors.endTime = 'End time must be after start time';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (validate()) {
      onSubmit(localMeeting);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white no-dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Schedule Meeting</h3>
                  <p className="text-sm text-white/80 mt-0.5">Plan your next collaboration</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Meeting Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 no-dark:text-gray-300 mb-2">
                <AlignLeft className="h-4 w-4 text-blue-500" />
                Meeting Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Weekly Sync, Project Kick-off"
                className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${formErrors.meetingName ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                value={localMeeting.meetingName}
                onChange={(e) => handleFieldChange('meetingName', e.target.value)}
              />
              {formErrors.meetingName && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-600" />{formErrors.meetingName}</p>}
            </div>

            {/* Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 no-dark:text-gray-300 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  min={nowStr}
                  className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${formErrors.startTime ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  value={localMeeting.startTime}
                  onChange={(e) => handleFieldChange('startTime', e.target.value)}
                />
                {formErrors.startTime && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-600" />{formErrors.startTime}</p>}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 no-dark:text-gray-300 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  min={localMeeting.startTime}
                  disabled={!localMeeting.startTime}
                  className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!localMeeting.startTime
                      ? 'opacity-50 cursor-not-allowed bg-gray-100'
                      : formErrors.endTime ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  value={localMeeting.endTime}
                  onChange={(e) => handleFieldChange('endTime', e.target.value)}
                />
                {formErrors.endTime && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-600" />{formErrors.endTime}</p>}
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 no-dark:text-gray-300 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                Participants
              </label>
              <div ref={participantsDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setParticipantsOpen((v) => !v)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 flex items-center justify-between"
                >
                  <span className="truncate text-sm text-gray-600">
                    {localMeeting.participants.length > 0
                      ? `${localMeeting.participants.length} participant(s) selected`
                      : 'Select team members'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${participantsOpen ? 'rotate-180' : ''}`} />
                </button>

                {participantsOpen && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={participantSearch}
                          onChange={(e) => setParticipantSearch(e.target.value)}
                          placeholder="Search colleagues..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-auto py-1">
                      {filteredUsers.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          No team members found
                        </div>
                      ) : (
                        filteredUsers.map((user: any) => {
                          const id = user._id || user.id;
                          const isSelected = localMeeting.participants.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleParticipant(id)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''
                                }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                                }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="flex flex-col items-start min-w-0">
                                <span className={`font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                  {user.name}
                                </span>
                                <span className="text-xs text-gray-500 truncate">{user.email}</span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Selected Participants Chips */}
              {localMeeting.participants.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {localMeeting.participants.map(id => {
                    const user = users.find(u => (u._id || (u as any).id) === id);
                    if (!user) return null;
                    return (
                      <div key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100">
                        {user.name}
                        <button type="button" onClick={() => toggleParticipant(id)} className="hover:text-blue-900">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 no-dark:text-gray-300 mb-2">
                <AlignLeft className="h-4 w-4 text-blue-500" />
                Description
              </label>
              <textarea
                placeholder="What is this meeting about?"
                rows={3}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                value={localMeeting.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
              />
            </div>

            {/* Zoom Meeting Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">Zoom Meeting</h4>
                  <p className="text-xs text-gray-500">Generate a Zoom link automatically</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localMeeting.isZoomMeeting}
                  onChange={(e) => handleFieldChange('isZoomMeeting', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-gray-50 no-dark:bg-gray-800/50 border-t border-gray-200 no-dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 ${isSubmitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
                }`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Scheduling...
                </div>
              ) : (
                'Schedule Meeting'
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default memo(ScheduleMeetingModal);
