import { Link } from "react-router";
import { routepath } from "../Routes/route";
import { Shield, Home, FileText, LogIn, Calendar, Database, Share2, Clock, Lock } from "lucide-react";

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="mx-auto max-w-3xl px-3 py-8">
                <div className={`rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden`}>
                    {/* Header Section - Compact */}
                    <div className={`border-b border-gray-200 px-5 py-4 bg-[${theme.primaryUltralight}]`}>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                    <Shield className="h-4 w-4 text-white" />
                                </div>
                                <h1 className="text-lg font-bold tracking-tight text-gray-900">
                                    Privacy Policy
                                </h1>
                            </div>
                            <p className="text-[11px] text-gray-500">
                                Effective date: {new Date().getFullYear()}
                            </p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                                to={routepath.home}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                <Home className="h-3 w-3 mr-1.5" />
                                Home
                            </Link>
                            <Link
                                to={routepath.termsAndConditions}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                <FileText className="h-3 w-3 mr-1.5" />
                                Terms
                            </Link>
                            <Link
                                to={routepath.login}
                                className={`inline-flex items-center justify-center rounded-lg bg-[${theme.primary}] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[${theme.primaryDark}]`}
                            >
                                <LogIn className="h-3 w-3 mr-1.5" />
                                Login
                            </Link>
                        </div>
                    </div>

                    {/* Content Section - Compact */}
                    <div className="space-y-5 px-5 py-5 text-[11px] leading-relaxed text-gray-700">
                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-blue-600" />
                                Overview
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                This Privacy Policy explains how the Task Management System (the "App")
                                collects, uses, and protects information when you use the App, including
                                when you connect your Google account for Google Calendar and Google Tasks
                                functionality.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Database className="h-3.5 w-3.5 text-blue-600" />
                                Information we collect
                            </h2>
                            <div className="space-y-2 ml-1">
                                <div className="border-l-2 border-blue-200 pl-2.5">
                                    <div className="font-semibold text-[11px] text-gray-800">Account & profile data</div>
                                    <div className="text-[10px] text-gray-500">
                                        Information you provide such as name, email address, and authentication
                                        tokens required to sign in.
                                    </div>
                                </div>
                                <div className="border-l-2 border-blue-200 pl-2.5">
                                    <div className="font-semibold text-[11px] text-gray-800">
                                        Google Calendar & Google Tasks data (with your consent)
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        If you connect your Google account, the App may access data from Google
                                        Calendar and Google Tasks to display and manage your events and tasks
                                        inside the App.
                                    </div>
                                </div>
                                <div className="border-l-2 border-blue-200 pl-2.5">
                                    <div className="font-semibold text-[11px] text-gray-800">Usage data</div>
                                    <div className="text-[10px] text-gray-500">
                                        Basic app usage information (such as feature usage and error logs) to
                                        improve reliability and performance.
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                How we use information
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                We use information to:
                            </p>
                            <ul className="list-disc pl-5 text-[11px] text-gray-600 space-y-0.5">
                                <li>Provide and maintain the App and its features</li>
                                <li>Authenticate you and secure access to your account</li>
                                <li>Display and manage your calendar events and tasks (if enabled by you)</li>
                                <li>Improve performance, fix bugs, and enhance user experience</li>
                            </ul>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                Google API Services usage
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                The App uses Google API Services (Google Calendar API and Google Tasks API).
                                Information received from Google APIs is used only to provide features you
                                request within the App.
                            </p>
                            <p className="text-[11px] text-gray-600">
                                You can revoke the App's access to your Google Account at any time from your
                                Google Account permissions.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Share2 className="h-3.5 w-3.5 text-blue-600" />
                                Data sharing
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                We do not sell your personal information. We may share information only when
                                required to operate the service (for example, with hosting providers) or when
                                required by law.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-blue-600" />
                                Data retention
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                We retain information only for as long as needed to provide the App and meet
                                legal or operational requirements. Where applicable, you may request deletion
                                of your account data.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5 text-blue-600" />
                                Security
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                We take reasonable measures to protect information, but no method of
                                transmission or storage is completely secure.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-blue-600" />
                                Contact
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                If you have questions about this Privacy Policy, contact the app
                                administrator.
                            </p>
                        </section>
                    </div>

                    {/* Footer Note - Compact */}
                    <div className={`px-5 py-3 border-t border-gray-100 bg-[${theme.primaryUltralight}]`}>
                        <p className="text-[9px] text-gray-500 text-center">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}