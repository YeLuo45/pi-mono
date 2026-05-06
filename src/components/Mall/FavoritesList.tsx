/**
 * FavoritesList - M4商城收藏列表页
 */

import React from 'react';
import { Box, Typography, IconButton, Button, Chip } from '@mui/material';
import { Delete as DeleteIcon, ShoppingCart as CartIcon } from '@mui/icons-material';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useMallStore } from '../../stores/mallStore';
import { useStore } from '../../store';

interface FavoritesListProps {
  onClose?: () => void;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({ onClose }) => {
  const language = useStore(s => s.language);
  const favorites = useFavoritesStore(s => s.favorites);
  const removeFavorite = useFavoritesStore(s => s.removeFavorite);
  const clearAllFavorites = useFavoritesStore(s => s.clearAllFavorites);
  const getProductById = useMallStore(s => s.getProductById);
  const userCoins = useMallStore(s => s.userCoins);
  const purchaseProduct = useMallStore(s => s.purchaseProduct);

  const handlePurchase = async (productId: string) => {
    const success = await purchaseProduct(productId);
    if (success) {
      removeFavorite(productId);
    }
  };

  const products = favorites
    .map(f => getProductById(f.productId))
    .filter(Boolean)
    .sort((a, b) => {
      const favA = favorites.find(f => f.productId === a!.id);
      const favB = favorites.find(f => f.productId === b!.id);
      return (favB?.addedAt || 0) - (favA?.addedAt || 0);
    });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {language === 'zh' ? `${products.length} 件收藏商品` : `${products.length} favorited items`}
        </Typography>
        {favorites.length > 0 && (
          <Button
            size="small"
            color="error"
            onClick={clearAllFavorites}
            sx={{ fontSize: 12 }}
          >
            {language === 'zh' ? '清空全部' : 'Clear All'}
          </Button>
        )}
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {products.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              color: 'text.disabled',
            }}
          >
            <Typography sx={{ fontSize: 48, mb: 1 }}>💔</Typography>
            <Typography>
              {language === 'zh' ? '暂无收藏' : 'No favorites yet'}
            </Typography>
            <Typography sx={{ fontSize: 12, mt: 1 }}>
              {language === 'zh' ? '点击商品上的 ❤️ 来添加收藏' : 'Tap ❤️ on products to add favorites'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {products.map((product) => {
              if (!product) return null;
              const canAfford = userCoins >= product.price;
              const addedAt = favorites.find(f => f.productId === product.id)?.addedAt;
              const addedDate = addedAt
                ? new Date(addedAt).toLocaleDateString()
                : '';

              return (
                <Box
                  key={product.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    borderRadius: 1.5,
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'rgba(255,107,157,0.3)',
                    },
                  }}
                >
                  {/* Product Icon */}
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 1,
                      bgcolor: 'rgba(155,127,212,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      flexShrink: 0,
                    }}
                  >
                    {product.image}
                  </Box>

                  {/* Product Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {language === 'zh' ? product.name : product.nameEn}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: 'text.disabled',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {addedDate && `${language === 'zh' ? '收藏于' : 'Added'} ${addedDate}`}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        icon={<span style={{ fontSize: 10 }}>💰</span>}
                        label={product.price}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 600,
                          bgcolor: canAfford ? 'rgba(255,184,77,0.15)' : 'rgba(255,107,157,0.15)',
                          color: canAfford ? '#FFB84D' : '#FF6B9D',
                          '& .MuiChip-icon': { fontSize: 10 },
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <IconButton
                      onClick={() => handlePurchase(product.id)}
                      disabled={!canAfford}
                      size="small"
                      sx={{
                        bgcolor: canAfford ? 'primary.main' : 'rgba(255,255,255,0.05)',
                        color: canAfford ? 'white' : 'text.disabled',
                        width: 32,
                        height: 32,
                        '&:hover': {
                          bgcolor: canAfford ? 'primary.dark' : 'rgba(255,255,255,0.08)',
                        },
                      }}
                    >
                      <CartIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      onClick={() => removeFavorite(product.id)}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,107,157,0.1)',
                        color: '#FF6B9D',
                        width: 32,
                        height: 32,
                        '&:hover': {
                          bgcolor: 'rgba(255,107,157,0.2)',
                        },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default FavoritesList;
