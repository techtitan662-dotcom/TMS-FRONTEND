import { Link } from "react-router";
import { routepath } from "../Routes/route";
import { LayoutDashboard, Shield, Calendar, CheckSquare } from "lucide-react";

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <meta name="google-site-verification" content="q6BGcMT3Zm73tNhpI7jgiMo1LfAe78tMQ8z2kdij88M" />
            <div className="mx-auto max-w-4xl px-3 py-8">
                <div className={`rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden`}>
                    {/* Header Section - Compact */}
                    <div className={`border-b border-gray-200 px-5 py-5 bg-[${theme.primaryUltralight}]`}>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                    <LayoutDashboard className="h-4 w-4 text-white" />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                                    Task Management System
                                </h1>
                            </div>
                            <p className="text-xs text-gray-600">
                                Manage work, calendars, and tasks in one place.
                            </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                                to={routepath.login}
                                className={`inline-flex items-center justify-center rounded-lg bg-[${theme.primary}] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[${theme.primaryDark}]`}
                            >
                                Login
                            </Link>
                            <Link
                                to={routepath.privacyPolicy}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                Privacy Policy
                            </Link>
                            <Link
                                to={routepath.termsAndConditions}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                Terms & Conditions
                            </Link>
                        </div>
                    </div>

                    {/* Main Content - Compact */}
                    <div className="px-5 py-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* What this app does */}
                            <div className="space-y-2.5">
                                <h2 className="text-sm font-semibold text-gray-900">What this app does</h2>
                                <p className="text-xs leading-5 text-gray-600">
                                    This application helps you organize your work by creating and tracking tasks,
                                    scheduling activities, and reviewing progress.
                                </p>
                                <p className="text-xs leading-5 text-gray-600">
                                    It can integrate with your Google account to show calendar events and tasks
                                    that you choose to connect.
                                </p>
                            </div>

                            {/* Why Google access is requested */}
                            <div className="space-y-2.5">
                                <h2 className="text-sm font-semibold text-gray-900">
                                    Why Google access is requested
                                </h2>
                                <p className="text-xs leading-5 text-gray-600">
                                    If you sign in with Google and grant permission, the app uses:
                                </p>
                                <div className={`space-y-2 rounded-lg border border-gray-200 bg-[${theme.primaryUltralight}] p-3`}>
                                    <div className="flex items-start gap-2">
                                        <Calendar className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="text-xs font-semibold text-gray-900">Google Calendar API</div>
                                            <div className="text-[11px] text-gray-600">
                                                To view and manage your calendar data within the app.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckSquare className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="text-xs font-semibold text-gray-900">Google Tasks API</div>
                                            <div className="text-[11px] text-gray-600">
                                                To view and manage your tasks within the app.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] leading-4 text-gray-500">
                                    You can revoke access at any time from your Google Account permissions.
                                </p>
                            </div>
                        </div>

                        {/* Contact Section - Compact */}
                        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-gray-500" />
                                <h3 className="text-xs font-semibold text-gray-900">Contact</h3>
                            </div>
                            <p className="mt-1.5 text-[11px] text-gray-600">
                                If you have any questions, contact the app administrator.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}