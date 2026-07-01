import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCurrency } from '@/hooks/useCurrency';
import ReceiptActions from '@/components/ReceiptActions';
import { usePremium } from '@/hooks/usePremium';
import ReceiptQR from '@/components/ReceiptQR';
import ReceiptWatermarkOverlay from '@/components/ReceiptWatermarkOverlay';
import { useBusiness } from '@/context/BusinessContext';

interface ReceiptItem {
  itemName: string;
  category?: string;
  quality?: string;
  quantity: number;
  priceType?: string;
  unitPrice: number;
  subtotal: number;
  serialNumbers?: string;
}

/** Snapshot of branding taken when a receipt was originally saved. Used for historic receipts. */
export interface WatermarkSnapshot {
  logo_url?: string | null;
  receipt_watermark_url?: string | null;
  receipt_watermark_text?: string | null;
  receipt_watermark_size?: number | null;
  receipt_watermark_opacity?: number | null;
  receipt_watermark_repeat?: number | null;
  receipt_watermark_rotation?: number | null;
}

interface ReceiptProps {
  items: ReceiptItem[];
  grandTotal: number;
  buyerName?: string;
  sellerName?: string;
  customerName?: string;
  code?: string;
  date: string;
  type: 'sale' | 'order' | 'service' | 'checkout' | 'purchase' | 'booking' | 'archive';
  businessInfo?: { name: string; address: string; contact: string; email: string };
  counterpartyInfo?: { name: string; contact: string };
  recordedBy?: string;
  recordedByRole?: string;
  amountPaid?: number;
  paymentStatus?: string;
  verifyId?: string;
  verifyType?: 'sale' | 'order' | 'service' | 'purchase' | 'booking' | 'archive';
  /** If provided (historic receipts), overrides live business branding. */
  brandingSnapshot?: WatermarkSnapshot | null;
}

/** Approx items rendered per receipt page before wrapping to a new page. */
const ITEMS_PER_PAGE = 12;

