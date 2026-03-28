// components/Navbar.tsx
import React from 'react';
import { Menu, Search, LogOut, ChevronDown } from 'lucide-react';
import type { UserType } from '../Types/Types';
import { userAvatarUrl } from '../utils/avatar';

interface NavbarProps {
  setSidebarOpen: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUser: UserType;
  showLogout: boolean;
  setShowLogout: (show: boolean) => void;
  handleLogout: () => void;
  isSidebarCollapsed?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  setSidebarOpen,
  searchTerm,
  setSearchTerm,
  currentUser,
  showLogout,
  setShowLogout,
  handleLogout
}) => {
  // Get display avatar (first letter)
  const getDisplayAvatar = () => {
    if (!currentUser) return 'U';
    
    if (currentUser.name && currentUser.name.trim() !== '') {
      return currentUser.name.charAt(0).toUpperCase();
    }

    if (currentUser.email && currentUser.email.trim() !== '') {
      return currentUser.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  const avatarUrl = userAvatarUrl(currentUser);

  // Get display name
  const getDisplayName = () => {
    if (!currentUser) return 'User';
    
    if (currentUser.name && currentUser.name.trim() !== '') {
      return currentUser.name;
    }
    
    if (currentUser.email) {
      return currentUser.email.split('@')[0];
    }
    
    return 'User';
  };

  // Get display email
  const getDisplayEmail = () => {
    if (!currentUser) return;
    return currentUser.email;
  };

  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800m w-full ">
      {/* Sidebar Toggle Button */}
      <button
        className="px-4 border-r border-gray-100 dark:border-gray-800 text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary transition-colors duration-200 lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 px-4 flex justify-between items-center">
        {/* Search Bar */}
        <div className="flex-1 flex max-w-md">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 dark:bg-gray-800 text-sm transition-all duration-200"
              placeholder="Search tasks, projects..."
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* User Profile Section */}
          <div className="relative">
            <button
              className="flex items-center space-x-3 focus:outline-none group"
              onClick={(e) => {
                e.stopPropagation();
                setShowLogout(!showLogout);
              }}
            >
              <div className="h-9 w-9 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 group-hover:shadow-md gradient-primary">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={getDisplayName()} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {getDisplayAvatar()}
                  </span>
                )}
              </div>

              {/* Name and Email Display */}
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-primary">
                  {getDisplayName()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getDisplayEmail()}
                </div>
              </div>
              
              <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Logout Dropdown */}
            {showLogout && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLogout(false)}></div>
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-lg py-2 border border-gray-100 dark:border-gray-800 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm gradient-primary">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={getDisplayName()} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-sm">
                            {getDisplayAvatar()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {getDisplayName()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {getDisplayEmail()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-primary hover:bg-primary-ultralight dark:hover:bg-gray-800 transition-all duration-200 group"
                  >
                    <LogOut className="h-4 w-4 mr-3 transition-transform duration-200 group-hover:-translate-x-0.5 text-primary" />
                    <span>Sign out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Navbar);