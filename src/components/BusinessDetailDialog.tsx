import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';
import {
  MapPin, Phone, Mail, Factory, Store, Star, ThumbsUp, Copy, Check,
  Package, MessageSquare, Send, Loader2, ShoppingCart, CalendarCheck, Home,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BusinessInfo {
  id: string;
  name: string;
  business_type: string;
  address: string;
  contact: string;
  email: string;
  logo_url: string | null;
  business_code: string | null;
  products_description: string;
  country_code?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  quality: string;
  retail_price: number;
  quantity: number;
  image_url_1: string | null;
}

interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  likes_count: number;
  created_at: string;
}

interface Props {
  business: BusinessInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderOrBook?: (biz: BusinessInfo) => void;
}

export default function BusinessDetailDialog({ business, open, onOpenChange, onOrderOrBook }: Props) {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [likedReviews, setLikedReviews] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!business) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase.rpc('get_business_public_products', { _business_id: business.id });
      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch { /* ignore */ } finally { setLoadingProducts(false); }
  }, [business]);

  const loadReviews = useCallback(async () => {
    if (!business) return;
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase.rpc('get_business_reviews', { _business_id: business.id });
      if (error) throw error;
      setReviews((data as Review[]) || []);
      if (user) {
        const { data: likes } = await supabase.from('review_likes').select('review_id').eq('user_id', user.id);
        if (likes) setLikedReviews(new Set(likes.map(l => l.review_id)));
      }
    } catch { /* ignore */ } finally { setLoadingReviews(false); }
  }, [business, user]);

  useEffect(() => {
    if (open && business) { loadProducts(); loadReviews(); }
  }, [open, business, loadProducts, loadReviews]);

  async function submitReview() {
    if (!business || !user || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('business_reviews').insert({ business_id: business.id, reviewer_id: user.id, rating: newRating, comment: newComment.trim() });
      if (error) throw error;
      setNewComment(''); setNewRating(5);
      toast.success('Review posted!'); loadReviews();
    } catch { toast.error('Failed to post review'); } finally { setSubmitting(false); }
  }

  async function toggleLike(reviewId: string) {
    if (!user) return;
    const liked = likedReviews.has(reviewId);
    try {
      if (liked) {
        await supabase.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', user.id);
        await supabase.from('business_reviews').update({ likes_count: Math.max(0, (reviews.find(r => r.id === reviewId)?.likes_count || 1) - 1) }).eq('id', reviewId);
        setLikedReviews(prev => { const n = new Set(prev); n.delete(reviewId); return n; });
      } else {
        await supabase.from('review_likes').insert({ review_id: reviewId, user_id: user.id });
        await supabase.from('business_reviews').update({ likes_count: (reviews.find(r => r.id === reviewId)?.likes_count || 0) + 1 }).eq('id', reviewId);
        setLikedReviews(prev => new Set(prev).add(reviewId));
      }
      loadReviews();
    } catch { /* ignore */ }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Business code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  }

  if (!business) return null;

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const isProperty = business.business_type === 'property';
  const isFactory = business.business_type === 'factory';
  const actionLabel = isProperty ? 'Book Now' : 'Order Now';
  const actionIcon = isProperty ? <CalendarCheck className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />;
  const typeIcon = isProperty ? '🏠' : isFactory ? '🏭' : '🏪';
  const typeLabel = isProperty ? 'Property' : isFactory ? 'Factory' : 'Business';

  function handleAction() {
    if (!business?.business_code) {
      toast.error('This business has no code yet');
      return;
    }
    navigator.clipboard.writeText(business.business_code);
    toast.success(`Code "${business.business_code}" copied! Go to ${isProperty ? 'Bookings' : 'Orders'} to use it.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-start gap-3">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="h-12 w-12 rounded-lg object-cover border" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xl">{typeIcon}</div>
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base truncate">{business.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px]">
                  {isProperty ? <><Home className="h-3 w-3 mr-1" />{typeLabel}</> : isFactory ? <><Factory className="h-3 w-3 mr-1" />{typeLabel}</> : <><Store className="h-3 w-3 mr-1" />{typeLabel}</>}
                </Badge>
                {avgRating && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{avgRating}
                    <span className="text-muted-foreground">({reviews.length})</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1 mt-3 text-xs text-muted-foreground">
            {business.products_description && <p className="text-foreground text-sm">{business.products_description}</p>}
            {business.address && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /><span>{business.address}</span></div>}
            {business.contact && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" /><span>{business.contact}</span></div>}
            {business.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" /><span>{business.email}</span></div>}
          </div>

          {business.business_code && (
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs font-mono gap-2" onClick={() => copyCode(business.business_code!)}>
                {copiedCode ? <><Check className="h-3 w-3 text-primary" />Copied!</> : <><Copy className="h-3 w-3" />Code: {business.business_code}</>}
              </Button>
              <Button size="sm" className="flex-1 text-xs gap-2" onClick={handleAction}>
                {actionIcon} {actionLabel}
              </Button>
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="products" className="px-4 pb-4">
          <TabsList className="w-full">
            <TabsTrigger value="products" className="flex-1 gap-1 text-xs"><Package className="h-3.5 w-3.5" />{isProperty ? 'Assets' : 'Products'} ({products.length})</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 gap-1 text-xs"><MessageSquare className="h-3.5 w-3.5" />Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {loadingProducts ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No {isProperty ? 'assets' : 'products'} listed yet</p>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    {p.image_url_1 ? (
                      <img src={p.image_url_1} alt={p.name} className="h-10 w-10 rounded object-cover border" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-sm">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.category && <span>{p.category}</span>}
                        {p.quality && <span>• {p.quality}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">{fmt(p.retail_price)}</p>
                      <p className="text-[10px] text-muted-foreground">{p.quantity > 0 ? `${p.quantity} in stock` : 'Out of stock'}</p>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center pt-2">
                  💡 Use the "{actionLabel}" button above to start {isProperty ? 'a booking' : 'an order'}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="mt-2">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Rate:</span>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setNewRating(s)} className="focus:outline-none">
                      <Star className={`h-4 w-4 ${s <= newRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                    </button>
                  ))}
                </div>
                <Textarea placeholder="Share your experience..." value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} className="text-sm resize-none" />
                <Button size="sm" className="w-full gap-1.5" onClick={submitReview} disabled={submitting || !newComment.trim()}>
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post Review
                </Button>
              </CardContent>
            </Card>

            {loadingReviews ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No reviews yet — be the first!</p>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {reviews.map(r => (
                  <div key={r.id} className="p-3 rounded-lg border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.reviewer_name}</span>
                        <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />)}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.comment}</p>
                    <button onClick={() => toggleLike(r.id)} className={`flex items-center gap-1 text-xs ${likedReviews.has(r.id) ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      <ThumbsUp className={`h-3 w-3 ${likedReviews.has(r.id) ? 'fill-primary' : ''}`} />{r.likes_count > 0 && r.likes_count}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
