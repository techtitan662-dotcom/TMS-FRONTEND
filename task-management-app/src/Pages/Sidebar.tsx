import React, { useEffect, useRef } from 'react';
import {
  X, LogOut, ListTodo, ChevronLeft, ChevronRight, Menu, 
  Users, Calendar, CheckSquare, User, Building, Shield, Star, Briefcase, AlertTriangle, Megaphone,
  UserCheck, LayoutDashboard, ClipboardList, TrendingUp, Settings,
} from 'lucide-react';

import type { UserType } from '../Types/Types';
import CompanyLogo from '../../public/Untitled design (2).png';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentUser: UserType;
  handleLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  navigateTo: (page: string) => void;
  assignedByMePendingCount?: number;
  assignedToMePendingCount?: number;
  currentView?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  currentUser,
  handleLogout,
  isCollapsed,
  setIsCollapsed,
  navigateTo,
  assignedByMePendingCount = 0,
  assignedToMePendingCount = 0,
  currentView = 'dashboard'
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  
  // Using CSS variables - will automatically update when theme changes
  const getCSSVariable = (varName: string) => {
    if (typeof window !== 'undefined') {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }
    return '';
  };

  const logoColor = getCSSVariable('--color-primary-main') || '#1e3a8a';

  // Save scroll position
  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  };

  // Restore scroll position
  const restoreScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  };

  // Handle scroll events
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      scrollPositionRef.current = scrollContainer.scrollTop;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const hasAccess = (moduleId: string) => {
    const role = String((currentUser as any)?.role || '').trim().toLowerCase();
    const isAdminUser = role === 'admin' || role === 'super_admin';
    
    const perms = (currentUser as any)?.permissions;
    const hasPermsObj = perms && typeof perms === 'object' && Object.keys(perms).length > 0;

    if (hasPermsObj) {
      const perm = String((perms as any)[moduleId] || '').trim().toLowerCase();
      // If explicitly denied, return false immediately even for admins
      if (['no', 'false', '0', 'denied'].includes(perm)) return false;
      // If explicitly allowed, return true
      if (['allow', 'allowed', 'yes', 'true', '1'].includes(perm)) return true;
    }

    // If no explicit permission, admins get access by default
    if (isAdminUser) return true;
    
    if (moduleId === 'access_management' && (role === 'am' || role === 'rm')) return false;
    if (!hasPermsObj) return true;
    
    // For non-admins, if not explicitly allowed above, it's denied
    return false;
  };

  const roleKey = String((currentUser as any)?.role || '').trim().toLowerCase();
  const isAdmin = roleKey === 'admin' || roleKey === 'super_admin';
  
  const canSeeDashboard = hasAccess('dashboard');
  const canSeeAssignedByMe = hasAccess('assigned_by_me');
  const canSeeAssignedToMe = hasAccess('assigned_to_me');
  const canSeeAccess = hasAccess('access_management');
  const canSeeTeam = hasAccess('team_page');
  const canSeeTasks = hasAccess('tasks_page');
  const canSeeCalendar = hasAccess('calendar_page');
  const canSeeBrands = hasAccess('brands_page');
  const canSeeProfile = hasAccess('profile_page');
  const canSeeAnalyze = hasAccess('reports_analytics');
  const canSeeReviews = hasAccess('reviews_page');
  const canSeePersonalTasks = hasAccess('personal_tasks_page');
  const canSeeStrike = hasAccess('strike_page');
  const canSeeOtherWork = hasAccess('other_work_page');
  const canSeeAssignPage = hasAccess('assign_page');
  const canSeeMdImpexAccess = isAdmin ? true : (roleKey === 'md_manager');

  const userCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase();
  const isMdImpexUser = isAdmin || userCompany.includes('mdimpex') || userCompany.includes('md_impex') || userCompany === 'md impex';

  const getDisplayInitial = () => {
    if (!currentUser) return 'U';
    if (currentUser.name && currentUser.name.trim() !== '') {
      return currentUser.name.charAt(0).toUpperCase();
    }
    if (currentUser.email && currentUser.email.trim() !== '') {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const navigationSections = [
    {
      id: 'main',
      title: '',
      items: [
        ...(canSeeDashboard ? [{ name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard', badge: 0 }] : []),
      ]
    },
    {
      id: 'tasks',
      title: 'TASKS',
      items: [
        ...(canSeeTasks ? [{ name: 'All Tasks', icon: CheckSquare, id: 'all-tasks', badge: 0 }] : []),
        ...(canSeePersonalTasks ? [{ name: 'Personal Tasks', icon: ListTodo, id: 'personal-tasks', badge: 0 }] : []),
        ...(canSeeAssignedByMe ? [{ name: 'Assigned By Me', icon: UserCheck, id: 'assigned-by-me', badge: assignedByMePendingCount }] : []),
        ...(canSeeAssignedToMe ? [{ name: 'Assigned To Me', icon: ClipboardList, id: 'assigned-to-me', badge: assignedToMePendingCount }] : []),
        ...(canSeeCalendar ? [{ name: 'Calendar', icon: Calendar, id: 'calendar', badge: 0 }] : []),
        ...(canSeeAnalyze ? [{ name: 'Analytics', icon: TrendingUp, id: 'analyze', badge: 0 }] : []),
      ]
    },
    {
      id: 'business',
      title: 'BUSINESS',
      items: [
        ...(canSeeBrands ? [{ name: 'Brands', icon: Building, id: 'brands', badge: 0 }] : []),
        ...(canSeeReviews ? [{ name: 'Reviews', icon: Star, id: 'reviews', badge: 0 }] : []),
        ...(canSeeAssignPage ? [{ name: 'Assign Page', icon: Briefcase, id: 'assign', badge: 0 }] : []),
        ...(canSeeOtherWork ? [{ name: 'Other Work', icon: Briefcase, id: 'other-work', badge: 0 }] : []),
      ]
    },
    {
      id: 'management',
      title: 'MANAGEMENT',
      items: [
        ...(canSeeTeam ? [{ name: 'Team', icon: Users, id: 'team', badge: 0 }] : []),
        ...(canSeeStrike ? [{ name: 'Strike', icon: AlertTriangle, id: 'md-impex-strike', badge: 0 }] : []),
        ...(isMdImpexUser ? [{ name: 'Manual Strike', icon: AlertTriangle, id: 'md-impex-manual-strike', badge: 0 }] : []),
        ...(canSeeMdImpexAccess ? [{ name: 'MD Access', icon: Shield, id: 'md-impex-access', badge: 0 }] : []),
        ...(canSeeAccess ? [{ name: 'Access Control', icon: Settings, id: 'access', badge: 0 }] : []),
        ...(isAdmin ? [{ name: 'Headline', icon: Megaphone, id: 'headline', badge: 0 }] : []),
      ]
    },
    {
      id: 'account',
      title: 'ACCOUNT',
      items: [
        ...(canSeeProfile ? [{ name: 'Profile', icon: User, id: 'profile', badge: 0 }] : []),
      ]
    }
  ];

  const toggleSidebarMode = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    setTimeout(restoreScrollPosition, 100);
  };

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) setIsCollapsed(JSON.parse(savedState));
  }, [setIsCollapsed]);

  useEffect(() => {
    restoreScrollPosition();
  });

  return (
    <>
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex flex-col w-full max-w-[260px] h-full bg-white shadow-2xl">
          <div className="absolute top-2.5 right-2.5 z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg bg-gray-100 transition-all duration-300 ease-out hover:scale-105"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>
          <div className="flex flex-col h-full bg-white">
            {/* Logo Section */}
            <div className={`flex-shrink-0 px-4 py-4 border-b border-gray-100`}>
              <div className="flex items-center justify-center">
                <img 
                  src={CompanyLogo}
                  alt="HM² Solutions LLP" 
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '55px', minHeight: '45px' }}
                />
              </div>
            </div>

            {/* Navigation with Custom Scrollbar */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto py-3 custom-scrollbar"
            >
              {navigationSections.map((section) => {
                const visibleItems = section.items.filter(item => item.name);
                if (visibleItems.length === 0) return null;
                
                return (
                  <div key={section.id} className="mb-3">
                    {section.title && (
                      <div className="px-4 mb-1.5">
                        <p className="text-[9px] font-semibold tracking-wider text-gray-400">{section.title}</p>
                      </div>
                    )}
                    <div className="px-3 space-y-0.5">
                      {visibleItems.map((item) => {
                        const isActive = currentView === item.id;
                        
                        return (
                          <button
                            key={item.name}
                            onClick={() => {
                              navigateTo(item.id);
                              setSidebarOpen(false);
                              saveScrollPosition();
                            }}
                            className={`
                              relative w-full flex items-center rounded-md transition-all duration-300 ease-out
                              py-1.5 px-2.5
                              ${isActive ? 'active-menu-item' : ''}
                            `}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="flex items-center w-full min-w-0">
                              <item.icon 
                                className="h-4 w-4 flex-shrink-0 transition-all duration-300 ease-out mr-2.5"
                                style={{ 
                                  color: isActive ? 'white' : 'black',
                                  strokeWidth: isActive ? 2 : 1.5
                                }}
                              />
                              <span 
                                className="text-[13px] font-medium truncate transition-all duration-300 ease-out"
                                style={{ 
                                  color: isActive ? 'white' : 'black',
                                  maxWidth: 'calc(100% - 30px)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={item.name}
                              >
                                {item.name}
                              </span>
                              {item.badge > 0 && (
                                <span 
                                  className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 transition-all duration-300 ease-out"
                                  style={{ 
                                    backgroundColor: isActive ? 'white' : 'black',
                                    color: isActive ? 'black' : 'white'
                                  }}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* User Profile Section */}
            <div className="flex-shrink-0 border-t border-gray-100 p-3 bg-white">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative flex-shrink-0 transition-all duration-300 ease-out hover:scale-105">
                  <div className="absolute inset-0 rounded-full blur opacity-30" style={{ backgroundColor: logoColor }}></div>
                  <div 
                    className="relative h-8 w-8 rounded-full flex items-center justify-center shadow-sm gradient-primary"
                  >
                    <span className="text-white font-bold text-[11px]">{getDisplayInitial()}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate text-black" title={currentUser.name}>
                    {currentUser.name}
                  </p>
                  <p className="text-[9px] truncate text-gray-600" title={currentUser.email}>
                    {currentUser.email}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-[9px] flex items-center transition-all duration-300 ease-out mt-0.5 hover:translate-x-0.5 text-black hover:text-gray-700"
                  >
                    <LogOut className="h-2.5 w-2.5 mr-1 transition-transform duration-300 ease-out text-black" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            <style>{`
              /* Custom Scrollbar Styles */
              .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: var(--color-primary-main);
              }
              
              .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
                height: 4px;
              }
              
              .custom-scrollbar::-webkit-scrollbar-track {
                background: var(--color-primary-main);
                border-radius: 10px;
              }
              
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: var(--color-primary-main);
                border-radius: 10px;
                transition: background 0.3s ease;
              }
              
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: var(--color-primary-main);
              }
              
              .custom-scrollbar::-webkit-scrollbar-corner {
                background: transparent;
              }
              
              /* Active Menu Item Styles */
              .active-menu-item {
                position: relative;
                background: var(--color-primary-main);
                border-radius: 8px;
                transform: scale(1);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              }
              
              .active-menu-item:hover {
                background: var(--color-primary-main);
                transform: scale(1.02);
              }
              
              .active-menu-item::before {
                display: none;
              }
              
              /* Firefox Scrollbar */
              .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: var(--color-primary-main) var(--color-primary-ultralight);
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div 
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ease-in-out z-30
          ${isCollapsed ? 'lg:w-17' : 'lg:w-56'} bg-white border-r border-gray-100 shadow-lg`}
      >
        {/* Toggle Button */}
        <div className="absolute -right-2.5 top-20 z-40">
          <button
            onClick={toggleSidebarMode}
            className="p-0.5 rounded-full bg-white border shadow-md transition-all duration-300 ease-out hover:scale-110"
            style={{ borderColor: `${logoColor}30` }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-2.5 w-2.5 transition-transform duration-300 ease-out text-black" />
            ) : (
              <ChevronLeft className="h-2.5 w-2.5 transition-transform duration-300 ease-out text-black" />
            )}
          </button>
        </div>
        
        <div className="flex flex-col h-full bg-white">
          {/* Logo Section */}
          <div className={`flex-shrink-0 ${isCollapsed ? 'px-2 py-3' : 'px-4 py-4'} border-b border-gray-100`}>
            {!isCollapsed ? (
              <div className="flex items-center justify-center">
                <img 
                  src={CompanyLogo}
                  alt="HM² Solutions LLP" 
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '55px', minHeight: '45px' }}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <img 
                  src={CompanyLogo}
                  alt="HM²" 
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '40px', minHeight: '35px' }}
                />
              </div>
            )}
          </div>

          {/* Navigation with Custom Scrollbar */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto py-3 custom-scrollbar"
          >
            {navigationSections.map((section) => {
              const visibleItems = section.items.filter(item => item.name);
              if (visibleItems.length === 0) return null;
              
              return (
                <div key={section.id} className="mb-3">
                  {!isCollapsed && section.title && (
                    <div className="px-4 mb-1.5">
                      <p className="text-[9px] font-semibold tracking-wider text-gray-400">{section.title}</p>
                    </div>
                  )}
                  <div className={`${isCollapsed ? 'px-1.5' : 'px-3'} space-y-0.5`}>
                    {visibleItems.map((item) => {
                      const isActive = currentView === item.id;
                      
                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            navigateTo(item.id);
                            saveScrollPosition();
                          }}
                          className={`
                            relative w-full flex items-center rounded-md transition-all duration-300 ease-out
                            ${isCollapsed ? 'justify-center py-1.5' : 'py-1.5 px-2.5'}
                            ${isActive ? 'active-menu-item' : ''}
                          `}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={`flex items-center w-full ${isCollapsed ? 'justify-center' : ''} min-w-0`}>
                            <item.icon 
                              className={`h-4 w-4 flex-shrink-0 transition-all duration-300 ease-out ${isCollapsed ? '' : 'mr-2.5'}`}
                              style={{ 
                                color: isActive ? 'white' : 'black',
                                strokeWidth: isActive ? 2 : 1.5
                              }}
                            />
                            {!isCollapsed && (
                              <span 
                                className={`text-[13px] font-medium truncate transition-all duration-300 ease-out ${
                                  isActive ? 'font-semibold' : ''
                                }`}
                                style={{ 
                                  color: isActive ? 'white' : 'black',
                                  maxWidth: 'calc(100% - 30px)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={item.name}
                              >
                                {item.name}
                              </span>
                            )}
                            {!isCollapsed && item.badge > 0 && (
                              <span 
                                className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 transition-all duration-300 ease-out"
                                style={{ 
                                  backgroundColor: isActive ? 'white' : 'black',
                                  color: isActive ? 'black' : 'white'
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {isCollapsed && item.badge > 0 && (
                            <div className="absolute -top-0.5 -right-0.5 transition-all duration-300 ease-out">
                              <span 
                                className="flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold"
                                style={{ 
                                  backgroundColor: isActive ? 'white' : 'black',
                                  color: isActive ? 'black' : 'white'
                                }}
                              >
                                {item.badge}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Profile Section */}
          <div className={`flex-shrink-0 border-t border-gray-100 ${isCollapsed ? 'p-2.5' : 'p-3'} bg-white`}>
            {!isCollapsed ? (
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative flex-shrink-0 transition-all duration-300 ease-out hover:scale-105">
                  <div className="absolute inset-0 rounded-full blur opacity-30" style={{ backgroundColor: logoColor }}></div>
                  <div 
                    className="relative h-8 w-8 rounded-full flex items-center justify-center shadow-sm gradient-primary"
                  >
                    <span className="text-white font-bold text-[11px]">{getDisplayInitial()}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate text-black" title={currentUser.name}>
                    {currentUser.name}
                  </p>
                  <p className="text-[9px] truncate text-gray-600" title={currentUser.email}>
                    {currentUser.email}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-[9px] flex items-center transition-all duration-300 ease-out mt-0.5 hover:translate-x-0.5 text-black hover:text-gray-700"
                  >
                    <LogOut className="h-2.5 w-2.5 mr-1 transition-transform duration-300 ease-out text-black" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative transition-all duration-300 ease-out hover:scale-105">
                  <div className="absolute inset-0 rounded-full blur opacity-30" style={{ backgroundColor: logoColor }}></div>
                  <div 
                    className="relative h-7 w-7 rounded-full flex items-center justify-center shadow-sm gradient-primary"
                  >
                    <span className="text-white font-bold text-[9px]">{getDisplayInitial()}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-0.5 rounded-lg transition-all duration-300 ease-out hover:scale-110 text-black hover:text-gray-700"
                  title="Sign out"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <style>{`
            /* Custom Scrollbar Styles */
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: var(--color-primary-main);
            }
            
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
              height: 4px;
            }
            
            .custom-scrollbar::-webkit-scrollbar-track {
              background: var(--color-primary-main);
              border-radius: 10px;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: var(--color-primary-main);
              border-radius: 10px;
              transition: background 0.3s ease;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: var(--color-primary-main);
            }
            
            .custom-scrollbar::-webkit-scrollbar-corner {
              background: transparent;
            }
            
            /* Active Menu Item Styles */
            .active-menu-item {
              position: relative;
              background: var(--color-primary-main);
              border-radius: 8px;
              transform: scale(1);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .active-menu-item:hover {
              background: var(--color-primary-main);
              transform: scale(1.02);
            }
            
            .active-menu-item::before {
              display: none;
            }
            
            /* Firefox Scrollbar */
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: var(--color-primary-main) var(--color-primary-ultralight);
            }
          `}</style>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-3 left-3 z-20">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg bg-white shadow-lg border border-gray-200 transition-all duration-300 ease-out hover:scale-105"
        >
          <Menu className="h-4 w-4 text-black" />
        </button>
      </div>
    </>
  );
};

export default React.memo(Sidebar);