import React, { useState, useEffect } from 'react';
import { TrackedEvent } from './types';
import { 
  calculateTimePassed, 
  displayReadableDate, 
  DEFAULT_TRACKED_EVENTS, 
  NEO_COLORS,
  getEventAchievement
} from './utils';
import DynamicIcon from './components/DynamicIcon';
import MilestoneDetailModal from './components/MilestoneDetailModal';
import MilestoneFormModal from './components/MilestoneFormModal';
import AchievementsModal from './components/AchievementsModal';
import appLogo from './assets/images/app_logo_1780152166717.png';

// Firebase Auth & Firestore imports
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0 bg-white p-0.5 rounded-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function App() {
  // State for events database
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  
  // UX State
  const [tickerTick, setTickerTick] = useState(0); // Periodic forced state ticker
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'oldest' | 'newest' | 'alphabetical' | 'pinned'>('pinned');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  
  // Backup / JSON Export states
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [backupMessage, setBackupMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Modal control states
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<TrackedEvent | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TrackedEvent | null>(null);

  // Authentication & Sync State variables
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<{ displayName: string; uid: string } | null>(() => {
    try {
      const saved = localStorage.getItem('chrono_guest_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isRenamingGuest, setIsRenamingGuest] = useState(false);
  const [tempGuestName, setTempGuestName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [localTrackerCount, setLocalTrackerCount] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

  // Progressive Web App Installation State Engine
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isInstallBannerDismissed, setIsInstallBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chrono_install_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [activeInstallGuideType, setActiveInstallGuideType] = useState<'ios' | 'android' | 'desktop' | null>(null);

  const [coffeeCount, setCoffeeCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('chrono_coffee_count');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [activeCoffeeReminder, setActiveCoffeeReminder] = useState<{
    type: 'milestone' | 'submilestone' | 'system';
    title: string;
    detail: string;
    daysInfo?: string;
    show: boolean;
  } | null>(null);

  const [welcomeReminderShown, setWelcomeReminderShown] = useState(false);

  // Listen to Chrome PWA prompt requirements
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleInstalled = () => {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const triggerInstallPrompt = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA installer result outcome: ${outcome}`);
        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (err) {
        console.warn("PWA standalone installer failure", err);
      }
      return;
    }

    // Auto-detect browser/platform on click to instantly route or inform
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                  (/Macintosh/i.test(userAgent) && (navigator.maxTouchPoints > 1 || 'ontouchend' in document));
    const isAndroid = /Android/i.test(userAgent);

    if (isIOS) {
      setActiveInstallGuideType('ios');
    } else if (isAndroid) {
      setActiveInstallGuideType('android');
    } else {
      setActiveInstallGuideType('desktop');
    }
  };

  // 1. Listen for standard Firebase Auth states
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        setIsAuthModalOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Local fallback checker count to trigger Sync UI
  useEffect(() => {
    const checkLocal = () => {
      try {
        const saved = localStorage.getItem('life_milestones_trackers');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLocalTrackerCount(parsed.length);
            return;
          }
        }
      } catch (err) {
        console.error("Local storage sync check parse error", err);
      }
      setLocalTrackerCount(0);
    };
    checkLocal();
  }, [currentUser, syncStatus]);

  // 3. Integrated client synchronization or Firestore snapshot state subscriptions
  useEffect(() => {
    if (isAuthLoading) return;

    if (!currentUser) {
      // Offline mode
      const saved = localStorage.getItem('life_milestones_trackers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as TrackedEvent[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
            return;
          }
        } catch (e) {
          console.error("Failed to load local storage tracked events, using default starter milestones", e);
        }
      }
      setEvents(DEFAULT_TRACKED_EVENTS);
      return;
    }

    // Cloud mode (real-time listener on active user's subcollection)
    const milestonesCollection = collection(db, 'users', currentUser.uid, 'milestones');
    const unsubscribe = onSnapshot(milestonesCollection, (snapshot) => {
      const fbEvents: TrackedEvent[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let formattedStartDate = data.startDate;
        if (data.startDate && typeof data.startDate !== 'string' && typeof data.startDate.toDate === 'function') {
          formattedStartDate = data.startDate.toDate().toISOString();
        }
        return {
          id: docSnap.id,
          title: data.title,
          startDate: formattedStartDate,
          icon: data.icon,
          color: data.color,
          category: data.category,
          description: data.description || '',
          isPinned: !!data.isPinned,
          unitPreference: data.unitPreference || 'detailed',
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          endDate: data.endDate || undefined,
          subMilestones: data.subMilestones || [],
          moments: data.moments || []
        } as TrackedEvent;
      });
      setEvents(fbEvents);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/milestones`);
    });

    return () => unsubscribe();
  }, [currentUser, isAuthLoading]);

  // Keep selectedEventForDetail synchronized when events collection is modified
  useEffect(() => {
    if (selectedEventForDetail) {
      const match = events.find(e => e.id === selectedEventForDetail.id);
      if (match) {
        setSelectedEventForDetail(match);
      }
    }
  }, [events, selectedEventForDetail?.id]);

  // Sync action to push guest trackers into authenticated account
  const handleSyncLocalStorageToCloud = async () => {
    if (!currentUser) return;
    setSyncStatus('syncing');
    try {
      const saved = localStorage.getItem('life_milestones_trackers');
      if (saved) {
        const localEvents = JSON.parse(saved) as TrackedEvent[];
        if (Array.isArray(localEvents) && localEvents.length > 0) {
          const batch = writeBatch(db);
          localEvents.forEach((evt) => {
            const newId = evt.id.startsWith('evt-') ? evt.id : 'evt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
            const ref = doc(db, 'users', currentUser.uid, 'milestones', newId);
            batch.set(ref, {
              title: evt.title,
              startDate: evt.startDate,
              icon: evt.icon,
              color: evt.color,
              category: evt.category,
              description: evt.description || "",
              isPinned: !!evt.isPinned,
              unitPreference: evt.unitPreference || 'detailed',
              userId: currentUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          });
          await batch.commit();
          localStorage.removeItem('life_milestones_trackers');
          setLocalTrackerCount(0);
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 4000);
        } else {
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 2000);
        }
      } else {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (err) {
      console.error("Failed to sync offline milestones to account database", err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  const handleDeclineSync = () => {
    localStorage.removeItem('life_milestones_trackers');
    setLocalTrackerCount(0);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error && error.code === 'auth/popup-closed-by-user') {
        console.warn("User closed the Google Sign In popup.");
        setAuthError("Sign in cancelled: You closed the login screen before finishing setup.");
        setTimeout(() => setAuthError(null), 4000);
      } else {
        console.error("Failed Google Authentication Popup flow", error);
        setAuthError(error && error.message ? `Sign in failed: ${error.message}` : "Failed to sign in. Please try again.");
        setTimeout(() => setAuthError(null), 5000);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setEvents([]);
    } catch (error) {
      console.error("Failed signing out from Firebase", error);
    }
  };

  const triggerRandomCoffeeReminder = (customMessage?: string) => {
    if (events.length === 0) {
      setActiveCoffeeReminder({
        type: 'system',
        title: 'Time to Brew!',
        detail: customMessage || "You do not have any tracker events yet. Start your first milestone tracking today!",
        show: true
      });
      return;
    }

    const randType = Math.random() > 0.4 ? 'milestone' : 'submilestone';
    
    if (randType === 'milestone') {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      const timePassed = calculateTimePassed(randomEvent.startDate);
      const isFuture = new Date(randomEvent.startDate).getTime() > Date.now();
      
      // Calculate a beautiful human-readable narrative duration
      const parts: string[] = [];
      const absY = Math.abs(timePassed.years);
      const absM = Math.abs(timePassed.months);
      const absD = Math.abs(timePassed.days);
      if (absY > 0) parts.push(`${absY} year${absY > 1 ? 's' : ''}`);
      if (absM > 0) parts.push(`${absM} month${absM > 1 ? 's' : ''}`);
      parts.push(`${absD} day${absD !== 1 ? 's' : ''}`);
      const durationStr = parts.join(', ');

      const calculatedDetail = isFuture 
        ? `You have ${durationStr} remaining until the event "${randomEvent.title}" begins!`
        : `You have successfully pursued and tracked "${randomEvent.title}" for ${durationStr} already! Keep up the momentum.`;

      setActiveCoffeeReminder({
        type: 'milestone',
        title: customMessage || `Coffee Fuel Insight`,
        detail: calculatedDetail,
        daysInfo: isFuture ? "COUNTDOWN SEQUENCE ACTIVE ⏰" : "CHRONOLOGICAL MOMENTUM 🔥",
        show: true
      });
    } else {
      const allSubs: { eventTitle: string; subTitle: string; targetDate: string }[] = [];
      events.forEach(evt => {
        if (evt.targetMilestones && evt.targetMilestones.length > 0) {
          evt.targetMilestones.forEach(sub => {
            allSubs.push({
              eventTitle: evt.title,
              subTitle: sub.title,
              targetDate: sub.targetDate
            });
          });
        }
      });

      if (allSubs.length === 0) {
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        const timePassed = calculateTimePassed(randomEvent.startDate);
        const parts: string[] = [];
        const absY = Math.abs(timePassed.years);
        const absM = Math.abs(timePassed.months);
        const absD = Math.abs(timePassed.days);
        if (absY > 0) parts.push(`${absY} year${absY > 1 ? 's' : ''}`);
        if (absM > 0) parts.push(`${absM} month${absM > 1 ? 's' : ''}`);
        parts.push(`${absD} day${absD !== 1 ? 's' : ''}`);
        const durationStr = parts.join(', ');

        setActiveCoffeeReminder({
          type: 'milestone',
          title: customMessage || `Coffee Fuel Insight`,
          detail: `Your tracking timer for "${randomEvent.title}" is active and healthy! Total progress: ${durationStr}.`,
          daysInfo: "TRACKER SYSTEM GREEN ✔",
          show: true
        });
      } else {
        const randomSub = allSubs[Math.floor(Math.random() * allSubs.length)];
        const subTime = calculateTimePassed(randomSub.targetDate);
        const isSubFuture = new Date(randomSub.targetDate).getTime() > Date.now();
        
        const parts: string[] = [];
        const absY = Math.abs(subTime.years);
        const absM = Math.abs(subTime.months);
        const absD = Math.abs(subTime.days);
        if (absY > 0) parts.push(`${absY} year${absY > 1 ? 's' : ''}`);
        if (absM > 0) parts.push(`${absM} month${absM > 1 ? 's' : ''}`);
        parts.push(`${absD} day${absD !== 1 ? 's' : ''}`);
        const durationStr = parts.join(', ');

        const subDetail = isSubFuture
          ? `You have ${durationStr} left until the sub-milestone "${randomSub.subTitle}" (under "${randomSub.eventTitle}") arrives.`
          : `It has been ${durationStr} since the sub-milestone "${randomSub.subTitle}" of "${randomSub.eventTitle}" was passed.`;

        setActiveCoffeeReminder({
          type: 'submilestone',
          title: customMessage || `Caffeine Pulse`,
          detail: subDetail,
          daysInfo: isSubFuture ? "TARGET DEADLINE APPROACHING 🎯" : "TARGET COMPLETED / PASSED 🏆",
          show: true
        });
      }
    }
  };

  const handleDrinkCoffee = () => {
    const nextCount = coffeeCount + 1;
    setCoffeeCount(nextCount);
    localStorage.setItem('chrono_coffee_count', nextCount.toString());
    
    const actions = [
      "☕ Espresso Shot Loaded!",
      "☕ Fresh Cappuccino Brewed!",
      "☕ Cold Brew down the hatch!",
      "☕ Warm Flat White enjoyed!",
      "☕ Caramel Latte savored in style!",
      "☕ Tracking Caffeine boost activated!"
    ];
    const randAction = actions[Math.floor(Math.random() * actions.length)];
    triggerRandomCoffeeReminder(randAction);
  };

  // Welcome trigger effect
  useEffect(() => {
    if (events && events.length > 0 && !welcomeReminderShown) {
      setWelcomeReminderShown(true);
      const timer = setTimeout(() => {
        triggerRandomCoffeeReminder("☕ Welcome back Fuel Reminder!");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [events, welcomeReminderShown]);

  const handleGuestSignIn = (customName?: string) => {
    const prefixes = ['Chrono', 'Astro', 'Neo', 'Solar', 'Lunar', 'Apex', 'Zenith', 'Tempo', 'Quant', 'Vectra'];
    const subjects = ['Nomad', 'Explorer', 'Wanderer', 'Tracker', 'Cosmonaut', 'Pioneer', 'Sentinel', 'Pilot', 'Runner', 'Keeper'];
    const randomPref = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSubj = subjects[Math.floor(Math.random() * subjects.length)];
    const randomNumber = Math.floor(100 + Math.random() * 900);
    const chosenName = customName || `${randomPref}${randomSubj} #${randomNumber}`;
    
    const profile = {
      uid: 'guest-' + Math.random().toString(36).substring(2, 11),
      displayName: chosenName,
      createdAt: new Date().toISOString()
    };
    setGuestUser(profile);
    localStorage.setItem('chrono_guest_profile', JSON.stringify(profile));
    setAuthError(null);
  };

  const handleRenameGuest = (newName: string) => {
    if (!newName.trim()) return;
    setGuestUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, displayName: newName.trim() };
      localStorage.setItem('chrono_guest_profile', JSON.stringify(updated));
      return updated;
    });
    setIsRenamingGuest(false);
  };

  // 2. Persistent State Changes Sync (Offline mode fallback)
  const saveEventsToStorage = (updatedEvents: TrackedEvent[]) => {
    setEvents(updatedEvents);
    localStorage.setItem('life_milestones_trackers', JSON.stringify(updatedEvents));
  };

  // 3. Realtime Ticker Pulse (Syncs count up once per second for all cards)
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute computed list of unique categories dynamically
  const availableCategories: string[] = [
    'All', 
    ...events.map(e => e.category).filter((val, idx, self) => self.indexOf(val) === idx)
  ];

  // Core actions resolving cloud/offline tiers uniformly
  const handleCreateOrUpdateEvent = async (payload: Omit<TrackedEvent, 'id' | 'isPinned'> & { id?: string, isPinned?: boolean }) => {
    if (currentUser) {
      try {
        if (payload.id) {
          // Update cloud document
          const eventRef = doc(db, 'users', currentUser.uid, 'milestones', payload.id);
          const existing = events.find(e => e.id === payload.id);
          const subMilestones = existing?.subMilestones || [];
          const moments = existing?.moments || [];
          
          await updateDoc(eventRef, {
            title: payload.title,
            startDate: payload.startDate,
            icon: payload.icon,
            color: payload.color,
            category: payload.category,
            description: payload.description || "",
            unitPreference: payload.unitPreference || 'detailed',
            isPinned: payload.isPinned !== undefined ? payload.isPinned : false,
            endDate: payload.endDate || null,
            subMilestones,
            moments,
            updatedAt: serverTimestamp()
          });
          // Update focal view if open
          if (selectedEventForDetail?.id === payload.id) {
            setSelectedEventForDetail(prev => prev ? { ...prev, ...payload, subMilestones, moments } : null);
          }
        } else {
          // Create new cloud document
          const newId = 'evt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
          const eventRef = doc(db, 'users', currentUser.uid, 'milestones', newId);
          await setDoc(eventRef, {
            title: payload.title,
            startDate: payload.startDate,
            icon: payload.icon,
            color: payload.color,
            category: payload.category,
            description: payload.description || "",
            isPinned: false,
            unitPreference: payload.unitPreference || 'detailed',
            endDate: payload.endDate || null,
            subMilestones: [],
            moments: [],
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        setIsFormModalOpen(false);
        setEditingEvent(null);
      } catch (err) {
        handleFirestoreError(err, payload.id ? OperationType.UPDATE : OperationType.CREATE, `users/${currentUser.uid}/milestones/${payload.id || 'new'}`);
      }
    } else {
      // Local Database state changes
      if (payload.id) {
        const updated = events.map(e => {
          if (e.id === payload.id) {
            return {
              ...e,
              title: payload.title,
              startDate: payload.startDate,
              icon: payload.icon,
              color: payload.color,
              category: payload.category,
              description: payload.description,
              unitPreference: payload.unitPreference,
              isPinned: payload.isPinned ?? e.isPinned,
              endDate: payload.endDate,
              subMilestones: e.subMilestones || [],
              moments: e.moments || []
            };
          }
          return e;
        });
        saveEventsToStorage(updated);
        
        // Update modal selected focus if active
        if (selectedEventForDetail?.id === payload.id) {
          const matching = updated.find(x => x.id === payload.id);
          if (matching) setSelectedEventForDetail(matching);
        }
      } else {
        // Create new locally
         const newEvent: TrackedEvent = {
          id: 'evt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          title: payload.title,
          startDate: payload.startDate,
          icon: payload.icon,
          color: payload.color,
          category: payload.category,
          description: payload.description,
          isPinned: false,
          unitPreference: payload.unitPreference || 'detailed',
          endDate: payload.endDate,
          subMilestones: [],
          moments: []
        };
        saveEventsToStorage([newEvent, ...events]);
      }
      setIsFormModalOpen(false);
      setEditingEvent(null);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'milestones', id));
        if (selectedEventForDetail?.id === id) {
          setSelectedEventForDetail(null);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/milestones/${id}`);
      }
    } else {
      const filtered = events.filter(e => e.id !== id);
      saveEventsToStorage(filtered);
      if (selectedEventForDetail?.id === id) {
        setSelectedEventForDetail(null);
      }
    }
  };

  const handleTogglePinEvent = async (id: string) => {
    const targetEvent = events.find(e => e.id === id);
    if (!targetEvent) return;

    if (currentUser) {
      try {
        const eventRef = doc(db, 'users', currentUser.uid, 'milestones', id);
        await updateDoc(eventRef, {
          isPinned: !targetEvent.isPinned,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/milestones/${id}`);
      }
    } else {
      const updated = events.map(e => {
        if (e.id === id) {
          return { ...e, isPinned: !e.isPinned };
        }
        return e;
      });
      saveEventsToStorage(updated);
      
      // Update focal view if open
      if (selectedEventForDetail?.id === id) {
        const matching = updated.find(x => x.id === id);
        if (matching) setSelectedEventForDetail(matching);
      }
    }
  };

  const handleDirectUpdateEvent = async (updatedEvent: TrackedEvent) => {
    if (currentUser) {
      try {
        const eventRef = doc(db, 'users', currentUser.uid, 'milestones', updatedEvent.id);
        
        // Explicitly map properties and clean undefined values to prevent Firestore serialization crash
        const updatePayload: any = {
          title: updatedEvent.title,
          startDate: updatedEvent.startDate,
          icon: updatedEvent.icon,
          color: updatedEvent.color,
          category: updatedEvent.category,
          description: updatedEvent.description || "",
          unitPreference: updatedEvent.unitPreference || 'detailed',
          isPinned: updatedEvent.isPinned !== undefined ? updatedEvent.isPinned : false,
          endDate: updatedEvent.endDate || null,
          subMilestones: updatedEvent.subMilestones || [],
          moments: updatedEvent.moments || [],
          updatedAt: serverTimestamp()
        };

        await updateDoc(eventRef, updatePayload);
        setSelectedEventForDetail(updatedEvent);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/milestones/${updatedEvent.id}`);
      }
    } else {
      const updated = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      saveEventsToStorage(updated);
      setSelectedEventForDetail(updatedEvent);
    }
  };

  // 4. Filtering and Sorting Logic
  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || e.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    // Standard Sort options
    if (sortBy === 'pinned') {
      // Pinned first, then sorted by oldest milestone (longest running)
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    }
    if (sortBy === 'newest') {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    }
    if (sortBy === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Calculate dynamic stats for bento dashboard
  const totalTrackersCount = events.length;
  
  // Find oldest milestone
  const oldestMilestone = events.reduce<TrackedEvent | null>((acc, curr) => {
    if (!acc) return curr;
    return new Date(curr.startDate).getTime() < new Date(acc.startDate).getTime() ? curr : acc;
  }, null);

  // Find newest milestone
  const newestMilestone = events.reduce<TrackedEvent | null>((acc, curr) => {
    if (!acc) return curr;
    return new Date(curr.startDate).getTime() > new Date(acc.startDate).getTime() ? curr : acc;
  }, null);

  // Format backup text string
  const backupJsonString = JSON.stringify(events, null, 2);

  const handleImportJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBackupMessage(null);
    if (!importJsonText.trim()) {
      setBackupMessage({ text: 'Please paste a valid JSON backup string.', error: true });
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Data must be formatted as an array list of events');
      }

      // Quick validate expected properties
      const isValid = parsed.every(item => {
        return typeof item === 'object' && item !== null && 'title' in item && 'startDate' in item && 'icon' in item;
      });

      if (!isValid) {
        throw new Error('Some trackers are missing required fields (title, startDate, icon).');
      }

      const merged = [...parsed];
      saveEventsToStorage(merged);
      setBackupMessage({ text: `Successfully imported & loaded ${merged.length} trackers!`, error: false });
      setImportJsonText('');
      setTimeout(() => setBackupMessage(null), 5000);
    } catch (err: any) {
      setBackupMessage({ text: `Import failed: ${err.message || 'Malformed JSON format'}`, error: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#1A1A1A] pb-16 font-sans antialiased selection:bg-[#fb923c] selection:text-black">
      
      {/* 📱 Upper Sticky PWA Installation Prompt Overlay */}
      {!isAppInstalled && !isInstallBannerDismissed && (
        <div className="sticky top-0 z-[100] bg-[#e0f2fe] text-black border-b-[3px] border-black p-2.5 px-4 flex justify-between items-center gap-3 transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <DynamicIcon name="Smartphone" size={15} className="text-black shrink-0" />
            <p className="font-sans text-xs text-black font-bold truncate">
              Install ChronoTrak.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={triggerInstallPrompt}
              className="px-2.5 py-1 bg-black text-white hover:bg-black/80 font-mono font-bold text-[10px] uppercase neo-btn-press"
            >
              INSTALL
            </button>
            <button
              onClick={() => {
                setIsInstallBannerDismissed(true);
                try {
                  localStorage.setItem('chrono_install_banner_dismissed', 'true');
                } catch (e) {
                  console.error(e);
                }
              }}
              className="p-1 hover:bg-black/10 text-black shrink-0"
              title="Dismiss"
            >
              <DynamicIcon name="X" size={12} />
            </button>
          </div>
        </div>
      )}
      
      {/* 1. Header Hero Panel with Slick Neobrutalism UI */}
      <header className="bg-[#facc15] neo-border border-b-[4px] p-5 md:p-6 text-[#1A1A1A] relative shadow-[4px_4px_0px_0px_#000]" id="main-header">
        
        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          
          {/* Logo Title area */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <img 
              src={appLogo} 
              alt="ChronoTrak Logo" 
              className="w-12 h-12 md:w-16 md:h-16 neo-border border-[3.5px] border-black shadow-[3px_3px_0px_0px_#000] select-none pointer-events-none rounded-none rotate-[-2deg]"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-black font-sans tracking-tight text-black leading-none">
                ChronoTrak
              </h1>
              <p className="text-xs md:text-sm text-black/80 font-sans mt-2.5 font-bold max-w-xl leading-normal">
                Track the exact years, months, days, and real-time elapsed seconds since your essential life milestones & gym goals.
              </p>
            </div>
          </div>

          {/* Action Header Button Panel */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
            
            <button
              onClick={() => setIsAchievementsModalOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-neutral-100 text-black border-[3.5px] border-black rounded-none font-mono font-black text-xs tracking-tight neo-btn-press shadow-[3px_3px_0px_0px_#000] flex items-center justify-center gap-2"
              id="btn-achievements-list"
            >
              <DynamicIcon name="Award" size={16} className="text-black shrink-0" />
              <span>ACHIEVEMENTS</span>
            </button>

            <button
              onClick={() => {
                if (!currentUser && !guestUser) {
                  setIsAuthModalOpen(true);
                } else {
                  setEditingEvent(null);
                  setIsFormModalOpen(true);
                }
              }}
              className="px-4 py-2.5 bg-[#4ade80] hover:bg-[#22c55e] text-black border-[3.5px] border-black rounded-none font-mono font-black text-xs tracking-tight neo-btn-press shadow-[3px_3px_0px_0px_#000] flex items-center justify-center gap-2"
              id="btn-add-milestone"
            >
              <DynamicIcon name="Plus" size={16} className="shrink-0" />
              <span>START EVENT</span>
            </button>

            {/* Google Authentication Control */}
            {isAuthLoading ? (
              <div className="px-4 py-2.5 bg-white/40 border-[3.5px] border-black rounded-none text-xs font-mono font-black text-black flex items-center justify-center gap-1.5 animate-pulse">
                <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>LOADING...</span>
              </div>
            ) : currentUser || guestUser ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white border-[3.5px] border-black p-2 px-3.5 shadow-[3.5px_3.5px_0px_0px_#000000] text-black rounded-none">
                {isRenamingGuest ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRenameGuest(tempGuestName);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={tempGuestName}
                      onChange={(e) => setTempGuestName(e.target.value)}
                      maxLength={30}
                      className="px-2 py-1 text-xs font-mono bg-white border-[2px] border-black outline-none focus:ring-1 focus:ring-purple-450 w-[110px]"
                      autoFocus
                      placeholder="Guest Name"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 bg-[#4ade80] border-[2px] border-black text-[9px] font-mono font-black neo-btn-press uppercase"
                    >
                      SAVE
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRenamingGuest(false)}
                      className="px-1.5 py-1 bg-white border-[2px] border-black text-[9px] font-mono font-black neo-btn-press"
                    >
                      X
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-black shrink-0 animate-pulse"></span>
                    <span 
                      className="font-mono text-xs font-black truncate max-w-[130px] flex items-center gap-1 text-black cursor-default select-none"
                      title={currentUser ? (currentUser.displayName || currentUser.email || "USER") : guestUser?.displayName}
                    >
                      <span>{currentUser ? '☁️' : '👤'}</span>
                      <span>{(currentUser ? (currentUser.displayName || currentUser.email || "USER") : (guestUser?.displayName || "GUEST")).split(" ")[0].toUpperCase()}</span>
                    </span>
                    {!currentUser && (
                      <button
                        onClick={() => {
                          setTempGuestName(guestUser?.displayName || '');
                          setIsRenamingGuest(true);
                        }}
                        className="text-black/55 hover:text-black p-0.5 hover:bg-black/5 rounded cursor-pointer flex items-center justify-center transition-colors"
                        title="Edit Guest Name"
                      >
                        <DynamicIcon name="Edit" size={12} />
                      </button>
                    )}
                  </div>
                )}
                
                <div className="hidden sm:block h-5 w-[1.5px] bg-black/20 shrink-0" />

                <div className="flex gap-2 shrink-0 justify-end items-center">
                  {!currentUser && (
                    <button
                      onClick={handleGoogleSignIn}
                      className="px-2.5 py-1 bg-[#c084fc] hover:bg-[#a855f7] border-[2px] border-black rounded-none font-mono text-[9px] font-black neo-btn-press tracking-wider text-black block shrink-0 uppercase"
                      title="Sync data with Google"
                    >
                      SYNC UP
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (currentUser) {
                        handleSignOut();
                      } else {
                        setGuestUser(null);
                        localStorage.removeItem('chrono_guest_profile');
                      }
                    }}
                    className="px-2.5 py-0.5 sm:py-1 bg-[#f87171] hover:bg-[#ef4444] border-[2px] border-black rounded-none font-mono text-[9px] font-black neo-btn-press tracking-wider text-black block shrink-0 uppercase"
                    title="Logout"
                  >
                    LOGOUT
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2.5 bg-[#a78bfa] hover:bg-[#8b5cf6] text-black border-[3.5px] border-black shadow-[3px_3px_0px_0px_#000] rounded-none font-mono font-black text-xs tracking-tight neo-btn-press flex items-center justify-center gap-2"
              >
                <DynamicIcon name="LogIn" size={16} />
                <span>SIGN IN</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Auth Error Feedback Banner */}
      {authError && (
        <div className="bg-[#f87171] border-b-[4px] border-black p-3 font-sans text-xs md:text-sm text-black font-semibold tracking-tight transition-all">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block p-1 bg-white border-[2.5px] border-black">
                <DynamicIcon name="AlertTriangle" size={14} className="text-[#1A1A1A] inline animate-bounce" />
              </span>
              <span>{authError}</span>
            </div>
            <button 
              onClick={() => setAuthError(null)}
              className="text-black hover:text-black/80 font-mono text-[10px] font-bold underline cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Cloud Merge and Sync Hub Prompt Banner */}
      {currentUser && localTrackerCount > 0 && (
        <div className="bg-[#fde047] border-b-[4px] border-black p-3 md:p-3.5 font-sans text-xs text-black font-semibold tracking-tight transition-all">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-block p-1 bg-white border-[2px] border-black shrink-0">
                <DynamicIcon name="CloudLightning" size={13} className="text-black" />
              </span>
              <span className="leading-snug">
                You have <strong>{localTrackerCount}</strong> offline trackers saved on this local browser. Merge them to your Cloud account?
              </span>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto mt-1 md:mt-0 justify-end shrink-0">
              <button
                onClick={handleDeclineSync}
                className="px-3 py-1.5 bg-white hover:bg-neutral-100 border-[2.5px] border-black text-black font-mono text-[10px] md:text-xs font-bold neo-btn-press uppercase tracking-wider"
              >
                No
              </button>
              <button
                onClick={handleSyncLocalStorageToCloud}
                disabled={syncStatus === 'syncing'}
                className="px-3 py-1.5 bg-[#4ade80] hover:bg-[#22c55e] border-[2.5px] border-black text-black font-mono text-[10px] md:text-xs font-bold neo-btn-press uppercase tracking-wider flex items-center gap-1.5 justify-center min-w-[125px]"
              >
                {syncStatus === 'syncing' ? (
                  <span>Syncing...</span>
                ) : syncStatus === 'success' ? (
                  <>
                    <DynamicIcon name="Check" size={12} />
                    <span>Merged!</span>
                  </>
                ) : (
                  <>
                    <DynamicIcon name="CloudUpload" size={11} />
                    <span>Cloud Merge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caffeinated Chrono Reminder Modal Overlay */}
      {activeCoffeeReminder && activeCoffeeReminder.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" id="coffee-reminder-modal">
          {/* Backdrop Closer */}
          <div className="absolute inset-0 cursor-default" onClick={() => setActiveCoffeeReminder(prev => prev ? { ...prev, show: false } : null)} />
          
          {/* Modal Container */}
          <div className="w-full max-w-sm bg-[#fffbeb] border-[4px] border-black text-black p-5 md:p-6 shadow-[8px_8px_0px_0px_#000000] relative z-10 flex flex-col space-y-4 select-none">
            {/* Header */}
            <div className="flex justify-between items-center border-b-[3px] border-black pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-block p-1.5 bg-[#f59e0b] border-[2px] border-black shadow-[2px_2px_0px_#000] rotate-[-3deg]">
                  <DynamicIcon name="Coffee" size={16} className="text-white shrink-0" />
                </span>
                <span className="font-mono text-xs font-black uppercase text-amber-950 tracking-wider">
                  Chrono Fuel Insight
                </span>
              </div>
              <button
                onClick={() => setActiveCoffeeReminder(prev => prev ? { ...prev, show: false } : null)}
                className="p-1.5 hover:bg-black/5 border-[2px] border-black rounded-none neo-btn-press"
              >
                <DynamicIcon name="X" size={14} />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-black uppercase bg-[#facc15] text-black px-1.5 py-0.5 border-2 border-black inline-block shadow-[1.5px_1.5px_0px_0px_#000]">
                {activeCoffeeReminder.title}
              </span>
              <p className="font-bold text-black text-sm md:text-base leading-snug">
                {activeCoffeeReminder.detail}
              </p>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t-[2.5px] border-black flex gap-2.5 justify-end">
              <button
                onClick={() => triggerRandomCoffeeReminder("☕ Next Coffee Insight!")}
                className="px-3.5 py-2 bg-white hover:bg-neutral-100 border-[2.5px] border-black rounded-none font-mono text-[10px] font-black text-black neo-btn-press shadow-[2.5px_2.5px_0px_#000] uppercase"
              >
                Random Insight
              </button>
              <button 
                onClick={() => setActiveCoffeeReminder(prev => prev ? { ...prev, show: false } : null)}
                className="px-4 py-2 bg-black hover:bg-neutral-900 text-white border-[2.5px] border-black rounded-none font-mono text-[10px] font-black neo-btn-press shadow-[2.5px_2.5px_0px_#000] uppercase"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Bento Statistics Dashboard Block */}
      <section className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="bento-statistics">
        
        {/* Total Active Count */}
        <div className="bg-white neo-border border-[3.5px] p-5 neo-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-black/50 block tracking-widest">
              MONITORED TRACKERS
            </span>
            <span className="text-3xl md:text-4xl font-extrabold font-mono text-black">
              {totalTrackersCount}
            </span>
            <span className="text-xs font-mono text-black/60 block mt-1">Active live instances</span>
          </div>
          <div className="p-4 bg-[#c084fc] neo-border border-[2.5px]">
            <DynamicIcon name="Clock" size={28} />
          </div>
        </div>

        {/* Older Milestone */}
        <div className="bg-white neo-border border-[3.5px] p-5 neo-shadow flex items-center justify-between col-span-1">
          <div className="min-w-0 flex-1 pr-3">
            <span className="text-[10px] font-mono font-bold uppercase text-black/50 block tracking-widest">
              LONGEST TRACKED MILESTONE
            </span>
            <span className="text-lg font-bold font-sans text-black truncate block mt-1">
              {oldestMilestone ? oldestMilestone.title : 'None'}
            </span>
            <span className="text-xs font-mono text-[#fb923c] block font-bold mt-0.5">
              {oldestMilestone ? `${Math.abs(calculateTimePassed(oldestMilestone.startDate).totalDays).toLocaleString()} days passed` : 'Not available'}
            </span>
          </div>
          <div className="p-4 bg-[#60a5fa] neo-border border-[2.5px] shrink-0">
            <DynamicIcon name="Trophy" size={28} />
          </div>
        </div>

        {/* Newest Milestone */}
        <div className="bg-white neo-border border-[3.5px] p-5 neo-shadow flex items-center justify-between col-span-1">
          <div className="min-w-0 flex-1 pr-3">
            <span className="text-[10px] font-mono font-bold uppercase text-black/50 block tracking-widest">
              LATEST TRACKER
            </span>
            <span className="text-lg font-bold font-sans text-black truncate block mt-1">
              {newestMilestone ? newestMilestone.title : 'None'}
            </span>
            <span className="text-xs font-mono text-[#4ade80] block font-bold mt-0.5">
              {newestMilestone ? `${Date.parse(newestMilestone.startDate) > Date.now() ? 'Counting down' : 'Counting up'}` : 'Not available'}
            </span>
          </div>
          <div className="p-4 bg-[#fb7185] neo-border border-[2.5px] shrink-0">
            <DynamicIcon name="Sparkles" size={28} />
          </div>
        </div>

        {/* Coffee Presentation & Fuel Station */}
        <div className="bg-[#fffbeb] border-[#facc15] border-[3.5px] p-5 neo-border neo-shadow flex flex-col justify-between" id="coffee-station-widget">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-black uppercase text-amber-800 tracking-wider block">
                COFFEE FUEL STATION
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-black block mt-1">
                {coffeeCount} CUPS ☕
              </span>
              <p className="text-[10px] sm:text-xs text-black/70 font-semibold mt-1 leading-snug line-clamp-2">
                Drink coffee to get random reminders and rank up your achievements!
              </p>
            </div>
            <div className="p-3 bg-[#eab308] border-[2px] border-black shrink-0 relative">
              <span className="text-xl">☕</span>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-black text-[7px] font-black items-center justify-center text-white">+1</span>
              </span>
            </div>
          </div>
          <button
            onClick={handleDrinkCoffee}
            className="mt-3 w-full py-1.5 bg-[#facc15] hover:bg-[#eab308] text-black border-[2px] border-black font-mono font-black text-[10px] sm:text-xs uppercase tracking-wider neo-btn-press shadow-[2px_2px_0px_0px_#000] flex items-center justify-center gap-1.5"
            id="drink-coffee-btn"
          >
            <DynamicIcon name="Coffee" size={13} className="shrink-0" />
            <span>DRINK COFFEE</span>
          </button>
        </div>
      </section>

      {/* 3. Portability Backup Panel (Collapsible) */}
      {showBackupPanel && (
        <section className="max-w-7xl mx-auto px-4 pt-6 animate-fade-in" id="backup-portability-root">
          <div className="bg-white neo-border border-[4px] p-5 neo-shadow-lg rounded-none space-y-4">
            <div className="flex items-center justify-between border-b-[3px] border-black pb-3">
              <div className="flex items-center gap-2">
                <DynamicIcon name="ArrowUpDown" className="text-black" size={20} />
                <h3 className="font-bold font-sans text-lg uppercase tracking-tight">
                  DATABASE PORTABILITY & BACKUP INTEGRITY
                </h3>
              </div>
              <button 
                onClick={() => setShowBackupPanel(false)}
                className="p-1 border-[2px] border-black bg-[#fb7185] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <DynamicIcon name="X" size={16} />
              </button>
            </div>

            {backupMessage && (
              <div className={`p-3 neo-border border-[2.5px] font-mono text-xs ${backupMessage.error ? 'bg-[#fb7185]/20 border-[#fb7185]' : 'bg-[#4ade80]/20 border-[#4ade80]'}`}>
                <span className="font-bold">{backupMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Copy data backup */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-black/60 block">
                  📂 EXPORT TRACKERS CONFIGURATION STRING
                </span>
                <p className="text-xs text-black/70 font-sans">
                  Keep your data safe from browser cleans! Copy the text content below and paste it somewhere safe (e.g., cloud drafts, emails) as a secure manual file snapshot:
                </p>
                <textarea
                  readOnly
                  value={backupJsonString}
                  className="w-full h-[150px] bg-[#F4F2EE] neo-border border-[2.5px] p-2.5 font-mono text-xs focus:ring-0 focus:outline-none focus:border-black rounded-none select-all"
                  onClick={(e) => {
                    const el = e.currentTarget;
                    el.select();
                    navigator.clipboard.writeText(backupJsonString);
                    setBackupMessage({ text: 'Backup string copied to clipboard!', error: false });
                    setTimeout(() => setBackupMessage(null), 3000);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(backupJsonString);
                    setBackupMessage({ text: 'Backup string successfully exported to your clipboard!', error: false });
                    setTimeout(() => setBackupMessage(null), 3000);
                  }}
                  className="px-3.5 py-2 bg-black text-white font-mono text-xs font-bold neo-border border-sm shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                >
                  COPY EXPORT KEY TO CLIPBOARD
                </button>
              </div>

              {/* Import backup */}
              <form onSubmit={handleImportJsonSubmit} className="space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase text-black/60 block">
                    📥 IMPORT BACKUP FROM SNAPSHOT
                  </span>
                  <p className="text-xs text-black/70 font-sans">
                    Transfer and run milestones on another browser or device! Paste the exact JSON backup configuration string you copied previously in this container:
                  </p>
                  <textarea
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder='Paste backup content array here e.g. [{"title": "Example", ...}]...'
                    className="w-full h-[150px] bg-white text-black neo-border border-[2.5px] p-2.5 font-mono text-xs focus:ring-0 focus:outline-none focus:border-black rounded-none placeholder-black/30"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#facc15] text-black font-mono text-xs font-bold neo-border border-sm shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                >
                  VALIDATE & LOAD BACKUP DATA
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* 4. Filter, Search, Categorization, and Sorted Row */}
      <section className="max-w-7xl mx-auto px-4 pt-8">
        <div className="bg-white neo-border border-[3.5px] p-4 col-span-1 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Input block */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-black/60">
                <DynamicIcon name="Search" size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event names or matching tags..."
                className="w-full bg-[#F4F2EE] text-black font-sans font-bold text-sm p-3 pl-10 neo-border border-[2.5px] rounded-none focus:outline-none focus:ring-1 focus:ring-black placeholder-black/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-black/40 hover:text-black"
                >
                  <DynamicIcon name="X" size={16} />
                </button>
              )}
            </div>

            {/* Sorting Custom Dropdown Menu with Lucide Icons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-black/60 shrink-0">
                Sort:
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center gap-2 bg-white font-mono text-xs font-bold py-2 px-3 md:px-3.5 neo-border border-[2.5px] rounded-none focus:outline-none focus:ring-1 focus:ring-black cursor-pointer text-black"
                >
                  <DynamicIcon 
                    name={
                      sortBy === 'pinned' ? 'Pin' :
                      sortBy === 'oldest' ? 'History' :
                      sortBy === 'newest' ? 'Sparkles' : 'CaseSensitive'
                    } 
                    size={14} 
                    className={sortBy === 'pinned' ? 'fill-black' : ''}
                  />
                  <span>
                    {sortBy === 'pinned' ? 'Pinned First' :
                     sortBy === 'oldest' ? 'Longest Running' :
                     sortBy === 'newest' ? 'Most Recent' : 'Alphabetical'}
                  </span>
                  <DynamicIcon name="ChevronRight" size={11} className="rotate-90 ml-1 transition-transform" />
                </button>

                {isSortDropdownOpen && (
                  <>
                    {/* Overlay to handle backdrop clicks safely */}
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => setIsSortDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-1.5 w-48 bg-white border-[2.5px] border-black text-black z-50 font-mono text-xs shadow-[3px_3px_0px_0px_#000000] divide-y-[1.5px] divide-black">
                      <button
                        type="button"
                        onClick={() => { setSortBy('pinned'); setIsSortDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-left font-bold transition-all hover:bg-[#F4F2EE] ${sortBy === 'pinned' ? 'bg-[#facc15]' : 'bg-white'}`}
                      >
                        <DynamicIcon name="Pin" size={13} className="fill-black" />
                        <span>Pinned First</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSortBy('oldest'); setIsSortDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-left font-bold transition-all hover:bg-[#F4F2EE] ${sortBy === 'oldest' ? 'bg-[#facc15]' : 'bg-white'}`}
                      >
                        <DynamicIcon name="History" size={13} />
                        <span>Longest Running</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSortBy('newest'); setIsSortDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-left font-bold transition-all hover:bg-[#F4F2EE] ${sortBy === 'newest' ? 'bg-[#facc15]' : 'bg-white'}`}
                      >
                        <DynamicIcon name="Sparkles" size={13} />
                        <span>Most Recent</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSortBy('alphabetical'); setIsSortDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-left font-bold transition-all hover:bg-[#F4F2EE] ${sortBy === 'alphabetical' ? 'bg-[#facc15]' : 'bg-white'}`}
                      >
                        <DynamicIcon name="CaseSensitive" size={13} />
                        <span>Alphabetical</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Category quick filter bar */}
          <div className="border-t border-black/10 pt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase text-black/60 shrink-0 mr-1.5 flex items-center gap-1">
              <DynamicIcon name="Filter" size={12} />
              <span>FILTER TAGS:</span>
            </span>
            {availableCategories.map(cat => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-mono font-bold px-3 py-1.5 neo-border border-sm rounded-none neo-btn-press ${selectedCategory.toLowerCase() === cat.toLowerCase() ? 'bg-[#c084fc] text-black' : 'bg-[#F4F2EE] text-black hover:bg-black/5'}`}
              >
                {cat === 'All' ? '🌟 SHOW ALL' : `#${cat}`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Main Milestone Tracking Grid Canvas */}
      <main className="max-w-7xl mx-auto px-4 pt-6" id="milestones-main-canvas">
        {sortedEvents.length === 0 ? (
          
          /* Empty State layout styled in neobrutalism */
          <div className="bg-white neo-border border-[3px] p-8 text-center neo-shadow-md max-w-md mx-auto space-y-4">
            <div className="inline-block p-3 bg-[#facc15] neo-border border-[2px] mx-auto">
              <DynamicIcon name="Calendar" size={32} />
            </div>
            <h2 className="text-sm font-black font-sans uppercase tracking-wider text-black">
              {events.length === 0 ? "No Trackers Yet" : "No Matches Found"}
            </h2>
            <p className="text-xs font-sans text-neutral-600 max-w-xs mx-auto leading-relaxed">
              {events.length === 0 
                ? "Start monitoring your goals now, or initialize the board with sample milestones."
                : "Try clear filters or adjusting your active search query."}
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  if (events.length === 0) {
                    setEvents(DEFAULT_TRACKED_EVENTS);
                    localStorage.setItem('life_milestones_trackers', JSON.stringify(DEFAULT_TRACKED_EVENTS));
                  } else {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }
                }}
                className="px-4 py-1.5 bg-[#60a5fa] hover:bg-[#3b82f6] text-black border-[2px] border-black rounded-none font-mono font-black text-[10px] uppercase tracking-wide neo-btn-press"
              >
                {events.length === 0 ? "Load Demo Trackers" : "Clear Filters"}
              </button>
            </div>
          </div>
        ) : (
          
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="trackers-grid">
            {sortedEvents.map(event => {
              // Calc time pasó
              const referenceDate = event.endDate ? new Date(event.endDate) : undefined;
              const timePassed = calculateTimePassed(event.startDate, referenceDate);
              const colorSpec = NEO_COLORS.find(c => c.value === event.color) || NEO_COLORS[0];
              const isFuture = new Date(event.startDate).getTime() > (referenceDate ? referenceDate.getTime() : Date.now());

              // Determine display values based on customization preference
              const displayPreference = event.unitPreference || 'detailed';
              
              return (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEventForDetail(event)}
                  className={`bg-white neo-border border-[4.5px] rounded-none shadow-[6px_6px_0px_0px_#1A1A1A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#1A1A1A] transition-all cursor-pointer overflow-hidden flex flex-col justify-between`}
                >
                  
                  {/* Card head line */}
                  <div className={`p-4 border-b-[4.5px] border-black ${colorSpec.bgClass} flex items-center justify-between`}>
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <div className="p-1.5 bg-white neo-border-sm border-[2px] shrink-0">
                        <DynamicIcon name={event.icon} className="text-black" size={16} />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase text-black/85 bg-white/45 px-1.5 py-0.5 neo-border-sm border-sm tracking-wide truncate">
                        {event.category}
                      </span>
                      {event.endDate && (
                        <span className="text-[9px] font-mono font-black uppercase text-white bg-emerald-500 px-1.5 py-0.5 border border-black tracking-wide shrink-0 animate-pulse">
                          🏁 ENDED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {event.isPinned && (
                        <div 
                          className="p-1 bg-[#facc15] neo-border-sm border-[2px]" 
                          title="Pinned milestone tracker"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePinEvent(event.id);
                          }}
                        >
                          <DynamicIcon name="Pin" size={12} className="fill-black" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Principal counting payload */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    
                    {/* Item title */}
                    <div>
                      <h3 className="text-lg font-bold font-sans tracking-tight text-black line-clamp-2 leading-tight">
                        {event.title}
                      </h3>
                      <span className="text-[10px] font-mono text-black/50 block mt-1">
                        {event.endDate ? `🏁 CONCLUDED: ${displayReadableDate(event.endDate)}` : `STARTED: ${displayReadableDate(event.startDate)}`}
                      </span>
                    </div>

                    {/* Numeric tracking indicators depending on layout type */}
                    <div className="bg-[#F4F2EE] neo-border border-[2px] p-3 text-center">
                      
                      {displayPreference === 'detailed' && (
                        <div>
                          {/* Year Month Day big numbers */}
                          <div className="flex justify-center items-baseline gap-1 text-black py-1">
                            {Math.abs(timePassed.years) > 0 && (
                              <>
                                <span className="text-2xl font-mono font-black">{Math.abs(timePassed.years)}</span>
                                <span className="text-xs font-mono font-bold text-black/60 pr-1">Y</span>
                              </>
                            )}
                            {Math.abs(timePassed.months) > 0 && (
                              <>
                                <span className="text-2xl font-mono font-black">{Math.abs(timePassed.months)}</span>
                                <span className="text-xs font-mono font-bold text-black/60 pr-1">M</span>
                              </>
                            )}
                            <span className="text-2xl font-mono font-black">{Math.abs(timePassed.days)}</span>
                            <span className="text-xs font-mono font-bold text-black/60">D</span>
                          </div>
                          
                          {/* Sub second timer in real-time with ELAPSED removed */}
                          <div className="text-[10px] font-mono font-bold text-[#fb923c] uppercase tracking-wide mt-1.5 border-t border-black/5 pt-1.5">
                            {Math.abs(timePassed.hours).toString().padStart(2, '0')}H : {Math.abs(timePassed.minutes).toString().padStart(2, '0')}M : {Math.abs(timePassed.seconds).toString().padStart(2, '0')}S
                          </div>
                        </div>
                      )}

                      {displayPreference === 'days' && (
                        <div>
                          <div className="text-4xl font-mono font-black text-black">
                            {Math.abs(timePassed.totalDays).toLocaleString()}
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase text-black/60 block mt-0.5">
                            TOTAL DAYS
                          </span>
                        </div>
                      )}

                      {displayPreference === 'hours' && (
                        <div>
                          <div className="text-2xl font-mono font-black text-black leading-none py-1">
                            {Math.abs(timePassed.totalHours).toLocaleString()}
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase text-black/60 block mt-1">
                            TOTAL HOURS
                          </span>
                        </div>
                      )}

                      {displayPreference === 'seconds' && (
                        <div>
                          <div className="text-xl font-mono font-black text-[#fb7185] truncate leading-none">
                            {Math.abs(timePassed.totalSeconds).toLocaleString()}
                          </div>
                          <span className="text-[9px] font-mono font-bold uppercase text-black/60 block mt-1.5">
                            TOTAL SECONDS TICKED
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Secondary description note preview */}
                    {event.description && (
                      <p className="text-xs text-black/60 line-clamp-2 italic font-sans leading-relaxed">
                        "{event.description}"
                      </p>
                    )}

                    {/* Dynamic Event Milestone Achievement Badge */}
                    {(() => {
                      const ach = getEventAchievement(timePassed.totalDays, isFuture);
                      return (
                        <div className={`border-[2.5px] border-black ${ach.color} p-2.5 rounded-none flex items-start gap-2 text-left shrink-0`}>
                          <span className="text-lg leading-none select-none filter drop-shadow-[1px_1px_0_rgba(0,0,0,0.15)]">{ach.emoji}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[9px] font-black uppercase tracking-wider bg-black text-white px-1 py-0.2 select-none leading-none">
                                {ach.badge}
                              </span>
                              <span className="text-[10px] font-extrabold text-black truncate uppercase tracking-tight leading-none">
                                {ach.title}
                              </span>
                            </div>
                            <p className="text-[9px] text-black/75 leading-tight mt-1 font-medium">
                              {ach.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card quick trigger footer */}
                  <div className="border-t-[3px] border-black bg-[#F4F2EE] p-3 flex justify-between items-center">
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEvent(event);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1 px-2.5 bg-[#60a5fa] hover:bg-[#3b82f6] text-black border-[2px] border-black rounded-none font-mono text-[10px] font-bold neo-btn-press flex items-center gap-1 shrink-0"
                    >
                      <DynamicIcon name="Edit2" size={10} />
                      <span>EDIT</span>
                    </button>

                    <span className="text-[9px] font-mono text-black/50 font-bold uppercase flex items-center gap-1">
                      <span>VIEW</span>
                      <DynamicIcon name="ChevronRight" size={10} className="inline" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 6. MODALS ROOT LAYER */}
      
      {/* Detailed Inspection Drawer */}
      {selectedEventForDetail && (
        <MilestoneDetailModal
          event={selectedEventForDetail}
          onClose={() => setSelectedEventForDetail(null)}
          onEdit={(evt) => {
            setEditingEvent(evt);
            setIsFormModalOpen(true);
          }}
          onDelete={handleDeleteEvent}
          onTogglePin={handleTogglePinEvent}
          onUpdate={handleDirectUpdateEvent}
        />
      )}

      {/* Create / Edit Interactive Dialog */}
      {isFormModalOpen && (
        <MilestoneFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingEvent(null);
          }}
          onSubmit={handleCreateOrUpdateEvent}
          editingEvent={editingEvent}
        />
      )}

      {/* Hall of Achievements Dialog */}
      {isAchievementsModalOpen && (
        <AchievementsModal
          isOpen={isAchievementsModalOpen}
          onClose={() => setIsAchievementsModalOpen(false)}
          events={events}
          coffeeCount={coffeeCount}
        />
      )}

      {/* PWA Auto-detected Platform Installation Popup */}
      {activeInstallGuideType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border-[4px] border-black text-black pointer-events-auto p-6 shadow-[8px_8px_0px_0px_#000000] relative">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b-[3px] border-black pb-3 mb-4">
              <div>
                <span className="font-mono text-[10px] bg-[#fbbf24] border-[1.5px] border-black px-2 py-0.5 rounded-none font-bold uppercase tracking-wider text-black">
                  {activeInstallGuideType === 'ios' ? ' iOS detected' : activeInstallGuideType === 'android' ? 'android detected' : '💻 desktop browser'}
                </span>
                <h3 className="text-lg font-black tracking-tight mt-1 ml-0.5">
                  INSTALL TO HOMESCREEN
                </h3>
              </div>
              <button
                onClick={() => setActiveInstallGuideType(null)}
                className="p-1.5 hover:bg-black/5 border-[2px] border-black rounded-none neo-btn-press"
              >
                <DynamicIcon name="X" size={14} />
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-4 font-sans text-sm font-medium text-black">
              {activeInstallGuideType !== 'android' && (
                <p className="text-xs text-black/70 font-semibold leading-relaxed">
                  We detected {activeInstallGuideType === 'ios' ? 'an iPhone/iPad device.' : 'your device.'} To install ChronoTrak as a standalone full-screen app:
                </p>
              )}

              {activeInstallGuideType === 'ios' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-[#fdf2f8] p-3 border-[2px] border-black">
                    <span className="font-mono text-xs font-black bg-[#f472b6] text-white border border-black w-5 h-5 flex items-center justify-center rounded-full shrink-0">1</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Tap the <strong className="font-black bg-[#fbcfe8] px-1 text-black">Share</strong> icon (the square with an arrow pointing up) at the bottom of Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-[#fdf2f8] p-3 border-[2px] border-black">
                    <span className="font-mono text-xs font-black bg-[#f472b6] text-white border border-black w-5 h-5 flex items-center justify-center rounded-full shrink-0">2</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Scroll down and tap <strong className="font-black bg-[#fbcfe8] px-1 text-black">Add to Home Screen</strong>.
                    </p>
                  </div>
                  <p className="text-[11px] font-semibold text-[#ec4899] font-mono mt-1 text-center">
                    Launch from your homescreen for a native browserless app container!
                  </p>
                </div>
              )}

              {activeInstallGuideType === 'android' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-[#ecfdf5] p-3 border-[2px] border-black">
                    <span className="font-mono text-xs font-black bg-[#34d399] text-black border border-black w-5 h-5 flex items-center justify-center rounded-full shrink-0">✓</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Tap Chrome's menu icon and select <strong className="font-black bg-[#a7f3d0] px-1 text-black">Install app</strong> to get the real app wrapper instantly.
                    </p>
                  </div>
                  <p className="text-[11px] font-semibold text-[#10b981] font-mono mt-1 text-center">
                    Standalone secure storage & full offline support!
                  </p>
                </div>
              )}

              {activeInstallGuideType === 'desktop' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-[#eff6ff] p-3 border-[2px] border-black">
                    <span className="font-mono text-xs font-black bg-[#60a5fa] text-black border border-black w-5 h-5 flex items-center justify-center rounded-full shrink-0">1</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      In Chrome/Edge/Brave, look at the right end of the URL address bar at the top and click the <strong className="font-black bg-[#bfdbfe] px-1 text-black">Install Icon</strong> (overlapping squares or down arrow).
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-[#eff6ff] p-3 border-[2px] border-black">
                    <span className="font-mono text-xs font-black bg-[#60a5fa] text-black border border-black w-5 h-5 flex items-center justify-center rounded-full shrink-0">2</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Or, click your browser menu <strong className="font-black bg-[#bfdbfe] px-1 text-black">(⋮)</strong> → <strong className="font-black bg-[#bfdbfe] px-1 text-black">Save and share</strong> → <strong className="font-black bg-[#bfdbfe] px-1 text-black font-sans">Install page as app</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Close button */}
            <div className="mt-5 border-t-[3px] border-black pt-4 flex justify-end">
              <button
                onClick={() => setActiveInstallGuideType(null)}
                className="px-4 py-2 bg-[#000000] hover:bg-black/90 text-white font-mono font-bold text-xs shrink-0 rounded-none neo-btn-press"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 Simple Unified Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white border-[4px] border-black text-black pointer-events-auto p-5 md:p-6 shadow-[6px_6px_0px_0px_#000000] relative">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b-[3px] border-black pb-3 mb-4">
              <h3 className="text-base font-black tracking-tight uppercase font-sans">
                Connect ChronoTrak
              </h3>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1.5 hover:bg-black/5 border-[2px] border-black rounded-none neo-btn-press"
              >
                <DynamicIcon name="X" size={14} />
              </button>
            </div>

            <p className="text-xs text-black/75 font-semibold mb-4 leading-normal">
              Choose how you want to save your milestones:
            </p>

            <div className="space-y-4">
              {/* Google Sign In option */}
              <div className="border-[2.5px] border-black p-3 bg-[#f5f3ff]">
                <div className="flex items-center gap-2 mb-1">
                  <DynamicIcon name="Cloud" size={14} className="text-[#8b5cf6]" />
                  <span className="font-mono text-xs font-black uppercase text-black">Cloud Backup</span>
                </div>
                <p className="text-[10px] text-black/60 font-semibold mb-3">
                  Sync instantly across all devices.
                </p>
                <button
                  onClick={async () => {
                    setIsAuthModalOpen(false);
                    await handleGoogleSignIn();
                  }}
                  className="w-full py-2 bg-[#c084fc] hover:bg-[#a855f7] border-[2px] border-black rounded-none font-mono font-black text-[10px] uppercase tracking-wide text-black neo-btn-press flex items-center justify-center gap-1.5"
                >
                  <GoogleIcon />
                  <span>Google Sign In</span>
                </button>
              </div>

              {/* Guest Session option */}
              <div className="border-[2.5px] border-black p-3 bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <DynamicIcon name="User" size={14} className="text-amber-500" />
                  <span className="font-mono text-xs font-black uppercase text-black">Local Guest</span>
                </div>
                <p className="text-[10px] text-black/60 font-semibold mb-3">
                  Save to this browser only.
                </p>
                <button
                  onClick={() => {
                    handleGuestSignIn();
                    setIsAuthModalOpen(false);
                  }}
                  className="w-full py-2 bg-[#fdba74] hover:bg-[#f97316] border-[2px] border-black rounded-none font-mono font-black text-[10px] uppercase tracking-wide text-black neo-btn-press flex items-center justify-center gap-1.5"
                >
                  <span>Continue as Guest</span>
                </button>
              </div>
            </div>

            {/* Cancel/Close Footer line */}
            <div className="mt-4 border-t-[2.5px] border-black pt-3 flex justify-end">
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="px-3.5 py-1 bg-black hover:bg-black/80 text-white font-mono font-bold text-[10px] uppercase rounded-none neo-btn-press"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
