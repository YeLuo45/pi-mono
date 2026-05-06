/**
 * Favorites Store - M4商城收藏功能
 * 
 * Manages user favorites for mall products using Zustand with persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FavoriteItem {
  productId: string;
  addedAt: number;
}

interface FavoritesState {
  // State
  favorites: FavoriteItem[];
  
  // Computed
  isLoading: boolean;
  
  // Actions
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearAllFavorites: () => void;
  getFavoritesCount: () => number;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isLoading: false,

      addFavorite: (productId: string) => {
        set((state) => {
          // Don't add if already exists
          if (state.favorites.some(f => f.productId === productId)) {
            return state;
          }
          return {
            favorites: [
              ...state.favorites,
              { productId, addedAt: Date.now() }
            ]
          };
        });
      },

      removeFavorite: (productId: string) => {
        set((state) => ({
          favorites: state.favorites.filter(f => f.productId !== productId)
        }));
      },

      toggleFavorite: (productId: string) => {
        const { favorites, addFavorite, removeFavorite } = get();
        const exists = favorites.some(f => f.productId === productId);
        if (exists) {
          removeFavorite(productId);
        } else {
          addFavorite(productId);
        }
      },

      isFavorite: (productId: string) => {
        return get().favorites.some(f => f.productId === productId);
      },

      clearAllFavorites: () => {
        set({ favorites: [] });
      },

      getFavoritesCount: () => {
        return get().favorites.length;
      },
    }),
    {
      name: 'pixelpal-favorites',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
      }),
    }
  )
);

// Selector for checking if product is favorited (for use in components)
export const selectIsFavorite = (productId: string) => (state: FavoritesState) =>
  state.favorites.some(f => f.productId === productId);