export default function Receipt({
  items, grandTotal, buyerName, sellerName, customerName, code, date, type,
  businessInfo, counterpartyInfo, recordedBy, recordedByRole, amountPaid, paymentStatus,
  verifyId, verifyType, brandingSnapshot,
}: ReceiptProps) {
  const { fmt } = useCurrency();
  const { canShareReceipts, canDownloadReceipts, canPrintReceipts } = usePremium();
  const { currentBusiness } = useBusiness();
  const buyer = buyerName || customerName || '';
  const receiptRef = useRef<HTMLDivElement>(null);
  const paid = Number(amountPaid ?? grandTotal);
  const balance = Math.max(grandTotal - paid, 0);
  const status = paymentStatus || (paid <= 0 ? 'unpaid' : paid >= grandTotal ? 'paid' : 'partial');
  const isInvoice = status !== 'paid';
  const docLabel = isInvoice ? 'INVOICE' : 'RECEIPT';
  const fileName = `${isInvoice ? 'invoice' : 'receipt'}-${type}-${code || new Date(date).toISOString().slice(0, 10)}`;

  // Branding: prefer historic snapshot, else live business settings
  const brand: WatermarkSnapshot = brandingSnapshot ?? {
    logo_url: currentBusiness?.logo_url,
    receipt_watermark_url: currentBusiness?.receipt_watermark_url,
    receipt_watermark_text: currentBusiness?.receipt_watermark_text,
    receipt_watermark_size: currentBusiness?.receipt_watermark_size,
    receipt_watermark_opacity: currentBusiness?.receipt_watermark_opacity,
    receipt_watermark_repeat: currentBusiness?.receipt_watermark_repeat,
    receipt_watermark_rotation: currentBusiness?.receipt_watermark_rotation,
  };

  // Paginate items
  const pages: ReceiptItem[][] = [];
  if (items.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      pages.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
  }
  const totalPages = pages.length;

  const businessLogo = brand.logo_url || undefined;

  return (
    <div className="space-y-2">
      <div ref={receiptRef} className="space-y-3">
        {pages.map((pageItems, pageIdx) => {
          const isFirst = pageIdx === 0;
          const isLast = pageIdx === totalPages - 1;
          return (
            <Card
              key={pageIdx}
              data-receipt-page={pageIdx + 1}
              className="shadow-card max-w-sm mx-auto relative overflow-hidden"
            >
              <ReceiptWatermarkOverlay
                imageUrl={brand.receipt_watermark_url}
                text={brand.receipt_watermark_text}
                size={brand.receipt_watermark_size}
                opacity={brand.receipt_watermark_opacity}
                repeat={brand.receipt_watermark_repeat}
                rotation={brand.receipt_watermark_rotation}
              />
              <CardContent className="relative z-10 p-3 pb-8 space-y-1.5 text-sm">
                {/* Header with business logo (left) and page indicator (right) */}
                <div className="flex items-start gap-2">
                  {businessLogo ? (
                    <img
                      src={businessLogo}
                      alt=""
                      crossOrigin="anonymous"
                      style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 36, flexShrink: 0 }} />
                  )}
                  {businessInfo && (
                    <div className="flex-1 text-center leading-tight">
                      <h3 className="font-bold text-sm">{businessInfo.name}</h3>
                      {businessInfo.address && <p className="text-[10px] text-muted-foreground">{businessInfo.address}</p>}
                      {(businessInfo.contact || businessInfo.email) && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[businessInfo.contact, businessInfo.email].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="text-[9px] font-semibold text-muted-foreground whitespace-nowrap" style={{ width: 36, textAlign: 'right' }}>
                    Page {pageIdx + 1}/{totalPages}
                  </div>
                </div>

                {isFirst && counterpartyInfo && (
                  <div className="bg-accent/10 rounded-md px-2 py-1 text-center leading-tight">
                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">
                      {type === 'purchase' ? 'Supplier' : 'Customer Business'}
                    </p>
                    <p className="text-xs font-semibold">{counterpartyInfo.name}</p>
                    {counterpartyInfo.contact && <p className="text-[10px] text-muted-foreground">{counterpartyInfo.contact}</p>}
                  </div>
                )}

                <Separator />

                <div className={`text-center py-1 rounded-md font-bold tracking-wider ${isInvoice ? 'bg-warning/15 text-warning border border-warning/30' : 'bg-success/10 text-success border border-success/30'}`}>
                  {isInvoice ? '📄' : '✅'} {docLabel}
                  {isInvoice && status === 'partial' && <span className="ml-1 text-[10px] font-semibold">(PARTIAL)</span>}
                  {isInvoice && status === 'unpaid' && <span className="ml-1 text-[10px] font-semibold">(UNPAID)</span>}
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{type === 'order' ? 'Order' : type === 'service' ? 'Service' : type === 'purchase' ? 'Purchase' : 'Sale'} {isInvoice ? 'Invoice' : 'Receipt'}</span>
                  <span>{new Date(date).toLocaleString()}</span>
                </div>
                {code && <div className="text-[11px] text-muted-foreground">Ref: <span className="font-semibold text-foreground">{code}</span></div>}

                {isFirst && (buyer || sellerName) && (
                  <div className="bg-muted/40 rounded-md px-2 py-1 space-y-0.5">
                    {buyer && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Buyer:</span>
                        <span className="font-semibold text-foreground">{buyer}</span>
                      </div>
                    )}
                    {sellerName && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Seller:</span>
                        <span className="font-semibold text-foreground">{sellerName}</span>
                      </div>
                    )}
                  </div>
                )}

                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Item{totalPages > 1 ? ` (cont. p.${pageIdx + 1})` : ''}</span><span>Amount</span>
                  </div>
                  {pageItems.map((item, i) => (
                    <div key={i} className="space-y-0">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {item.itemName} × {item.quantity}
                          {item.priceType && item.priceType !== 'service' && item.priceType !== 'part' ? ` (${item.priceType})` : ''}
                          {item.priceType === 'part' && <span className="text-xs text-accent ml-1">(part used)</span>}
                        </span>
                        <span className="font-medium tabular-nums ml-2">{fmt(item.subtotal)}</span>
                      </div>
                      {(item.category || item.quality) && item.category !== 'Service' && (
                        <p className="text-[11px] text-muted-foreground pl-2 leading-tight">
                          {[item.category, item.quality].filter(Boolean).filter(v => v !== '-').join(' · ')}
                        </p>
                      )}
                      {item.serialNumbers && (
                        <p className="text-[11px] text-info pl-2 font-mono leading-tight">
                          S/N: {item.serialNumbers}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {isLast ? (
                  <>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>TOTAL</span>
                      <span className="text-foreground tabular-nums">{fmt(grandTotal)}</span>
                    </div>
                    {isInvoice && (
                      <div className="space-y-0.5 bg-warning/5 border border-warning/20 rounded-md px-2 py-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount Paid:</span>
                          <span className="font-semibold text-success tabular-nums">{fmt(paid)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold">
                          <span className="text-warning">Balance Due:</span>
                          <span className="text-warning tabular-nums">{fmt(balance)}</span>
                        </div>
                      </div>
                    )}
                    {!isInvoice && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-semibold text-success tabular-nums">{fmt(paid)}</span>
                      </div>
                    )}
                    {recordedBy && (
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Recorded by:</span>
                        <span className="font-medium text-foreground">{recordedBy} {recordedByRole && <span className="text-[10px]">({recordedByRole})</span>}</span>
                      </div>
                    )}
                    <p className="text-center text-[11px] text-muted-foreground pt-1">
                      {isInvoice ? 'Please settle the outstanding balance. Thank you!' : 'Thank you for your business!'}
                    </p>
                  </>
                ) : (
                  <div className="text-center text-[10px] italic text-muted-foreground pt-1">
                    — continued on page {pageIdx + 2} —
                  </div>
                )}

                {/* QR on every page for verification */}
                {verifyId && verifyType && (
                  <div className="pt-1 flex flex-col items-center gap-0.5 border-t border-dashed">
                    <ReceiptQR url={`${window.location.origin}/verify/${verifyType}/${verifyId}`} size={80} />
                  </div>
                )}
              </CardContent>

              {/* Permanent app branding — bottom-left, captured into every exported/printed/shared page */}
              <div
                className="absolute bottom-1 left-1.5 z-20 flex items-center gap-1 rounded-md px-1.5 py-0.5 pointer-events-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <img src="/app-icon.png" alt="" crossOrigin="anonymous" style={{ height: 14, width: 14, borderRadius: 2 }} />
                <span style={{ fontSize: 8, fontWeight: 700, color: '#222', lineHeight: 1, letterSpacing: '0.02em' }}>com.despia.biztrack</span>
              </div>
            </Card>
          );
        })}
      </div>
      <ReceiptActions
        receiptRef={receiptRef}
        fileName={fileName}
        canShare={canShareReceipts}
        canDownload={canDownloadReceipts}
        canPrint={canPrintReceipts}
      />
    </div>
  );
}
