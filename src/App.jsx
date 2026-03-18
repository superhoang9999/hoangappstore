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
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, increment 
} from 'firebase/firestore';

// Mã kết nối Firebase của bạn
const firebaseConfig = {
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

// Hình ảnh dự phòng khi link bị hỏng hoặc không tải được (Base64 SVG)
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='4' ry='4'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";

// Danh sách các Playlist YouTube
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
  const [dbError, setDbError] = useState('');
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [activeView, setActiveView] = useState('apps');
  const [playingPlaylist, setPlayingPlaylist] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [showLogin, setShowLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    iconUrl: '',
    link: '',
    releaseDate: ''
  });

  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  // State lưu trữ số lượt truy cập
  const [visitorCount, setVisitorCount] = useState(0);

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

    updateTag('link', 'rel', 'icon', { href: iconUrl });
    updateTag('link', 'rel', 'apple-touch-icon', { href: iconUrl });
    updateTag('meta', 'name', 'theme-color', { content: '#0f172a' });

    const manifestJSON = {
      name: "Hoàng Appstore",
      short_name: "Hoàng App",
      description: "Kho phần mềm và Video AI chọn lọc",
      start_url: ".",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0f172a",
      icons: [
        { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ]
    };
    const manifestString = JSON.stringify(manifestJSON);
    updateTag('link', 'rel', 'manifest', { href: `data:application/json;charset=utf-8,${encodeURIComponent(manifestString)}` });
  }, []);

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
        setAuthError(error.message);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ĐẾM SỐ LƯỢT TRUY CẬP (Mỗi thiết bị/trình duyệt là 1 user ẩn danh khác nhau)
  useEffect(() => {
    if (!user || !db) return;

    const trackVisitor = async () => {
      try {
        const visitorRef = doc(db, 'store_visitors', user.uid);
        const visitorSnap = await getDoc(visitorRef);

        if (!visitorSnap.exists()) {
          // Nếu thiết bị này chưa từng truy cập -> Lưu lại để đánh dấu và tăng biến đếm tổng
          await setDoc(visitorRef, { firstVisit: Date.now() });
          const statsRef = doc(db, 'store_stats', 'global');
          await setDoc(statsRef, { visitorCount: increment(1) }, { merge: true });
        }
      } catch (error) {
        console.error("Lỗi đếm lượt truy cập:", error);
      }
    };

    trackVisitor();

    // Lắng nghe biến đếm tổng thời gian thực để hiển thị ra màn hình
    const statsRef = doc(db, 'store_stats', 'global');
    const unsubStats = onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        setVisitorCount(docSnap.data().visitorCount || 0);
      }
    });

    return () => unsubStats();
  }, [user]);

  useEffect(() => {
    if (!user || !db) return;
    const appsRef = collection(db, 'store_apps');
    const unsubApps = onSnapshot(appsRef, (snapshot) => {
      const appsData = [];
      snapshot.forEach((doc) => {
        appsData.push({ id: doc.id, ...doc.data() });
      });
      appsData.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : a.createdAt;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : b.createdAt;
        return dateB - dateA; 
      });
      setApps(appsData);
      setLoading(false);
    }, (error) => {
      setDbError('Lỗi quyền truy cập Firebase.');
      setLoading(false);
    });

    const catRef = collection(db, 'store_categories');
    const unsubCats = onSnapshot(catRef, (snapshot) => {
      const catData = [];
      snapshot.forEach((doc) => {
        catData.push({ id: doc.id, ...doc.data() });
      });
      catData.sort((a, b) => a.createdAt - b.createdAt);
      setDbCategories(catData);
    });

    return () => {
      unsubApps();
      unsubCats();
    };
  }, [user]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginPassword('');
    } else {
      setLoginError('Mật khẩu không chính xác!');
    }
  };

  const handleOpenForm = (appItem = null) => {
    if (appItem) {
      setEditingId(appItem.id);
      setFormData({
        name: appItem.name || '',
        description: appItem.description || '',
        category: appItem.category || '',
        iconUrl: appItem.iconUrl || '',
        link: appItem.link || '',
        releaseDate: appItem.releaseDate || ''
      });
    } else {
      setEditingId(null);
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        name: '',
        description: '',
        category: dbCategories.length > 0 ? dbCategories[0].name : '',
        iconUrl: '',
        link: '',
        releaseDate: today
      });
    }
    setShowForm(true);
  };

  const handleSaveApp = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const dataToSave = { ...formData, updatedAt: Date.now() };
      if (editingId) {
        await updateDoc(doc(db, 'store_apps', editingId), dataToSave);
      } else {
        await addDoc(collection(db, 'store_apps'), { ...dataToSave, createdAt: Date.now() });
      }
      setShowForm(false);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteApp = (id, name) => {
    setConfirmDialog({
      title: `Xoá "${name}"?`,
      message: "Bạn có chắc chắn muốn xoá ứng dụng này không?",
      onConfirm: async () => {
        await deleteDoc(doc(db, 'store_apps', id));
        setConfirmDialog(null);
      }
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (dbCategories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
        setCatError("Danh mục đã tồn tại!");
        return;
    }
    await addDoc(collection(db, 'store_categories'), { name: newCatName.trim(), createdAt: Date.now() });
    setNewCatName('');
  };

  const handleDeleteCategory = (id, name) => {
    setConfirmDialog({
      title: `Xoá danh mục "${name}"?`,
      message: "Ứng dụng trong danh mục này sẽ không bị xoá.",
      onConfirm: async () => {
        await deleteDoc(doc(db, 'store_categories', id));
        setConfirmDialog(null);
      }
    });
  };

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'Game': return <Gamepad2 size={14} className="mr-1" />;
      case 'Phần mềm': return <MonitorPlay size={14} className="mr-1" />;
      default: return <LayoutGrid size={14} className="mr-1" />;
    }
  };

  const displayCategories = ['Tất cả', ...dbCategories.map(c => c.name)];
  const filteredApps = apps.filter(app => {
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = app.name.toLowerCase().includes(searchLow) || 
                          app.description.toLowerCase().includes(searchLow);
    const matchesCategory = activeCategory === 'Tất cả' || app.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    // THIẾT LẬP W-FULL TUYỆT ĐỐI CHO CONTAINER NGOÀI CÙNG
    <div className="min-h-screen w-full bg-white text-slate-800 font-sans selection:bg-cyan-500 selection:text-white flex flex-col m-0 p-0 overflow-x-hidden">
      
      {/* VÙNG NỘI DUNG CHÍNH CŨNG TRÀN VIỀN W-FULL, KHÔNG CÓ BẤT KỲ MAX-W NÀO */}
      <div className="w-full bg-white min-h-screen relative flex flex-col">
        
        {/* Header Header tràn viền 100% */}
        <div className="bg-slate-900 relative px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pt-8 pb-6 text-white sticky top-0 z-40 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.4)] border-b border-cyan-500/30 w-full">
          <div className="absolute inset-0 opacity-20 grid-pattern pointer-events-none"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-5 relative z-10 w-full">
            <div className="flex items-center group cursor-pointer flex-shrink-0">
              <img 
                src="https://lh3.googleusercontent.com/d/1RjUhWb2asNqhetIBybpZJ8EVCqYQDdo5" 
                alt="Logo" 
                className="w-10 h-10 md:w-12 md:h-12 mr-3 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] group-hover:scale-110 transition-transform duration-300"
              />
              {/* THAY ĐỔI: Tách riêng hiệu ứng cho từng phần chữ */}
              <h1 className="text-2xl md:text-3xl font-black tracking-widest font-tech uppercase flex items-center">
                {/* Chữ HOÀNG màu xanh neon phát sáng */}
                <span className="text-cyan-400 [text-shadow:0_0_15px_rgba(34,211,238,0.8)]">Hoàng</span>
                {/* Chữ APPSTORE hiệu ứng kim loại lướt sáng */}
                <span className="ml-2 font-light tracking-normal animate-metal-shine drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">Appstore</span>
              </h1>
            </div>

            {/* Thanh tìm kiếm có max-width để trông cân đối */}
            <div className="relative w-full max-w-full md:max-w-xl lg:max-w-2xl xl:max-w-3xl group mx-auto">
              <Search className="absolute left-4 top-3.5 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Tìm kiếm ứng dụng, game..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                /* THAY ĐỔI: Tăng sáng placeholder thành cyan-300/80 và chữ gõ thành màu trắng tinh (text-white) */
                className="w-full bg-slate-900/60 text-white placeholder-cyan-300/80 border border-cyan-500/50 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-400/80 focus:bg-slate-800 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
              />
            </div>

            <div className="hidden md:flex items-center gap-4 flex-shrink-0">
              {isAdmin ? (
                <button onClick={() => setIsAdmin(false)} className="p-3 bg-slate-800 border border-cyan-500/30 text-cyan-400 rounded-full hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] transition flex items-center shadow-lg" title="Thoát Admin">
                  <LogOut size={22} />
                </button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="p-3 text-cyan-400 hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-transparent hover:border-cyan-500/30 rounded-full transition flex items-center" title="Đăng nhập Quản trị">
                  <UserCircle size={26} />
                </button>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex justify-center mt-6 relative z-10 w-full">
            <div className="bg-slate-950/60 p-1.5 rounded-full border border-cyan-500/30 flex shadow-inner backdrop-blur-sm">
              <button
                onClick={() => setActiveView('apps')}
                className={`px-6 py-2 rounded-full font-bold text-sm flex items-center transition-all duration-300 ${activeView === 'apps' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-cyan-600 hover:text-cyan-300'}`}
              >
                <AppWindow size={18} className="mr-2" /> Kho Ứng Dụng
              </button>
              <button
                onClick={() => setActiveView('videos')}
                className={`px-6 py-2 rounded-full font-bold text-sm flex items-center transition-all duration-300 ${activeView === 'videos' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-cyan-600 hover:text-cyan-300'}`}
              >
                <Youtube size={18} className="mr-2" /> Video AI
              </button>
            </div>
          </div>
        </div>

        {/* Content Area - Tràn viền 100% */}
        {activeView === 'apps' ? (
          <div className="pb-24 w-full">
            <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-4 overflow-x-auto no-scrollbar bg-slate-50 flex gap-3 border-b border-slate-200 w-full">
              {displayCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-400/50 scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:border-cyan-300 hover:text-cyan-600 shadow-sm'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isAdmin && (
              <div className="mx-4 sm:mx-6 md:mx-8 lg:mx-12 xl:mx-16 my-6 bg-slate-900 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 border border-cyan-500/30 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none grid-pattern"></div>
                <div className="flex items-center text-cyan-400 font-bold uppercase tracking-widest text-sm relative z-10">
                  <ShieldCheck size={20} className="mr-2 text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" /> BẢNG ĐIỀU KHIỂN
                </div>
                <div className="flex gap-3 relative z-10 w-full md:w-auto">
                  <button onClick={() => setShowCatManager(true)} className="flex-1 md:flex-none px-5 py-2.5 bg-slate-800 text-cyan-300 rounded-lg hover:bg-slate-700 font-bold text-sm border border-cyan-500/50 transition"><Tags size={16} className="inline mr-2"/>Danh mục</button>
                  <button onClick={() => handleOpenForm()} className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-400 hover:to-blue-500 font-bold text-sm shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-400/50 transition"><Plus size={16} className="inline mr-1.5 font-bold"/>Thêm App</button>
                </div>
              </div>
            )}

            <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mt-6 w-full">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-600" size={32} /></div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <LayoutGrid size={48} className="mx-auto mb-4 opacity-20 text-cyan-500" />
                  <p>Chưa có kết quả tìm kiếm phù hợp.</p>
                </div>
              ) : (
                /* THAY ĐỔI: Sử dụng lưới 3-4 cột trên Mobile để giống giao diện iOS, kết hợp với Flex-col cho nội dung bên trong */
                <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] gap-3 sm:gap-5 lg:gap-6 w-full">
                  {filteredApps.map(app => (
                    <div key={app.id} className="group relative w-full h-full block rounded-2xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_-5px_rgba(6,182,212,0.3)] hover:z-50">
                      
                      {/* 1. LỚP VIỀN NEON */}
                      <div className="absolute -inset-[2px] rounded-[18px] opacity-0 group-hover:opacity-100 overflow-hidden pointer-events-none z-0">
                        <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(transparent_75%,#06b6d4_100%)] animate-[spin_2s_linear_infinite]"></div>
                      </div>

                      {/* 2. TOOLTIP */}
                      <div className="absolute z-50 bottom-[105%] left-1/2 transform -translate-x-1/2 mb-3 w-72 pointer-events-none hidden group-hover:block">
                        <div className="animate-in fade-in zoom-in duration-200 origin-bottom">
                          <div className="bg-slate-900 border border-cyan-500/50 rounded-xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.6)] relative">
                            <p className="text-[13px] text-cyan-400 [text-shadow:0_0_8px_rgba(34,211,238,0.8)] leading-relaxed font-normal whitespace-pre-wrap">{app.description}</p>
                            <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-b border-r border-cyan-500/50 rotate-45"></div>
                          </div>
                        </div>
                      </div>

                      {/* 3. NỘI DUNG THẺ: Tối ưu cho Mobile (Xếp dọc, ẩn mô tả) và Desktop (Xếp ngang, hiển thị đầy đủ) */}
                      <div className="relative z-10 w-full h-full bg-white border border-gray-100 group-hover:border-transparent rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 min-w-0 transition-colors">
                        
                        {/* Icon */}
                        <a href={app.link} target="_blank" rel="noopener noreferrer" className="w-[52px] h-[52px] sm:w-16 sm:h-16 flex-shrink-0 bg-gray-50 rounded-[14px] sm:rounded-xl overflow-hidden border border-gray-100 shadow-inner group-hover:scale-105 transition-transform block">
                          <img 
                            src={app.iconUrl || FALLBACK_IMAGE} 
                            alt={app.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                          />
                        </a>

                        {/* Text Container */}
                        <div className="flex-1 overflow-hidden w-full text-center sm:text-left flex flex-col justify-center">
                          <a href={app.link} target="_blank" rel="noopener noreferrer" className="block w-full">
                            {/* Font thường (font-normal) trên Mobile, đậm trên Desktop */}
                            <h3 className="font-normal sm:font-bold text-gray-800 sm:text-gray-900 text-[11px] sm:text-sm line-clamp-2 sm:truncate w-full leading-tight sm:leading-normal" title={app.name}>{app.name}</h3>
                            
                            {/* THAY ĐỔI: Bọc thẻ p vào một thẻ div để class 'block' không ghi đè làm hỏng 'line-clamp' */}
                            <div className="hidden sm:block mt-1 w-full">
                              <p className="text-xs text-gray-500 line-clamp-2 leading-tight min-h-[2rem] w-full">{app.description}</p>
                            </div>
                          </a>
                          
                          {/* Tags ẩn trên Mobile */}
                          <div className="hidden sm:flex flex-wrap items-center gap-2 mt-1 w-full overflow-hidden">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center border border-blue-100 truncate">
                              {getCategoryIcon(app.category)}
                              <span className="truncate">{app.category}</span>
                            </span>
                            {app.releaseDate && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 truncate hidden sm:inline-block">
                                {new Date(app.releaseDate).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Admin Buttons - Desktop */}
                        {isAdmin && (
                          <div className="hidden sm:flex flex-col gap-2 pl-2 sm:pl-3 border-l border-gray-100 flex-shrink-0">
                            <button onClick={() => handleOpenForm(app)} className="p-1.5 sm:p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"><Edit size={14} className="sm:w-4 sm:h-4" /></button>
                            <button onClick={() => handleDeleteApp(app.id, app.name)} className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} className="sm:w-4 sm:h-4" /></button>
                          </div>
                        )}
                        
                        {/* Admin Buttons - Phụ riêng cho Mobile (nhỏ gọn ở góc) */}
                        {isAdmin && (
                          <div className="flex sm:hidden absolute top-1 right-1 flex-col gap-1">
                            <button onClick={() => handleOpenForm(app)} className="p-1.5 text-cyan-600 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-100"><Edit size={12} /></button>
                            <button onClick={() => handleDeleteApp(app.id, app.name)} className="p-1.5 text-red-500 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-100"><Trash2 size={12} /></button>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 pb-24 w-full">
            <div className="w-full mx-auto">
              <div className="flex items-center mb-8">
                <Youtube className="text-red-500 mr-3 drop-shadow-md" size={32} />
                <h2 className="text-2xl font-black text-slate-800 font-tech uppercase tracking-wider">Danh Sách Phát AI</h2>
              </div>
              
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(350px,1fr))] gap-6 w-full">
                {AI_PLAYLISTS.map((pl) => (
                  /* Áp dụng cấu trúc y hệt cho Video AI với viền Neon mỏng chạy vòng quanh */
                  <div key={pl.id} onClick={() => setPlayingPlaylist(pl)} className="group relative block cursor-pointer transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_-5px_rgba(239,68,68,0.3)] rounded-3xl">

                    {/* Lớp viền neon màu đỏ */}
                    <div className="absolute -inset-[2px] rounded-[26px] opacity-0 group-hover:opacity-100 overflow-hidden pointer-events-none z-0">
                      <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(transparent_75%,#ef4444_100%)] animate-[spin_2s_linear_infinite]"></div>
                    </div>

                    {/* Lớp nền trắng đè lên trên */}
                    <div className="relative z-10 w-full h-full bg-white border border-slate-100 group-hover:border-transparent rounded-3xl p-4 transition-colors">
                      <div className="relative aspect-video rounded-2xl overflow-hidden mb-5 bg-slate-900 shadow-inner">
                        <img 
                          src={pl.thumbnail || FALLBACK_IMAGE} 
                          alt={pl.title} 
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                          onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 group-hover:bg-transparent transition-colors duration-300">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                            <Play size={32} className="text-white fill-white ml-1" />
                          </div>
                        </div>
                      </div>
                      <div className="px-2">
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-cyan-600 transition-colors mb-1">{pl.title}</h3>
                        <p className="text-slate-500 text-xs leading-relaxed">{pl.description}</p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHÂN TRANG & BẢN QUYỀN */}
        <footer className="mt-auto border-t border-slate-200 bg-slate-50 py-8 w-full flex flex-col items-center justify-center relative z-10">
          <div className="flex flex-col items-center justify-center gap-3">
            <p className="text-slate-600 text-sm font-bold tracking-wide uppercase font-tech">
              Copyright © Nguyễn Xuân Hoàng 2026
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-cyan-200 cursor-default">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              Lượt truy cập hệ thống: <span className="font-black text-cyan-600 text-sm ml-1">{visitorCount}</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Popups & Modals */}
      {showLogin && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setShowLogin(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={24} /></button>
            <div className="text-center mb-8">
              <div className="bg-cyan-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-600 shadow-inner border border-cyan-100">
                <ShieldCheck size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">ADMIN LOGIN</h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="" 
                /* THAY ĐỔI: Đổi nền tối và chữ màu xanh neon sáng với hiệu ứng phát sáng (text-shadow) */
                className="w-full bg-slate-900 border-2 border-cyan-500/50 text-cyan-400 [text-shadow:0_0_10px_rgba(34,211,238,0.8)] placeholder-slate-600 font-black rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-slate-950 text-center text-2xl tracking-[0.3em] transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
                autoFocus
              />
              <button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black rounded-2xl py-4 hover:from-cyan-500 hover:to-blue-500 transition shadow-[0_0_15px_rgba(6,182,212,0.4)] uppercase tracking-widest text-lg">Xác nhận</button>
            </form>
          </div>
        </div>
      )}

      {/* YouTube Cinema Modal */}
      {playingPlaylist && (
        <div className="fixed inset-0 bg-slate-950/98 z-[200] flex flex-col items-center justify-center p-4 md:p-12 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="w-full max-w-7xl flex justify-between items-center mb-6">
            <h3 className="text-cyan-400 font-tech font-black text-2xl flex items-center uppercase tracking-tighter">
              <Youtube className="text-red-500 mr-4 shadow-[0_0_15px_rgba(239,68,68,0.5)]" size={32} /> {playingPlaylist.title}
            </h3>
            <button onClick={() => setPlayingPlaylist(null)} className="p-4 bg-white/5 hover:bg-red-600 rounded-full text-white transition-all border border-white/10 hover:scale-110"><X size={32} /></button>
          </div>
          <div className="w-full max-w-7xl aspect-video rounded-[3rem] shadow-[0_0_100px_rgba(6,182,212,0.15)] bg-black overflow-hidden border border-white/10 relative z-10 animate-in zoom-in-95">
            <iframe 
              className="w-full h-full"
              src={`https://www.youtube.com/embed/videoseries?list=${playingPlaylist.id}&rel=0`}
              frameBorder="0" allowFullScreen
            ></iframe>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none"></div>
        </div>
      )}

      {/* General App Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingId ? 'Cập Nhật App' : 'Thêm App Mới'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveApp} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Tên hiển thị</label>
                  <input type="text" required value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Ngày phát hành</label>
                  <input type="date" required value={formData.releaseDate} onChange={(e)=>setFormData({...formData, releaseDate:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Mô tả tóm tắt</label>
                <textarea rows="3" required value={formData.description} onChange={(e)=>setFormData({...formData, description:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all resize-none"></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Danh mục</label>
                  <select value={formData.category} onChange={(e)=>setFormData({...formData, category:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all">
                    {dbCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Link tải / truy cập</label>
                  <input type="url" required value={formData.link} onChange={(e)=>setFormData({...formData, link:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all" />
                </div>
              </div>
              
              <div className="bg-cyan-50 p-6 rounded-3xl border border-cyan-100">
                <label className="block text-xs font-black text-cyan-700 uppercase mb-3 ml-1 flex items-center">
                  <LinkIcon size={14} className="mr-2" /> Link icon (Google Drive/URL)
                </label>
                
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 flex-shrink-0 bg-white rounded-xl border border-cyan-200 overflow-hidden shadow-sm flex items-center justify-center">
                    <img 
                      src={formData.iconUrl || FALLBACK_IMAGE} 
                      alt="preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                    />
                  </div>
                  <input 
                    type="url" required value={formData.iconUrl} 
                    onChange={(e) => {
                      let val = e.target.value;
                      const match = val.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([-_A-Za-z0-9]+)/);
                      if (match) val = `https://lh3.googleusercontent.com/d/${match[1]}`;
                      setFormData({...formData, iconUrl: val});
                    }}
                    className="flex-1 bg-white border border-cyan-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-cyan-500 transition-all" 
                    placeholder="Dán link ảnh vào đây..."
                  />
                </div>
              </div>
              <button disabled={isUploading} type="submit" className="w-full bg-cyan-600 text-white font-black rounded-3xl py-5 hover:bg-cyan-700 transition shadow-xl disabled:opacity-50 uppercase tracking-widest text-lg">
                {isUploading ? 'ĐANG LƯU DỮ LIỆU...' : 'HOÀN TẤT LƯU ỨNG DỤNG'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCatManager && (
        <div className="fixed inset-0 bg-slate-950/80 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tighter">Quản lý danh mục</h2>
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
              <input type="text" value={newCatName} onChange={(e)=>setNewCatName(e.target.value)} placeholder="Tên danh mục..." className="flex-1 bg-slate-50 border rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500" required />
              <button type="submit" className="bg-cyan-600 text-white px-6 rounded-xl font-bold hover:bg-cyan-700 transition">THÊM</button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
              {dbCategories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-cyan-200 transition-colors">
                  <span className="font-bold text-slate-700">{cat.name}</span>
                  <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-gray-400 hover:text-red-600 transition-colors p-1"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowCatManager(false)} className="w-full mt-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors uppercase tracking-widest">Đóng bảng</button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/90 z-[300] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl border-2 border-slate-100">
             <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{confirmDialog.title}</h3>
             <p className="text-slate-500 mb-8 leading-relaxed">{confirmDialog.message}</p>
             <div className="flex gap-4">
               <button onClick={() => setConfirmDialog(null)} className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition">HỦY</button>
               <button onClick={confirmDialog.onConfirm} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition shadow-lg shadow-red-200">XÁC NHẬN</button>
             </div>
          </div>
        </div>
      )}
      
      {/* Đã dọn dẹp sạch sẽ CSS thừa, chỉ giữ lại những gì thực sự cần thiết */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap');
        
        /* THAY ĐỔI: HIỆU ỨNG CHỮ KIM LOẠI ÁNH SÁNG CHẠY */
        @keyframes text-metal-shine {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .animate-metal-shine {
          background: linear-gradient(
            120deg,
            #94a3b8 0%,    /* Xám bạc tối */
            #e2e8f0 25%,   /* Bạc sáng */
            #ffffff 45%,   /* Vệt sáng lóa */
            #ffffff 55%,   /* Vệt sáng lóa */
            #e2e8f0 75%,   /* Bạc sáng */
            #94a3b8 100%   /* Xám bạc tối */
          );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: text-metal-shine 3s linear infinite;
        }

        /* Ép ứng dụng tràn viền 100% */
        #root {
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          text-align: left !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background-color: white !important;
        }

        .font-tech { font-family: 'Orbitron', sans-serif; }
        .grid-pattern {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(34, 211, 238, 0.05) 1px, transparent 1px), 
            linear-gradient(to bottom, rgba(34, 211, 238, 0.05) 1px, transparent 1px);
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
