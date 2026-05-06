/**
 * Mall Store - M4商城核心数据与逻辑
 * 
 * Manages products, categories, redeem codes, and mall state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, ProductCategory, RedeemCode, RedeemResult, UserRedeemHistory } from '../types/mall';

// ============================================================================
// Mock Product Data
// ============================================================================

const MOCK_PRODUCTS: Product[] = [
  // Avatar Category
  {
    id: 'avatar-001',
    name: '星空宇航员',
    nameEn: 'Space Astronaut',
    description: '戴着宇航头盔的小可爱，在星空中遨游',
    descriptionEn: 'A cute little astronaut floating in space',
    price: 500,
    originalPrice: 800,
    image: '🧑‍🚀',
    category: 'avatar',
    tags: ['稀有', '太空', '宇航员'],
    stock: 100,
    sales: 234,
    rating: 4.8,
    isFeatured: true,
    isNew: false,
    createdAt: '2024-01-15',
  },
  {
    id: 'avatar-002',
    name: '森林精灵',
    nameEn: 'Forest Elf',
    description: '来自森林深处的神秘精灵',
    descriptionEn: 'A mysterious elf from the depths of the forest',
    price: 300,
    image: '🧝',
    category: 'avatar',
    tags: ['精灵', '森林', '魔法'],
    stock: 200,
    sales: 567,
    rating: 4.6,
    isFeatured: false,
    isNew: true,
    createdAt: '2024-03-01',
  },
  {
    id: 'avatar-003',
    name: '未来机器人',
    nameEn: 'Future Robot',
    description: '来自未来的高科技机器人',
    descriptionEn: 'High-tech robot from the future',
    price: 450,
    originalPrice: 600,
    image: '🤖',
    category: 'avatar',
    tags: ['科技', '机器人', '未来'],
    stock: 150,
    sales: 189,
    rating: 4.7,
    isFeatured: true,
    isNew: false,
    createdAt: '2024-02-10',
  },
  // Skin Category
  {
    id: 'skin-001',
    name: '樱花飘落',
    nameEn: 'Sakura Falling',
    description: '粉色樱花飘落的浪漫特效',
    descriptionEn: 'Romantic pink sakura falling effect',
    price: 200,
    image: '🌸',
    category: 'skin',
    tags: ['樱花', '浪漫', '粉色'],
    stock: 500,
    sales: 1024,
    rating: 4.9,
    isFeatured: true,
    isNew: false,
    createdAt: '2024-01-20',
  },
  {
    id: 'skin-002',
    name: '暗黑骑士',
    nameEn: 'Dark Knight',
    description: '神秘的暗黑系骑士皮肤',
    descriptionEn: 'Mysterious dark knight skin',
    price: 350,
    image: '🖤',
    category: 'skin',
    tags: ['暗黑', '骑士', '神秘'],
    stock: 300,
    sales: 456,
    rating: 4.5,
    isFeatured: false,
    isNew: true,
    createdAt: '2024-03-05',
  },
  // Item Category
  {
    id: 'item-001',
    name: '幸运魔法棒',
    nameEn: 'Lucky Magic Wand',
    description: '使用后可获得随机奖励',
    descriptionEn: 'Use to receive random rewards',
    price: 100,
    image: '✨',
    category: 'item',
    tags: ['魔法', '幸运', '随机奖励'],
    stock: 1000,
    sales: 3456,
    rating: 4.4,
    isFeatured: false,
    isNew: false,
    createdAt: '2024-01-05',
  },
  {
    id: 'item-002',
    name: '变形药水',
    nameEn: 'Transform Potion',
    description: '使用后可以变换形态',
    descriptionEn: 'Transform into a different form',
    price: 150,
    image: '🧪',
    category: 'item',
    tags: ['变形', '药水', '特效'],
    stock: 800,
    sales: 2345,
    rating: 4.6,
    isFeatured: true,
    isNew: false,
    createdAt: '2024-02-01',
  },
  // Badge Category
  {
    id: 'badge-001',
    name: '超级达人',
    nameEn: 'Super Expert',
    description: '证明你是某领域的超级达人',
    descriptionEn: 'Proves you are a super expert in a field',
    price: 250,
    image: '🏅',
    category: 'badge',
    tags: ['达人', '成就', '荣誉'],
    stock: 400,
    sales: 789,
    rating: 4.7,
    isFeatured: false,
    isNew: false,
    createdAt: '2024-01-25',
  },
  {
    id: 'badge-002',
    name: '活跃用户',
    nameEn: 'Active User',
    description: '每日活跃用户的荣誉象征',
    descriptionEn: 'Honorary symbol for daily active users',
    price: 100,
    image: '🎖️',
    category: 'badge',
    tags: ['活跃', '日常', '荣誉'],
    stock: 9999,
    sales: 5678,
    rating: 4.3,
    isFeatured: false,
    isNew: false,
    createdAt: '2024-01-01',
  },
  // Frame Category
  {
    id: 'frame-001',
    name: '金色皇冠框',
    nameEn: 'Golden Crown Frame',
    description: '尊贵的金色皇冠头像框',
    descriptionEn: 'Noble golden crown avatar frame',
    price: 400,
    originalPrice: 500,
    image: '👑',
    category: 'frame',
    tags: ['金色', '皇冠', '尊贵'],
    stock: 200,
    sales: 1234,
    rating: 4.8,
    isFeatured: true,
    isNew: false,
    createdAt: '2024-02-15',
  },
  {
    id: 'frame-002',
    name: '彩虹边框',
    nameEn: 'Rainbow Border',
    description: '五彩缤纷的彩虹头像框',
    descriptionEn: 'Colorful rainbow avatar frame',
    price: 300,
    image: '🌈',
    category: 'frame',
    tags: ['彩虹', '彩色', '活泼'],
    stock: 300,
    sales: 987,
    rating: 4.6,
    isFeatured: false,
    isNew: true,
    createdAt: '2024-03-10',
  },
  // Effect Category
  {
    id: 'effect-001',
    name: '烟花特效',
    nameEn: 'Firework Effect',
    description: '绚丽的烟花绽放特效',
    descriptionEn: 'Brilliant firework explosion effect',
    price: 180,
    image: '🎆',
    category: 'effect',
    tags: ['烟花', '庆典', '绚烂'],
    stock: 600,
    sales: 2345,
    rating: 4.7,
    isFeatured: true,
    isNew: false,
    createdAt: '2024-01-30',
  },
  {
    id: 'effect-002',
    name: '星星闪烁',
    nameEn: 'Star Twinkle',
    description: '可爱的星星闪烁效果',
    descriptionEn: 'Cute twinkling star effect',
    price: 80,
    image: '⭐',
    category: 'effect',
    tags: ['星星', '闪烁', '可爱'],
    stock: 1000,
    sales: 4567,
    rating: 4.5,
    isFeatured: false,
    isNew: false,
    createdAt: '2024-02-05',
  },
  // Theme Category
  {
    id: 'theme-001',
    name: '赛博朋克',
    nameEn: 'Cyberpunk Theme',
    description: '未来科技感的赛博朋克主题',
    descriptionEn: 'Futuristic cyberpunk theme',
    price: 350,
    originalPrice: 450,
    image: '🌃',
    category: 'theme',
    tags: ['赛博朋克', '科技', '未来'],
    stock: 250,
    sales: 876,
    rating: 4.8,
    isFeatured: true,
    isNew: false,
    createdAt: '2024-02-20',
  },
  {
    id: 'theme-002',
    name: '樱花季',
    nameEn: 'Sakura Season',
    description: '浪漫的樱花季主题',
    descriptionEn: 'Romantic sakura season theme',
    price: 280,
    image: '🏯',
    category: 'theme',
    tags: ['樱花', '日本', '浪漫'],
    stock: 350,
    sales: 1567,
    rating: 4.6,
    isFeatured: false,
    isNew: true,
    createdAt: '2024-03-08',
  },
];

const MOCK_CATEGORIES = [
  { id: 'avatar' as ProductCategory, name: '头像', nameEn: 'Avatar', icon: '😊', color: '#FF6B9D' },
  { id: 'skin' as ProductCategory, name: '皮肤', nameEn: 'Skin', icon: '✨', color: '#9B7FD4' },
  { id: 'item' as ProductCategory, name: '道具', nameEn: 'Item', icon: '🎁', color: '#4ECDC4' },
  { id: 'badge' as ProductCategory, name: '徽章', nameEn: 'Badge', icon: '🏅', color: '#FFB84D' },
  { id: 'frame' as ProductCategory, name: '头像框', nameEn: 'Frame', icon: '🖼️', color: '#A8E6CF' },
  { id: 'effect' as ProductCategory, name: '特效', nameEn: 'Effect', icon: '💫', color: '#DDA0DD' },
  { id: 'theme' as ProductCategory, name: '主题', nameEn: 'Theme', icon: '🎨', color: '#87CEEB' },
];

// ============================================================================
// Mall Store Types
// ============================================================================

interface MallState {
  // Products
  products: Product[];
  selectedCategory: ProductCategory | 'all';
  searchQuery: string;
  sortBy: 'sales' | 'price' | 'rating' | 'newest';
  
  // User coins (mock)
  userCoins: number;
  
  // Redeem codes
  redeemCodes: RedeemCode[];
  redeemHistory: UserRedeemHistory[];
  
  // UI State
  isLoading: boolean;
  
  // Actions - Products
  getProducts: () => Product[];
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (category: ProductCategory) => Product[];
  getFeaturedProducts: () => Product[];
  getNewProducts: () => Product[];
  setSelectedCategory: (category: ProductCategory | 'all') => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'sales' | 'price' | 'rating' | 'newest') => void;
  
  // Actions - Categories
  getCategories: () => typeof MOCK_CATEGORIES;
  
  // Actions - Redeem
  redeemCode: (code: string) => Promise<RedeemResult>;
  addRedeemCode: (code: RedeemCode) => void;
  
  // Actions - Coins
  addCoins: (amount: number) => void;
  deductCoins: (amount: number) => boolean;
  
  // Actions - Purchase (mock)
  purchaseProduct: (productId: string) => Promise<boolean>;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useMallStore = create<MallState>()(
  persist(
    (set, get) => ({
      // Initial State
      products: MOCK_PRODUCTS,
      selectedCategory: 'all',
      searchQuery: '',
      sortBy: 'sales',
      userCoins: 1000, // Start with some mock coins
      redeemCodes: [
        // Pre-defined demo codes
        {
          code: 'WELCOME100',
          type: 'coins',
          coinsAmount: 100,
          usesLeft: 100,
          maxUses: 100,
          createdAt: '2024-01-01',
          isUsed: false,
        },
        {
          code: 'VIP2024',
          type: 'vip',
          vipDays: 7,
          usesLeft: 50,
          maxUses: 50,
          createdAt: '2024-01-01',
          isUsed: false,
        },
        {
          code: 'STARTERPACK',
          type: 'product',
          productId: 'item-001',
          usesLeft: 30,
          maxUses: 30,
          createdAt: '2024-01-01',
          isUsed: false,
        },
      ],
      redeemHistory: [],
      isLoading: false,

      // Product Actions
      getProducts: () => {
        const { products, selectedCategory, searchQuery, sortBy } = get();
        
        let filtered = [...products];
        
        // Filter by category
        if (selectedCategory !== 'all') {
          filtered = filtered.filter(p => p.category === selectedCategory);
        }
        
        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.nameEn.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.tags.some(t => t.toLowerCase().includes(query))
          );
        }
        
        // Sort
        switch (sortBy) {
          case 'sales':
            filtered.sort((a, b) => b.sales - a.sales);
            break;
          case 'price':
            filtered.sort((a, b) => a.price - b.price);
            break;
          case 'rating':
            filtered.sort((a, b) => b.rating - a.rating);
            break;
          case 'newest':
            filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            break;
        }
        
        return filtered;
      },

      getProductById: (id: string) => {
        return get().products.find(p => p.id === id);
      },

      getProductsByCategory: (category: ProductCategory) => {
        return get().products.filter(p => p.category === category);
      },

      getFeaturedProducts: () => {
        return get().products.filter(p => p.isFeatured);
      },

      getNewProducts: () => {
        return get().products.filter(p => p.isNew);
      },

      setSelectedCategory: (category) => {
        set({ selectedCategory: category });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setSortBy: (sort) => {
        set({ sortBy: sort });
      },

      // Category Actions
      getCategories: () => MOCK_CATEGORIES,

      // Redeem Actions
      redeemCode: async (code: string) => {
        const { redeemCodes, addCoins, redeemHistory } = get();
        
        // Find the code
        const redeemEntry = redeemCodes.find(
          c => c.code.toUpperCase() === code.toUpperCase() && c.usesLeft > 0
        );

        if (!redeemEntry) {
          return {
            success: false,
            message: '兑换码无效或已过期',
          };
        }

        // Check if expired
        if (redeemEntry.expiresAt && new Date(redeemEntry.expiresAt) < new Date()) {
          return {
            success: false,
            message: '兑换码已过期',
          };
        }

        // Process the reward
        let reward: RedeemResult['reward'];
        
        switch (redeemEntry.type) {
          case 'coins':
            addCoins(redeemEntry.coinsAmount || 0);
            reward = {
              type: 'coins',
              name: `${redeemEntry.coinsAmount} 金币`,
              value: redeemEntry.coinsAmount || 0,
            };
            break;
          case 'vip':
            reward = {
              type: 'vip',
              name: `${redeemEntry.vipDays} 天 VIP`,
              value: redeemEntry.vipDays || 0,
            };
            break;
          case 'product':
            reward = {
              type: 'product',
              name: '商品',
              value: redeemEntry.productId || '',
            };
            break;
        }

        // Update uses left
        const updatedCodes = redeemCodes.map(c =>
          c.code.toUpperCase() === code.toUpperCase()
            ? { ...c, usesLeft: c.usesLeft - 1 }
            : c
        );
        set({ redeemCodes: updatedCodes });

        // Add to history
        const historyEntry: UserRedeemHistory = {
          id: crypto.randomUUID(),
          code: redeemEntry.code,
          redeemedAt: new Date().toISOString(),
          rewardType: redeemEntry.type,
          rewardName: reward?.name || '',
        };
        set({ redeemHistory: [...redeemHistory, historyEntry] });

        return {
          success: true,
          message: `兑换成功！获得 ${reward?.name}`,
          reward,
        };
      },

      addRedeemCode: (code: RedeemCode) => {
        set(state => ({
          redeemCodes: [...state.redeemCodes, code],
        }));
      },

      // Coin Actions
      addCoins: (amount: number) => {
        set(state => ({
          userCoins: state.userCoins + amount,
        }));
      },

      deductCoins: (amount: number) => {
        const { userCoins } = get();
        if (userCoins >= amount) {
          set({ userCoins: userCoins - amount });
          return true;
        }
        return false;
      },

      // Purchase Action (mock)
      purchaseProduct: async (productId: string) => {
        const product = get().getProductById(productId);
        if (!product) return false;

        const { deductCoins } = get();
        const success = deductCoins(product.price);
        
        if (success) {
          // In a real app, this would add the product to user's inventory
          return true;
        }
        return false;
      },
    }),
    {
      name: 'pixelpal-mall',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userCoins: state.userCoins,
        redeemCodes: state.redeemCodes,
        redeemHistory: state.redeemHistory,
      }),
    }
  )
);
