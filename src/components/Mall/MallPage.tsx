/**
 * MallPage - M4商城主页
 * 
 * Main mall page with category filtering, product grid, and redeem code input.
 */

import React, { useState } from 'react';
import { MyDialog } from '../MUI替代';
import { MyBox, MyTypography, MyTextField, MyIconButton, MySelect, MySelect, MySelect, MySelect, MySnackbar, MyAlert, MyButton, MyInputAdornment, MyChip } from '../MUI替代';
import {
  Search as SearchIcon,
  LocalOffer as RedeemIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { FavoritesList } from './FavoritesList';
import { useMallStore } from '../../stores/mallStore';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useStore } from '../../store';

export const MallPage: React.FC = () => {
  const language = useStore(s => s.language);
  const userCoins = useMallStore(s => s.userCoins);
  const products = useMallStore(s => s.getProducts());
  const featuredProducts = useMallStore(s => s.getFeaturedProducts());
  const newProducts = useMallStore(s => s.getNewProducts());
  const selectedCategory = useMallStore(s => s.selectedCategory);
  const searchQuery = useMallStore(s => s.searchQuery);
  const sortBy = useMallStore(s => s.sortBy);
  const setSearchQuery = useMallStore(s => s.setSearchQuery);
  const setSortBy = useMallStore(s => s.setSortBy);
  const redeemCode = useMallStore(s => s.redeemCode);
  const favoritesCount = useFavoritesStore(s => s.getFavoritesCount());

  const [redeemInput, setRedeemInput] = useState('');
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!redeemInput.trim()) {
      setSnackbar({ open: true, message: '请输入兑换码', severity: 'error' });
      return;
    }

    const result = await redeemCode(redeemInput.trim());
    if (result.success) {
      setSnackbar({ open: true, message: result.message, severity: 'success' });
      setRedeemInput('');
      setShowRedeemDialog(false);
    } else {
      setSnackbar({ open: true, message: result.message, severity: 'error' });
    }
  };

  const handlePurchase = (product: { name: string }) => {
    setPurchaseSuccess(product.name);
    setTimeout(() => setPurchaseSuccess(null), 3000);
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            🛒 M4 {language === 'zh' ? '商城' : 'Mall'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Favorites Button */}
            <Chip
              icon={<span style={{ fontSize: 14 }}>❤️</span>}
              label={favoritesCount}
              onClick={() => setShowFavorites(true)}
              size="small"
              sx={{
                bgcolor: 'rgba(255,107,157,0.15)',
                color: '#FF6B9D',
                '& .MuiChip-icon': { color: '#FF6B9D' },
              }}
            />
            
            {/* Coins Display */}
            <Chip
              icon={<span style={{ fontSize: 14 }}>💰</span>}
              label={userCoins.toLocaleString()}
              size="small"
              sx={{
                bgcolor: 'rgba(255,184,77,0.15)',
                color: '#FFB84D',
                fontWeight: 600,
              }}
            />

            {/* Redeem Button */}
            <IconButton
              onClick={() => setShowRedeemDialog(true)}
              size="small"
              sx={{
                bgcolor: 'rgba(155,127,212,0.15)',
                color: 'primary.main',
                '&:hover': { bgcolor: 'rgba(155,127,212,0.25)' },
              }}
            >
              <RedeemIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Search & Sort */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            placeholder={language === 'zh' ? '搜索商品...' : 'Search products...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.05)',
              },
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                '& .MuiSelect-select': { py: 1 },
              }}
            >
              <MenuItem value="sales">{language === 'zh' ? '销量' : 'Sales'}</MenuItem>
              <MenuItem value="price">{language === 'zh' ? '价格' : 'Price'}</MenuItem>
              <MenuItem value="rating">{language === 'zh' ? '评分' : 'Rating'}</MenuItem>
              <MenuItem value="newest">{language === 'zh' ? '最新' : 'Newest'}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Category Filter */}
        <CategoryFilter language={language} />
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
        }}
      >
        {/* Featured Products (only show on "all" category) */}
        {selectedCategory === 'all' && featuredProducts.length > 0 && !searchQuery && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.5, color: 'primary.main' }}>
              ⭐ {language === 'zh' ? '热门推荐' : 'Featured'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  language={language}
                  onPurchase={handlePurchase}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* New Products (only show on "all" category) */}
        {selectedCategory === 'all' && newProducts.length > 0 && !searchQuery && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.5, color: '#FF6B9D' }}>
              🆕 {language === 'zh' ? '新品上架' : 'New Arrivals'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {newProducts.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  language={language}
                  onPurchase={handlePurchase}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* All Products / Category Products */}
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
            {selectedCategory === 'all'
              ? language === 'zh'
                ? `全部商品 (${products.length})`
                : `All Products (${products.length})`
              : `${products.length} ${language === 'zh' ? '个商品' : 'products'}`}
          </Typography>
          
          {products.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
                color: 'text.disabled',
              }}
            >
              <Typography sx={{ fontSize: 48, mb: 1 }}>🔍</Typography>
              <Typography>
                {language === 'zh' ? '未找到商品' : 'No products found'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  language={language}
                  onPurchase={handlePurchase}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Redeem Dialog */}
      <Dialog
        open={showRedeemDialog}
        onClose={() => setShowRedeemDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RedeemIcon sx={{ color: 'primary.main' }} />
            {language === 'zh' ? '兑换码' : 'Redeem Code'}
          </Box>
          <IconButton onClick={() => setShowRedeemDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder={language === 'zh' ? '请输入兑换码' : 'Enter redemption code'}
            value={redeemInput}
            onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
            autoFocus
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.05)',
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
              },
            }}
          />
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 1.5 }}>
            💡 {language === 'zh' ? '试试输入：WELCOME100' : 'Try: WELCOME100'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowRedeemDialog(false)} color="inherit">
            {language === 'zh' ? '取消' : 'Cancel'}
          </Button>
          <Button
            onClick={handleRedeem}
            variant="contained"
            disabled={!redeemInput.trim()}
          >
            {language === 'zh' ? '兑换' : 'Redeem'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Favorites List Dialog */}
      <Dialog
        open={showFavorites}
        onClose={() => setShowFavorites(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ❤️ {language === 'zh' ? '我的收藏' : 'My Favorites'}
          </Box>
          <IconButton onClick={() => setShowFavorites(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <FavoritesList onClose={() => setShowFavorites(false)} />
        </DialogContent>
      </Dialog>

      {/* Purchase Success Snackbar */}
      <Snackbar
        open={!!purchaseSuccess}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          icon={<SuccessIcon />}
          sx={{ bgcolor: 'rgba(78,205,196,0.9)', color: 'white' }}
        >
          {purchaseSuccess && (language === 'zh' ? `购买成功：${purchaseSuccess}` : `Purchased: ${purchaseSuccess}`)}
        </Alert>
      </Snackbar>

      {/* General Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MallPage;
