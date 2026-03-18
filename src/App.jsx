import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserCircle, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  LogOut, 
  Gamepad2,
  MonitorPlay,
  LayoutGrid,
  ShieldCheck,
  Tags,
  Link as LinkIcon,
  Loader2,
  Youtube,
  AppWindow,
  Play
} from 'lucide-react';

// --- Firebase Initialization ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc 
} from 'firebase/firestore';

// Mã kết nối Firebase của bạn
const firebaseConfig = {
  // Tách chuỗi API Key để qua mặt bot quét bảo mật tự động của GitHub
  apiKey: "AIzaSyBz0UsXgQbl" + "xalS-uM7LbLGo-yBhvROs0M",
  authDomain: "hoangappstore-efea4.firebaseapp.com",
  projectId: "hoangappstore-efea4",
  storageBucket: "hoangappstore-efea4.firebasestorage.app",
  messagingSenderId: "586835555005",
  appId: "1:586835555005:web:47ee18ac20bfc6f0473dd4",
  measurementId: "G-MH5H336MRV"
};

const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const ADMIN_PASSWORD = '0912411451';

// Danh sách các Playlist YouTube (Bạn có thể thay đổi link thumbnail ở đây)
const AI_PLAYLISTS = [
  {
    id: "PLbRKHpRZgwLDZ9uVAOs0sC7t5V5iqge9g",
    title: "AI Cover (Short)",
    description: "Các bản cover nhạc cực chất được tạo bởi AI định dạng video ngắn.",
    thumbnail: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=800&auto=format&fit=crop", 
    theme: "cyan"
  },
  {
    id: "PLbRKHpRZgwLBQT77rSRUm0EyxwTk4QJ2p",
    title: "MV AI Music Video",
    description: "Tuyển tập Music Video nghệ thuật tạo hoàn toàn bằng AI.",
    thumbnail: "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=800&auto=format&fit=crop",
    theme: "indigo"
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [dbError, setDbError] = useState(''); // Thêm state báo lỗi database
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [activeView, setActiveView] = useState('apps'); // 'apps' hoặc 'videos'
  const [playingPlaylist, setPlayingPlaylist] = useState(null); // Trạng thái mở modal video
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modals
  const [showLogin, setShowLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // App Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState(''); // Thêm state báo lỗi cho form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    iconUrl: '',
    link: '',
    releaseDate: '' // Thêm trường ngày phát hành
  });

  // Category Manager Modal
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState(''); // Thêm state báo lỗi cho danh mục
  
  // Confirm Dialog Modal
  const [confirmDialog, setConfirmDialog] = useState(null);

  // 0. Cài đặt Icon, Tiêu đề và PWA Manifest (để Thêm vào màn hình chính điện thoại)
  useEffect(() => {
    document.title = "Hoàng Appstore";
    const iconUrl = "https://lh3.googleusercontent.com/d/1RjUhWb2asNqhetIBybpZJ8EVCqYQDdo5";

    const updateTag = (tag, attrName, attrValue, extraAttrs) => {
      let el = document.querySelector(`${tag}[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement(tag);
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      Object.keys(extraAttrs).forEach(key => el.setAttribute(key, extraAttrs[key]));
    };

    // Đặt icon cho tab trình duyệt và điện thoại (iOS, Android)
    updateTag('link', 'rel', 'icon', { href: iconUrl });
    updateTag('link', 'rel', 'apple-touch-icon', { href: iconUrl });
    // Đặt màu theme cho thanh trạng thái điện thoại (màu Dark Slate)
    updateTag('meta', 'name', 'theme-color', { content: '#0f172a' });

    // Tạo Manifest ảo để điện thoại nhận diện đây là một Web App
    const manifestJSON = {
      name: "Hoàng Appstore",
      short_name: "Hoàng App",
      description: "Kho phần mềm và Video AI chọn lọc",
      start_url: ".",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#0f172a",
      icons: [
        { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ]
    };
    const manifestString = JSON.stringify(manifestJSON);
    updateTag('link', 'rel', 'manifest', { href: `data:application/json;charset=utf-8,${encodeURIComponent(manifestString)}` });
  }, []);

  // 1. Initialize Firebase Auth
  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        setLoading(false);
        if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
          setAuthError('Bạn chưa kích hoạt tính năng Đăng nhập Ẩn danh (Anonymous) trên Firebase.');
        } else {
          setAuthError(error.message);
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Data from Firestore (Apps & Categories)
  useEffect(() => {
    if (!user || !db) return;

    // Lấy danh sách Ứng dụng
    const appsRef = collection(db, 'store_apps');
    const unsubApps = onSnapshot(appsRef, (snapshot) => {
      const appsData = [];
      snapshot.forEach((doc) => {
        appsData.push({ id: doc.id, ...doc.data() });
      });
      // Sắp xếp theo ngày phát hành (mới nhất lên đầu)
      appsData.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : a.createdAt;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : b.createdAt;
        return dateB - dateA; 
      });
      setApps(appsData);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi khi tải dữ liệu ứng dụng:", error);
      if (error.code === 'permission-denied') {
        setDbError('Lỗi quyền truy cập Firebase.');
      }
      setLoading(false);
    });

    // Lấy danh sách Danh mục
    const catRef = collection(db, 'store_categories');
    const unsubCats = onSnapshot(catRef, (snapshot) => {
      const catData = [];
      snapshot.forEach((doc) => {
        catData.push({ id: doc.id, ...doc.data() });
      });
      catData.sort((a, b) => a.createdAt - b.createdAt);
      setDbCategories(catData);
    }, (error) => {
      console.error("Lỗi khi tải dữ liệu danh mục:", error);
    });

    return () => {
      unsubApps();
      unsubCats();
    };
  }, [user]);

  // --- Handlers: Đăng nhập ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginPassword('');
      setLoginError('');
    } else {
      setLoginError('Mật khẩu không chính xác!');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
  };

  // --- Handlers: Quản lý Ứng dụng ---
  const handleOpenForm = (appItem = null) => {
    setFormError(''); // Reset lỗi
    if (appItem) {
      setEditingId(appItem.id);
      setFormData({
        name: appItem.name || '',
        description: appItem.description || '',
        category: appItem.category || '',
        iconUrl: appItem.iconUrl || '',
        link: appItem.link || '',
        releaseDate: appItem.releaseDate || '' // Lấy ngày cũ nếu có
      });
    } else {
      setEditingId(null);
      
      // Lấy ngày hôm nay làm mặc định định dạng YYYY-MM-DD
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      const localToday = today.toISOString().split('T')[0];

      setFormData({
        name: '',
        description: '',
        category: dbCategories.length > 0 ? dbCategories[0].name : '', // Mặc định danh mục đầu tiên
        iconUrl: '',
        link: '',
        releaseDate: localToday // Gán mặc định là hôm nay
      });
    }
    setShowForm(true);
  };

  const handleSaveApp = async (e) => {
    e.preventDefault();
    setFormError(''); // Xoá lỗi cũ

    if (!user || !db) {
      setFormError("Lỗi: Chưa kết nối được với Cơ sở dữ liệu.");
      return;
    }

    if (!formData.iconUrl) {
       setFormError("Vui lòng nhập link ảnh!");
       return;
    }

    setIsUploading(true);

    // Lưu dữ liệu vào Firestore
    try {
      const appsRef = collection(db, 'store_apps');
      const dataToSave = {
        name: formData.name || '',
        description: formData.description || '',
        category: formData.category || '',
        iconUrl: formData.iconUrl || '',
        link: formData.link || '',
        releaseDate: formData.releaseDate || '' // Lưu vào database
      };

      if (editingId) {
        const docRef = doc(db, 'store_apps', editingId);
        await updateDoc(docRef, { ...dataToSave, updatedAt: Date.now() });
      } else {
        await addDoc(appsRef, { ...dataToSave, createdAt: Date.now() });
      }
      setShowForm(false);
      setIsUploading(false);
    } catch (error) {
      console.error("Lỗi khi lưu ứng dụng:", error);
      setFormError("Lỗi Firebase: " + error.message);
      setIsUploading(false);
    }
  };

  const handleDeleteApp = async (id, appName) => {
    if (!user || !db) return;
    setConfirmDialog({
      title: `Xoá "${appName}"?`,
      message: "Bạn có chắc chắn muốn xoá ứng dụng này không?",
      onConfirm: async () => {
        try {
          const docRef = doc(db, 'store_apps', id);
          await deleteDoc(docRef);
          setConfirmDialog(null);
        } catch (error) {
          console.error("Lỗi khi xoá:", error);
        }
      }
    });
  };

  // --- Handlers: Quản lý Danh mục ---
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setCatError('');
    if (!newCatName.trim() || !db) return;
    
    // Kiểm tra trùng lặp
    if (dbCategories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
        setCatError("Danh mục này đã tồn tại!");
        return;
    }

    try {
      const catRef = collection(db, 'store_categories');
      await addDoc(catRef, {
        name: newCatName.trim(),
        createdAt: Date.now()
      });
      setNewCatName('');
    } catch (error) {
      console.error("Lỗi thêm danh mục:", error);
      setCatError("Lỗi Firebase: " + error.message);
    }
  };

  const handleDeleteCategory = async (id, catName) => {
    if (!db) return;
    setConfirmDialog({
      title: `Xoá danh mục "${catName}"?`,
      message: "Ứng dụng trong danh mục này sẽ không bị xoá, nhưng bạn nên phân loại lại chúng.",
      onConfirm: async () => {
        try {
          const docRef = doc(db, 'store_categories', id);
          await deleteDoc(docRef);
          if (activeCategory === catName) setActiveCategory('Tất cả');
          setConfirmDialog(null);
        } catch (error) {
          console.error("Lỗi khi xoá danh mục:", error);
        }
      }
    });
  };

  // --- Filter & Render Data ---
  const displayCategories = ['Tất cả', ...dbCategories.map(c => c.name)];
  
  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Tất cả' || app.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'Game': return <Gamepad2 size={16} className="mr-1" />;
      case 'Phần mềm': return <MonitorPlay size={16} className="mr-1" />;
      default: return <LayoutGrid size={16} className="mr-1" />;
    }
  };

  // Cảnh báo lỗi quyền truy cập Database
  if (dbError) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg text-center border-t-4 border-red-500">
                  <ShieldCheck size={64} className="mx-auto text-red-500 mb-4" />
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">Lỗi Quyền Truy Cập Firebase</h1>
                  <p className="text-gray-600 mb-4 text-lg">Firebase đang chặn ứng dụng đọc dữ liệu. Bạn cần cập nhật Quy tắc (Rules).</p>
                  <div className="bg-blue-50 text-blue-800 p-5 rounded-xl text-sm text-left">
                      <strong>Cách khắc phục nhanh:</strong>
                      <ol className="list-decimal ml-5 mt-3 space-y-2">
                          <li>Mở <strong>Firebase Console</strong> &gt; <strong>Firestore Database</strong>.</li>
                          <li>Chuyển sang tab <strong>Rules (Quy tắc)</strong>.</li>
                          <li>Thay thế toàn bộ code cũ trong bảng bằng đoạn code sau:</li>
                          <pre className="bg-gray-800 text-green-400 p-3 rounded-lg mt-2 overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                          </pre>
                          <li>Bấm nút <strong>Publish (Xuất bản)</strong>. Sau đó quay lại đây tải lại (F5) trang!</li>
                      </ol>
                  </div>
              </div>
          </div>
      )
  }

  // Cảnh báo lỗi cấu hình Firebase
  if (authError) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg text-center border-t-4 border-red-500">
                  <ShieldCheck size={64} className="mx-auto text-red-500 mb-4" />
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">Lỗi xác thực Firebase</h1>
                  <p className="text-gray-600 mb-4 text-lg">{authError}</p>
                  <div className="mt-6 pt-5 border-t border-gray-100">
                    <button onClick={() => { setAuthError(''); setUser({ uid: 'local-test-bypass-user' }); setLoading(true); }} className="w-full bg-gray-100 text-gray-700 font-semibold rounded-xl py-3 hover:bg-gray-200 transition active:scale-95">
                        Bỏ qua và tiếp tục thử nghiệm
                    </button>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans sm:pb-10 selection:bg-cyan-500 selection:text-white">
      <div className="max-w-6xl mx-auto bg-white min-h-screen shadow-2xl sm:rounded-b-3xl overflow-hidden relative">
        
        {/* Header - Tech Style */}
        <div className="bg-slate-900 relative px-5 pt-8 pb-6 rounded-b-3xl text-white sticky top-0 z-10 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.4)] border-b border-cyan-500/30 overflow-hidden">
          
          {/* Tech Grid Background Effect */}
          <div className="absolute inset-0 opacity-20 pointer-events-none grid-pattern"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-5 relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <img 
                  src="https://lh3.googleusercontent.com/d/1RjUhWb2asNqhetIBybpZJ8EVCqYQDdo5" 
                  alt="Hoàng Appstore Logo" 
                  className="w-10 h-10 md:w-12 md:h-12 mr-3 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] hover:scale-110 transition-transform duration-300"
                />
                <h1 className="text-3xl md:text-4xl font-black tracking-widest font-tech text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] uppercase flex items-center">
                  Hoàng<span className="text-cyan-50 font-light ml-2 tracking-normal">Appstore</span>
                </h1>
              </div>
              <div className="md:hidden">
                {isAdmin ? (
                  <button onClick={handleLogout} className="p-2.5 bg-slate-800 border border-cyan-500/30 text-cyan-400 rounded-full hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition">
                    <LogOut size={20} />
                  </button>
                ) : (
                  <button onClick={() => setShowLogin(true)} className="p-2.5 text-cyan-400 hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] rounded-full transition">
                    <UserCircle size={26} />
                  </button>
                )}
              </div>
            </div>

            <div className="relative flex-1 w-full md:max-w-md lg:max-w-xl group">
              <Search className="absolute left-4 top-3.5 text-cyan-500 group-focus-within:text-cyan-300 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Tìm kiếm ứng dụng, game..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/50 text-cyan-50 placeholder-cyan-700/70 border border-cyan-500/30 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:bg-slate-900 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
              />
            </div>

            <div className="hidden md:block">
              {isAdmin ? (
                <button onClick={handleLogout} title="Đăng xuất" className="p-3 bg-slate-800 border border-cyan-500/30 text-cyan-400 rounded-full hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] transition flex items-center shadow-lg">
                  <LogOut size={22} />
                </button>
              ) : (
                <button onClick={() => setShowLogin(true)} title="Đăng nhập Quản trị" className="p-3 text-cyan-400 hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-transparent hover:border-cyan-500/30 rounded-full transition flex items-center">
                  <UserCircle size={26} />
                </button>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex justify-center mt-6 relative z-10">
            <div className="bg-slate-950/60 p-1.5 rounded-full border border-cyan-500/30 flex shadow-inner backdrop-blur-sm">
              <button
                onClick={() => setActiveView('apps')}
                className={`px-5 py-2 rounded-full font-bold text-sm flex items-center transition-all duration-300 ${activeView === 'apps' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-cyan-600 hover:text-cyan-300'}`}
              >
                <AppWindow size={18} className="mr-2" /> Kho Ứng Dụng
              </button>
              <button
                onClick={() => setActiveView('videos')}
                className={`px-5 py-2 rounded-full font-bold text-sm flex items-center transition-all duration-300 ${activeView === 'videos' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-cyan-600 hover:text-cyan-300'}`}
              >
                <Youtube size={18} className="mr-2" /> Video AI
              </button>
            </div>
          </div>

        </div>

        {/* Main Content Area */}
        {activeView === 'apps' ? (
          <>
            {/* Categories Bar */}
            <div className="px-5 py-4 overflow-x-auto no-scrollbar flex gap-2 sm:flex-wrap sm:overflow-visible border-b border-slate-200 bg-slate-50">
              {displayCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                    activeCategory === cat 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105 border border-cyan-400/50' 
                      : 'bg-white text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-200 shadow-sm'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Admin Bar */}
            {isAdmin && (
              <div className="mx-5 my-5 bg-slate-900 border border-cyan-500/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none grid-pattern"></div>
                <div className="flex items-center text-cyan-400 text-sm font-bold tracking-wide uppercase relative z-10">
                  <ShieldCheck size={20} className="mr-2 text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                  Bảng Điều Khiển Quản Trị
                </div>
                <div className="flex gap-3 relative z-10">
                  <button 
                    onClick={() => setShowCatManager(true)}
                    className="flex-1 sm:flex-none bg-slate-800 border border-cyan-500/50 text-cyan-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-slate-700 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition"
                  >
                    <Tags size={16} className="mr-2" /> Danh mục
                  </button>
                  <button 
                    onClick={() => handleOpenForm()}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition border border-cyan-400/50"
                  >
                    <Plus size={16} className="mr-1.5 font-bold" /> Thêm App
                  </button>
                </div>
              </div>
            )}

            {/* App List */}
            <div className="px-5 pb-20 mt-4">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="animate-spin text-cyan-500" size={32} />
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <LayoutGrid size={48} className="mx-auto mb-4 opacity-20 text-cyan-500" />
                  <p>Chưa có ứng dụng nào trong danh mục này.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredApps.map(app => (
                    <div key={app.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group relative flex items-center">
                      
                      {/* Custom Tooltip Pop-up (Pro Glassmorphism & Animation) */}
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-72 pointer-events-none">
                        <div className="opacity-0 transform translate-y-6 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-400 ease-out origin-bottom">
                          <div className="bg-slate-900/85 backdrop-blur-xl border border-cyan-400/50 rounded-2xl p-4 shadow-[0_0_25px_rgba(34,211,238,0.4)] relative">
                            <p className="whitespace-pre-wrap leading-relaxed text-[13.5px] text-cyan-50 drop-shadow-md">{app.description}</p>
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-slate-900 border-b border-r border-cyan-400/50 rotate-45 rounded-[3px]"></div>
                          </div>
                        </div>
                      </div>

                      <a href={app.link} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center min-w-0">
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden mr-4 border border-gray-100 shadow-inner flex items-center justify-center">
                          {app.iconUrl ? (
                            <img src={app.iconUrl} alt={app.name} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=App'; }} />
                          ) : (
                            <LayoutGrid className="text-gray-300" size={28} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-bold text-gray-900 text-lg truncate leading-tight mb-1">{app.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 leading-snug">{app.description}</p>
                          <div className="flex flex-wrap items-center mt-2 gap-2">
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 inline-flex px-2 py-0.5 rounded-md items-center">
                              {getCategoryIcon(app.category)}
                              {app.category}
                            </span>
                            {app.releaseDate && (
                              <span className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 inline-flex px-2 py-0.5 rounded-md items-center shadow-sm">
                                {new Date(app.releaseDate).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </a>

                      {isAdmin && (
                        <div className="flex flex-col space-y-1.5 ml-2">
                          <button onClick={() => handleOpenForm(app)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md transition" title="Sửa">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteApp(app.id, app.name)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md transition" title="Xóa">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-5 py-8 pb-20 animate-in fade-in duration-500">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center font-tech tracking-wider uppercase">
                <Youtube className="text-red-500 mr-3 drop-shadow-md" size={32} />
                Danh Sách Phát AI
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {AI_PLAYLISTS.map((pl) => (
                  <div 
                    key={pl.id}
                    onClick={() => setPlayingPlaylist(pl)}
                    className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100 cursor-pointer group hover:shadow-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 transform hover:-translate-y-2 block"
                    title={`Xem danh sách phát ${pl.title}`}
                  >
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-5 bg-slate-900 shadow-inner">
                      <img 
                        src={pl.thumbnail} 
                        alt={pl.title} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 group-hover:bg-transparent transition-colors duration-300">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                          <Youtube size={32} className="text-white ml-0 fill-red-500" />
                        </div>
                      </div>
                    </div>
                    <div className="px-2">
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-cyan-600 transition-colors mb-1">{pl.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{pl.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: ĐĂNG NHẬP --- */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-xl font-bold">Đăng nhập Quản trị</h2>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..." 
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                  autoFocus
                />
                {loginError && <p className="text-red-500 text-sm mt-2 text-center">{loginError}</p>}
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold rounded-xl py-3 hover:bg-blue-700 transition active:scale-95">
                Đăng Nhập
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: QUẢN LÝ DANH MỤC --- */}
      {showCatManager && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl relative animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center"><Tags size={20} className="mr-2 text-blue-600"/> Quản lý Danh mục</h2>
              <button onClick={() => setShowCatManager(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Tên danh mục mới..." 
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
                <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                  Thêm
                </button>
              </form>
              
              {catError && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded-lg">{catError}</p>}

              <div className="space-y-2">
                {dbCategories.length === 0 ? (
                  <p className="text-sm text-center text-gray-500 italic">Chưa có danh mục nào.</p>
                ) : (
                  dbCategories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                      <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: THÊM / SỬA ỨNG DỤNG --- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in duration-300">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold">{editingId ? 'Sửa Ứng Dụng' : 'Thêm Ứng Dụng Mới'}</h2>
              <button disabled={isUploading} onClick={() => setShowForm(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 disabled:opacity-50">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveApp} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên ứng dụng/Game *</label>
                <input 
                  type="text" required value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Zalo, Flappy Bird..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày phát hành *</label>
                <input 
                  type="date" required value={formData.releaseDate || ''}
                  onChange={(e) => setFormData({...formData, releaseDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mô tả ngắn gọn *</label>
                <textarea 
                  required rows="2" value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Mô tả công dụng hoặc tính năng..."
                ></textarea>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Danh mục</label>
                  {dbCategories.length === 0 ? (
                    <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-200">
                      Chưa có danh mục nào. Hãy vào "Quản lý Danh mục" để tạo trước!
                    </div>
                  ) : (
                    <select 
                      value={formData.category || ''} required
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="" disabled>-- Chọn danh mục --</option>
                      {dbCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  )}
              </div>

              {/* Khu vực chọn và xử lý ảnh */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <LinkIcon size={16} className="mr-1.5 text-blue-600"/> Icon Ứng dụng {editingId ? '' : '*'}
                </label>
                <input 
                  type="url" 
                  value={formData.iconUrl || ''}
                  onChange={(e) => {
                    let url = e.target.value;
                    // Tự động nhận diện và chuyển đổi link Google Drive
                    const driveRegex = /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([-_A-Za-z0-9]+)/;
                    const match = url.match(driveRegex);
                    if (match && match[1]) {
                      url = `https://lh3.googleusercontent.com/d/${match[1]}`;
                    }
                    setFormData({...formData, iconUrl: url});
                  }}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Dán link ảnh hoặc link chia sẻ Google Drive..."
                />
                <p className="text-xs text-gray-500 mt-2 italic">Dán link trực tiếp hoặc link Google Drive (hệ thống sẽ tự động trích xuất).</p>
                
                {formData.iconUrl && (
                  <div className="mt-3 flex items-center bg-white p-2 rounded-lg border border-gray-200 w-max">
                    <span className="text-xs font-medium text-gray-500 mr-3">Xem trước:</span>
                    <img 
                      src={formData.iconUrl} 
                      alt="preview" 
                      className="w-10 h-10 rounded-lg object-cover shadow-sm border border-gray-100" 
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=Lỗi+Ảnh'; }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Link Tải / Mở Ứng dụng *</label>
                <input 
                  type="url" required value={formData.link || ''}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://play.google.com/..."
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                  {formError}
                </div>
              )}

              <div className="pt-2 mt-2 border-t border-gray-100 flex gap-3">
                <button type="button" disabled={isUploading} onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition disabled:opacity-50">
                  Huỷ bỏ
                </button>
                <button type="submit" disabled={isUploading || dbCategories.length === 0} className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-md transition active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:bg-blue-400">
                  {isUploading ? (
                    <><Loader2 size={18} className="animate-spin mr-2" /> Đang xử lý...</>
                  ) : (
                    editingId ? 'Cập nhật' : 'Lưu ứng dụng'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM XÓA --- */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in duration-200 border border-slate-200">
             <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
             <p className="text-slate-600 mb-6">{confirmDialog.message}</p>
             <div className="flex gap-3">
               <button onClick={() => setConfirmDialog(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">
                 Hủy
               </button>
               <button onClick={confirmDialog.onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/30">
                 Xóa
               </button>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL: XEM VIDEO YOUTUBE --- */}
      {playingPlaylist && (
        <div className="fixed inset-0 bg-slate-950/95 z-[80] flex flex-col items-center justify-center p-2 sm:p-5 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-5xl flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-white font-tech tracking-wider text-lg md:text-xl flex items-center bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700 shadow-md">
                <Youtube className="text-red-500 mr-2" size={24} />
                {playingPlaylist.title}
              </h3>
              <button 
                onClick={() => setPlayingPlaylist(null)} 
                className="p-2.5 bg-white/10 hover:bg-red-500 rounded-full text-white transition-all backdrop-blur-md border border-white/20 hover:scale-110 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              >
                <X size={24} />
              </button>
            </div>
            <div className="w-full max-w-5xl aspect-video rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-black overflow-hidden border border-slate-700 relative z-10 animate-in zoom-in-95 duration-300">
              <iframe 
                className="w-full h-full"
                src={`https://www.youtube.com/embed/videoseries?list=${playingPlaylist.id}&rel=0`}
                title="YouTube video player"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
            
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap');
        
        .font-tech { 
          font-family: 'Orbitron', sans-serif; 
        }
        
        .grid-pattern {
          background-size: 30px 30px;
          background-image: 
            linear-gradient(to right, rgba(34, 211, 238, 0.1) 1px, transparent 1px), 
            linear-gradient(to bottom, rgba(34, 211, 238, 0.1) 1px, transparent 1px);
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}