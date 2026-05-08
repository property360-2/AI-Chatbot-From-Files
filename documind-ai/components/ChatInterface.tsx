'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Send,
  User as UserIcon,
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  Menu,
  Trash2,
  FileText,
  X,
  Upload,
  Loader2,
  PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { LoginScreen } from './LoginScreen';

/**
 * Utility for tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * ChatInterface Component
 * Provides a premium AI chat experience with document upload capabilities.
 */
export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<{ id: string; title: string; timestamp: any }[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [fileToOverwrite, setFileToOverwrite] = useState<File | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const libraryTimer = useRef<NodeJS.Timeout | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Responsive Sidebar Listener
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      // Auto-close sidebar on tablets and mobile
      if (width <= 768) {
        setIsSidebarOpen(false);
      } else if (width >= 1024) {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Theme Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('tropangai_theme');
    const isDark = savedTheme ? savedTheme === 'dark' : true;
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  // Firestore Data Synchronization
  useEffect(() => {
    if (!user) return;

    // 1. Sync Conversations List
    const convsQuery = query(
      collection(db, 'users', user.uid, 'conversations'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeConvs = onSnapshot(convsQuery, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as { id: string; title: string; timestamp: any }[];
      setConversations(convs);
    });

    // 2. Sync Messages for Current Conversation
    let unsubscribeMessages = () => { };
    if (currentConvId) {
      const messagesQuery = query(
        collection(db, 'users', user.uid, 'conversations', currentConvId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const firestoreMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        })) as Message[];

        setMessages(firestoreMessages);
      });
    } else {
      setMessages([]);
    }

    // 3. Sync Uploaded Files Metadata
    const filesQuery = query(collection(db, 'users', user.uid, 'files'));
    const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
      const files = snapshot.docs.map(doc => doc.data() as { name: string; size: string });
      setUploadedFiles(files);
    });

    return () => {
      unsubscribeConvs();
      unsubscribeMessages();
      unsubscribeFiles();
    };
  }, [user, currentConvId]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tropangai_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tropangai_theme', 'light');
    }
  };

  const handleLogout = async () => {
    if (!showLogoutConfirm) {
      setShowLogoutConfirm(true);
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);



  const deleteDocument = async (fileName: string) => {
    try {
      const response = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileName, userId: user?.uid }),
      });
      if (response.ok) {
        // Remove from Firestore metadata
        if (user) {
          await deleteDoc(doc(db, 'users', user.uid, 'files', fileName));
        }
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Document deleted successfully. The context has been updated.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const startNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
  };

  const deleteConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConvToDelete(convId);
  };

  const confirmDeleteConversation = async () => {
    if (!user || !convToDelete) return;
    const convId = convToDelete;
    setConvToDelete(null);

    try {
      // 1. Delete all messages first
      const msgsRef = collection(db, 'users', user.uid, 'conversations', convId, 'messages');
      const msgsSnap = await getDocs(msgsRef);
      const deletePromises = msgsSnap.docs.map(m => deleteDoc(m.ref));
      await Promise.all(deletePromises);

      // 2. Delete conversation document
      await deleteDoc(doc(db, 'users', user.uid, 'conversations', convId));

      if (currentConvId === convId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Delete conversation failed:', error);
    }
  };

  const handleLibraryHover = (open: boolean) => {
    if (libraryTimer.current) clearTimeout(libraryTimer.current);
    if (open) {
      setIsLibraryOpen(true);
    } else {
      libraryTimer.current = setTimeout(() => setIsLibraryOpen(false), 300);
    }
  };


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setInput('');
    setIsLoading(true);

    try {
      let chatId = currentConvId;

      // 1. Create conversation if it doesn't exist
      if (!chatId) {
        const convRef = await addDoc(collection(db, 'users', user.uid, 'conversations'), {
          title: input.trim().substring(0, 30) + (input.length > 30 ? '...' : ''),
          timestamp: serverTimestamp(),
        });
        chatId = convRef.id;
        setCurrentConvId(chatId);
      }

      // 2. Save user message to Firestore
      await addDoc(collection(db, 'users', user.uid, 'conversations', chatId, 'messages'), {
        role: userMessage.role,
        content: userMessage.content,
        timestamp: serverTimestamp(),
      });

      // 3. Prepare history for API (context-aware)
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      // Get ID Token for secure API call
      const idToken = await user.getIdToken();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: history,
          userId: user?.uid 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Chat failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const assistantId = (Date.now() + 1).toString();
      let fullContent = "";
      const realDecoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = realDecoder.decode(value, { stream: true });
        fullContent += text;

        setMessages(prev => {
          const assistantIdx = prev.findIndex(m => m.id === assistantId);
          if (assistantIdx === -1) {
            return [...prev, { id: assistantId, role: 'assistant', content: fullContent, timestamp: new Date() }];
          }
          return prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m);
        });
      }

      await addDoc(collection(db, 'users', user.uid, 'conversations', chatId, 'messages'), {
        role: 'assistant',
        content: fullContent,
        timestamp: serverTimestamp(),
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error.message}. Please check your configuration.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const performUpload = async (file: File) => {
    if (!user) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.uid);

      // Get ID Token for secure API call
      const idToken = await user.getIdToken();

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({ error: 'Upload failed' }));

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Upload failed');
      }

      setUploadedFiles(prev => [...prev, {
        id: data.document.id,
        name: data.document.name,
        size: data.document.size
      }]);

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Successfully uploaded and processed "${file.name}". You can now ask questions about it!`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check for duplicates
    if (uploadedFiles.some(f => f.name === file.name)) {
      setFileToOverwrite(file);
      return;
    }

    performUpload(file);
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent/40">Initializing_Secure_Session</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={() => { }} />;
  }

  return (
    <div className={cn(
      "flex h-screen bg-background text-foreground transition-colors duration-300 overflow-hidden",
      isDarkMode ? "dark" : ""
    )}>
      {/* Sidebar Backdrop for Mobile */}
      {isSidebarOpen && windowWidth <= 768 && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[35] transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar: Chat History */}
      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen ? (windowWidth <= 425 ? "100%" : 280) : 0,
          opacity: isSidebarOpen ? 1 : 0
        }}
        className={cn(
          "relative flex flex-col border-r border-border bg-background/50 backdrop-blur-xl z-[40] overflow-hidden",
          windowWidth <= 768 && "fixed inset-y-0 left-0 shadow-2xl"
        )}
      >
        <div className={cn(
          "p-4 flex flex-col h-full transition-all duration-300",
          windowWidth <= 768 ? "w-full" : "w-[280px]"
        )}>
          {/* Mobile Close Button */}
          {windowWidth <= 768 && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-accent/10 text-secondary hover:text-accent transition-all border border-border/50 bg-card/50"
              title="Close Sidebar"
            >
              <X size={18} />
            </button>
          )}

          <button
            onClick={() => {
              startNewChat();
              if (windowWidth <= 768) setIsSidebarOpen(false);
            }}
            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-accent/5 text-secondary hover:text-accent transition-all duration-300 border border-border/40 hover:border-accent/30 group mb-8"
          >
            <div className="w-7 h-7 rounded-lg bg-accent/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
              <Plus size={14} className="group-hover:rotate-90 transition-transform duration-500" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] transition-all">New Chat</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            <div className="px-2 mb-4">
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-accent/40 transition-all">Recent_History</span>
            </div>

            {conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[10px] text-secondary/40 font-bold uppercase tracking-widest leading-relaxed">
                  No conversations yet.<br />Start one above.
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setCurrentConvId(conv.id);
                    if (windowWidth <= 768) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 border",
                    currentConvId === conv.id
                      ? "bg-accent/10 border-accent/30 text-accent"
                      : "border-transparent hover:bg-accent/5 text-secondary hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn(
                      "shrink-0 w-1.5 h-1.5 rounded-full",
                      currentConvId === conv.id ? "bg-accent" : "bg-accent/20"
                    )} />
                    <span className="text-xs font-medium truncate">{conv.title}</span>
                  </div>

                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* User Section in Sidebar */}
          <div className="mt-auto pt-4 border-t border-border/50">
            <div className="flex items-center justify-between gap-3 p-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-accent uppercase">{user.email?.[0]}</span>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[10px] font-bold text-foreground truncate">{user.email}</span>
                  <span className="text-[8px] font-bold text-accent/40 uppercase tracking-tighter">Verified_Citizen</span>
                </div>
              </div>
              <Link
                href="/legal"
                className="p-2 rounded-lg hover:bg-accent/5 text-secondary/40 hover:text-accent transition-colors"
                title="Legal & Privacy"
              >
                <FileText size={16} />
              </Link>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-10 transition-all">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 rounded-xl hover:bg-accent/10 text-secondary hover:text-accent transition-all duration-300 flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-accent/50"
              aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSidebarOpen ? 'open' : 'closed'}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isSidebarOpen ? (
                    <PanelLeftClose size={22} className="group-hover:scale-110 transition-transform" />
                  ) : (
                    <Menu size={22} className="group-hover:scale-110 transition-transform" />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
            <h1 className="text-sm md:text-base lg:text-lg font-bold tracking-tight text-foreground transition-all">
              Tropang <span className="text-accent">AI</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-accent/10 text-secondary hover:text-accent transition-colors border border-border/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
              aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative">
              <button
                onClick={handleLogout}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-all duration-300 rounded-lg ${showLogoutConfirm
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "text-secondary hover:text-foreground border border-transparent hover:border-border"
                  }`}
              >
                {showLogoutConfirm ? "Confirm Logout?" : "Logout"}
              </button>

              {showLogoutConfirm && (
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 text-secondary hover:text-foreground transition-colors"
                  title="Cancel"
                >
                  <Plus size={16} className="rotate-45" />
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col relative bg-background/20 overflow-hidden">
          {/* Uploading Animation Overlay */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-background/60 backdrop-blur-md flex flex-col items-center justify-center space-y-8"
              >
                <div className="relative">
                  {/* Pulsing Outer Ring */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-[-20px] rounded-full border-2 border-accent/20"
                  />
                  {/* Rotating Progress Ring */}
                  <div className="w-24 h-24 rounded-full border-2 border-accent/10 flex items-center justify-center relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-t-2 border-accent rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Upload className="text-accent" size={32} />
                    </motion.div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center px-6">
                  <h3 className="text-sm font-bold uppercase tracking-[0.5em] text-accent animate-pulse">Processing_Document</h3>
                  <p className="text-[10px] font-medium text-secondary/60 max-w-[250px] leading-relaxed uppercase tracking-widest">
                    Extracting text, analyzing context, and preparing your intelligence support.
                  </p>
                  <p className="text-[10px] font-medium text-secondary/60 max-w-[250px] leading-relaxed uppercase tracking-widest">
                    naka-depend sa length ng document yung speed ng upload
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 md:px-6 py-10 space-y-12 scroll-smooth custom-scrollbar"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-4">
                <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-accent transition-all">
                  What's on your mind?
                </h2>
                <p className="text-xs md:text-sm lg:text-base text-secondary max-w-xs md:max-w-md transition-all">
                  Upload your documents and let's start exploring the information together.
                </p>
              </div>
            )}

            <div className="max-w-4xl mx-auto w-full space-y-12">
              {messages.map((message, idx) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col w-full gap-4 p-6 rounded-2xl transition-all border border-transparent",
                    message.role === 'user'
                      ? "bg-accent/5 border-accent/10 self-end ml-auto max-w-[85%]"
                      : "bg-card border-border/50 self-start max-w-[95%] shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest",
                      message.role === 'user' ? "bg-accent text-white" : "bg-border/50 text-secondary"
                    )}>
                      {message.role === 'user' ? 'USER' : 'AI'}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/60">
                      {message.role === 'user' ? 'You' : 'TropangAI'}
                    </span>
                    <span className="text-[10px] text-secondary/40 font-medium ml-auto">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={cn(
                    "text-[13px] md:text-[14px] lg:text-[15px] xl:text-[16px] leading-relaxed text-foreground/90 prose prose-sm dark:prose-invert max-w-none transition-all",
                    message.role === 'user' ? "font-medium" : ""
                  )}>
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-8 mb-4 tracking-tight text-foreground" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-6 mb-3 tracking-tight text-foreground" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-5 mb-2 tracking-tight text-accent" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-2 mb-4 marker:text-accent" {...props} />,
                          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                          code: ({ node, ...props }) => <code className="bg-border/30 rounded px-1.5 py-0.5 font-mono text-[13px] text-accent" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-accent/30 pl-4 py-1 my-4 italic text-secondary" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 bg-card border border-border/50 p-4 rounded-2xl w-fit animate-pulse shadow-sm">
                  <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
                </div>
              )}
            </div>
          </div>

          {/* Floating Input Area */}
          <div className="px-4 md:px-6 py-6 md:py-8">
            <div className="relative max-w-3xl mx-auto">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center bg-card border border-border/50 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/5 transition-all group rounded-2xl shadow-lg backdrop-blur-md relative"
              >
                {/* Upload Button */}
                <div 
                  className="relative h-full border-r border-border/30 hover:bg-accent/5 transition-colors"
                  onMouseEnter={() => handleLibraryHover(true)}
                  onMouseLeave={() => handleLibraryHover(false)}
                >
                  <label 
                    className="h-full px-4 md:px-5 flex items-center justify-center cursor-pointer hover:text-accent transition-colors relative min-h-[56px] md:min-h-[60px] focus-within:ring-2 focus-within:ring-accent/50 rounded-l-2xl"
                    aria-label="Upload PDF Document"
                  >
                    <div className="relative p-1">
                      <Plus size={20} className={cn("transition-transform", isLibraryOpen ? "rotate-45 scale-110 text-accent" : "")} />
                      {uploadedFiles.length > 0 && (
                        <div className="absolute top-[-2px] right-[-4px] w-4 h-4 bg-accent rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-card shadow-sm transition-all duration-300">
                          {uploadedFiles.length}
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      aria-label="Upload PDF File"
                    />
                  </label>

                  {/* Context Menu for Documents */}
                  <AnimatePresence>
                    {isLibraryOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-4 w-80 bg-card/95 backdrop-blur-xl border border-border p-0 z-50 rounded-2xl shadow-2xl overflow-hidden"
                      >
                        <div className="text-[10px] font-bold uppercase text-accent bg-accent/5 px-4 py-3 tracking-widest border-b border-border flex justify-between items-center">
                          <span>Document Library</span>
                          <span className="bg-accent/10 px-2 py-0.5 rounded-full text-[9px]">{uploadedFiles.length} files</span>
                        </div>
                        <div className="max-h-72 overflow-y-auto custom-scrollbar">
                          {uploadedFiles.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                              <Upload size={24} className="text-secondary/20 mb-3" />
                              <p className="text-xs text-secondary font-medium">No documents uploaded yet.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border/30">
                              {uploadedFiles.map((file, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors group/item">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-accent/5 rounded-lg text-accent">
                                      <FileText size={14} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-semibold truncate text-foreground/90">{file.name}</span>
                                      <span className="text-[10px] text-secondary font-medium">{file.size}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteDocument(file.name);
                                    }}
                                    className="text-secondary/30 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isUploading ? "Uploading..." : "Ask anything..."}
                  disabled={isUploading}
                  className="flex-1 bg-transparent py-4 md:py-5 px-3 md:px-5 text-[14px] focus:outline-none placeholder:text-secondary/30 font-medium min-w-0"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || isUploading}
                  className="px-4 md:px-6 h-full flex items-center justify-center text-secondary hover:text-accent disabled:opacity-30 transition-all border-l border-border/30 hover:bg-accent/5 focus:outline-none focus:bg-accent/5 rounded-r-2xl"
                  aria-label="Send Message"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin text-accent" /> : <Send size={18} />}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* Modern Delete Confirmation Modal */}
      <AnimatePresence>
        {convToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-500" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-2">Delete Conversation?</h3>
                <p className="text-secondary text-sm leading-relaxed mb-8">
                  This action cannot be undone. All messages in this thread will be permanently erased from our records.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => confirmDeleteConversation()}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                  >
                    Delete Thread
                  </button>
                  <button
                    onClick={() => setConvToDelete(null)}
                    className="w-full py-4 bg-accent/5 hover:bg-accent/10 text-foreground font-bold rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Overwrite Confirmation Modal */}
      <AnimatePresence>
        {fileToOverwrite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Upload className="text-accent" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-2">Duplicate Document?</h3>
                <p className="text-secondary text-sm leading-relaxed mb-8">
                  A document named <span className="text-foreground font-bold">"{fileToOverwrite.name}"</span> already exists. Do you want to overwrite it and update the context?
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      const file = fileToOverwrite;
                      setFileToOverwrite(null);
                      performUpload(file);
                    }}
                    className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
                  >
                    Overwrite & Update
                  </button>
                  <button
                    onClick={() => setFileToOverwrite(null)}
                    className="w-full py-4 bg-accent/5 hover:bg-accent/10 text-foreground font-bold rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Cancel Upload
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--accent-rgb, 212, 163, 115), 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--accent-rgb, 212, 163, 115), 0.2);
        }
      `}</style>
    </div>
  );
}
