/**
 * Product Card Component - M4商城商品卡片
 */

import { css } from '@emotion/react';
import React from 'react';
import { Box } from '../ui/Box';
import { FavoriteIcon, FavoriteBorderIcon, ShoppingCart as CartIcon } from '../ui/muiIconMap';
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
      css={css`
        position: relative;
        width: 100%;
        background: rgba(255,255,255,0.03);
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        overflow: hidden;
        transition: all 0.2s ease;
        &:hover {
          transform: translateY(-2px);
          border-color: rgba(155, 127, 212, 0.3);
          box-shadow: 0 4px 20px rgba(155, 127, 212, 0.15);
        }
      `}
    >
      {/* Image / Icon Area */}
      <Box
        css={css`
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          background: rgba(155, 127, 212, 0.1);
          position: relative;
        `}
      >
        {product.image}
        
        {/* Badges */}
        <Box css={css`position: absolute; top: 8px; left: 8px; display: flex; gap: 4px;`}>
          {product.isNew && (
            <Box
              css={css`
                height: 18px;
                font-size: 9px;
                font-weight: 700;
                background: #FF6B9D;
                color: white;
                border-radius: 4px;
                padding: 2px 6px;
                display: inline-flex;
                align-items: center;
              `}
            >
              NEW
            </Box>
          )}
          {product.isFeatured && !product.isNew && (
            <Box
              css={css`
                height: 18px;
                font-size: 9px;
                font-weight: 700;
                background: #FFB84D;
                color: white;
                border-radius: 4px;
                padding: 2px 6px;
                display: inline-flex;
                align-items: center;
              `}
            >
              HOT
            </Box>
          )}
        </Box>

        {/* Discount Badge */}
        {discount && (
          <Box
            css={css`
              position: absolute;
              top: 8px;
              right: 8px;
              background: #FF6B9D;
              color: white;
              font-size: 10px;
              font-weight: 700;
              padding: 2px 4px;
              border-radius: 4px;
            `}
          >
            -{discount}%
          </Box>
        )}

        {/* Favorite Button */}
        <Box
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          css={css`
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: rgba(0,0,0,0.5);
            color: ${isFavorite ? '#FF6B9D' : 'white'};
            opacity: 0.8;
            transition: all 0.2s ease;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            &:hover {
              background: rgba(0,0,0,0.7);
              transform: scale(1.1);
            }
          `}
        >
          {isFavorite ? <FavoriteIcon size={18} /> : <FavoriteBorderIcon size={18} />}
        </Box>
      </Box>

      {/* Content Area */}
      <Box css={css`padding: 12px;`}>
        {/* Name */}
        <Box
          css={css`
            font-size: 14px;
            font-weight: 600;
            color: #f7f8f8;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {language === 'zh' ? product.name : product.nameEn}
        </Box>

        {/* Description */}
        <Box
          css={css`
            font-size: 11px;
            color: rgba(255,255,255,0.5);
            margin-bottom: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {language === 'zh' ? product.description : product.descriptionEn}
        </Box>

        {/* Rating & Sales */}
        <Box css={css`display: flex; align-items: center; gap: 8px; margin-bottom: 8px;`}>
          <Box css={css`font-size: 11px; color: #FFB84D;`}>
            ★ {product.rating}
          </Box>
          <Box css={css`font-size: 11px; color: rgba(255,255,255,0.3);`}>
            {product.sales} sold
          </Box>
        </Box>

        {/* Price & Buy Button */}
        <Box css={css`display: flex; align-items: center; justify-content: space-between;`}>
          <Box>
            <Box
              css={css`
                font-size: 16px;
                font-weight: 700;
                color: ${canAfford ? '#9b7fd4' : '#FF6B9D'};
              `}
            >
              💰 {product.price}
            </Box>
            {product.originalPrice && (
              <Box
                css={css`
                  font-size: 11px;
                  color: rgba(255,255,255,0.3);
                  text-decoration: line-through;
                `}
              >
                💰 {product.originalPrice}
              </Box>
            )}
          </Box>

          <Box
            onClick={handlePurchase}
            css={css`
              background: ${canAfford ? '#9b7fd4' : 'rgba(255,255,255,0.1)'};
              color: ${canAfford ? 'white' : 'rgba(255,255,255,0.3)'};
              width: 36px;
              height: 36px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              cursor: ${canAfford ? 'pointer' : 'not-allowed'};
              opacity: ${canAfford ? 1 : 0.5};
              &:hover {
                background: ${canAfford ? '#7b5fc4' : 'rgba(255,255,255,0.1)'};
                transform: scale(1.05);
              }
            `}
            title={canAfford ? 'Purchase' : 'Insufficient coins'}
          >
            <CartIcon size={18} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ProductCard;
