/**
 * Product Card Component - M4商城商品卡片
 */

import React from 'react';
import { Box, Typography, IconButton, Chip, Tooltip } from '@mui/material';
import { Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon, ShoppingCart as CartIcon } from '@mui/icons-material';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useMallStore } from '../../stores/mallStore';
import type { Product } from '../../types/mall';

interface ProductCardProps {
  product: Product;
  language?: 'zh' | 'en';
  onPurchase?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  language = 'zh',
  onPurchase,
}) => {
  const isFavorite = useFavoritesStore(s => s.isFavorite(product.id));
  const toggleFavorite = useFavoritesStore(s => s.toggleFavorite);
  const userCoins = useMallStore(s => s.userCoins);
  const purchaseProduct = useMallStore(s => s.purchaseProduct);

  const canAfford = userCoins >= product.price;

  const handlePurchase = async () => {
    if (!canAfford) return;
    const success = await purchaseProduct(product.id);
    if (success && onPurchase) {
      onPurchase(product);
    }
  };

  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        bgcolor: 'rgba(255,255,255,0.03)',
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'rgba(155, 127, 212, 0.3)',
          boxShadow: '0 4px 20px rgba(155, 127, 212, 0.15)',
          '& .product-actions': {
            opacity: 1,
          },
        },
      }}
    >
      {/* Image / Icon Area */}
      <Box
        sx={{
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          bgcolor: 'rgba(155, 127, 212, 0.1)',
          position: 'relative',
        }}
      >
        {product.image}
        
        {/* Badges */}
        <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.5 }}>
          {product.isNew && (
            <Chip
              label="NEW"
              size="small"
              sx={{
                height: 18,
                fontSize: 9,
                fontWeight: 700,
                bgcolor: '#FF6B9D',
                color: 'white',
              }}
            />
          )}
          {product.isFeatured && !product.isNew && (
            <Chip
              label="HOT"
              size="small"
              sx={{
                height: 18,
                fontSize: 9,
                fontWeight: 700,
                bgcolor: '#FFB84D',
                color: 'white',
              }}
            />
          )}
        </Box>

        {/* Discount Badge */}
        {discount && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: '#FF6B9D',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
            }}
          >
            -{discount}%
          </Box>
        )}

        {/* Favorite Button */}
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: isFavorite ? '#FF6B9D' : 'white',
            opacity: 0.8,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)',
              transform: 'scale(1.1)',
            },
          }}
        >
          {isFavorite ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* Content Area */}
      <Box sx={{ p: 1.5 }}>
        {/* Name */}
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: 'text.primary',
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {language === 'zh' ? product.name : product.nameEn}
        </Typography>

        {/* Description */}
        <Typography
          sx={{
            fontSize: 11,
            color: 'text.secondary',
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {language === 'zh' ? product.description : product.descriptionEn}
        </Typography>

        {/* Rating & Sales */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography sx={{ fontSize: 11, color: '#FFB84D' }}>
            ★ {product.rating}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            {product.sales} sold
          </Typography>
        </Box>

        {/* Price & Buy Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 700,
                color: canAfford ? 'primary.main' : '#FF6B9D',
              }}
            >
              💰 {product.price}
            </Typography>
            {product.originalPrice && (
              <Typography
                sx={{
                  fontSize: 11,
                  color: 'text.disabled',
                  textDecoration: 'line-through',
                }}
              >
                💰 {product.originalPrice}
              </Typography>
            )}
          </Box>

          <Tooltip title={canAfford ? 'Purchase' : 'Insufficient coins'}>
            <IconButton
              onClick={handlePurchase}
              disabled={!canAfford}
              sx={{
                bgcolor: canAfford ? 'primary.main' : 'rgba(255,255,255,0.1)',
                color: canAfford ? 'white' : 'text.disabled',
                width: 36,
                height: 36,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: canAfford ? 'primary.dark' : 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)',
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: 'text.disabled',
                },
              }}
            >
              <CartIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default ProductCard;
