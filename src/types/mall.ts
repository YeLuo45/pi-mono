// Mall Types for M4商城

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: number; // in coins
  originalPrice?: number; // original price before discount
  image: string;
  category: ProductCategory;
  tags: string[];
  stock: number;
  sales: number;
  rating: number;
  isFeatured: boolean;
  isNew: boolean;
  createdAt: string;
}

export type ProductCategory = 
  | 'avatar'      // 头像装饰
  | 'skin'        // 皮肤/外观
  | 'item'        // 道具
  | 'badge'       // 徽章
  | 'frame'       // 头像框
  | 'effect'      // 特效
  | 'theme';      // 主题

export interface Category {
  id: ProductCategory;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
}

export interface RedeemCode {
  code: string;
  type: 'product' | 'coins' | 'vip';
  productId?: string;
  coinsAmount?: number;
  vipDays?: number;
  usesLeft: number;
  maxUses: number;
  expiresAt?: string;
  createdAt: string;
  isUsed: boolean;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  reward?: {
    type: 'product' | 'coins' | 'vip';
    name: string;
    value: number | string;
  };
}

export interface UserRedeemHistory {
  id: string;
  code: string;
  redeemedAt: string;
  rewardType: 'product' | 'coins' | 'vip';
  rewardName: string;
}
