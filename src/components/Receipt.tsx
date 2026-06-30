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
}

export default function Receipt({ items, grandTotal, buyerName, sellerName, customerName, code, date, type, businessInfo, counterpartyInfo, recordedBy, recordedByRole, amountPaid, paymentStatus, verifyId, verifyType }: ReceiptProps) {
  const { fmt } = useCurrency();
  const { canShareReceipts, canDownloadReceipts, canPrintReceipts } = usePremium();
  const buyer = buyerName || customerName || '';
  const receiptRef = useRef<HTMLDivElement>(null);
  const paid = Number(amountPaid ?? grandTotal);
  const balance = Math.max(grandTotal - paid, 0);
  const status = paymentStatus || (paid <= 0 ? 'unpaid' : paid >= grandTotal ? 'paid' : 'partial');
  const isInvoice = status !== 'paid';
  const docLabel = isInvoice ? 'INVOICE' : 'RECEIPT';
  const fileName = `${isInvoice ? 'invoice' : 'receipt'}-${type}-${code || new Date(date).toISOString().slice(0, 10)}`;

  return (
    <div className="space-y-2">
      <div ref={receiptRef}>
        <Card className="shadow-card max-w-sm mx-auto">
          <CardContent className="p-4 space-y-3 text-sm overflow-y-auto max-h-[70vh]">
            {businessInfo && (
              <div className="text-center space-y-0.5">
                <h3 className="font-bold text-base">{businessInfo.name}</h3>
                <p className="text-xs text-muted-foreground">{businessInfo.address}</p>
                <p className="text-xs text-muted-foreground">{businessInfo.contact} · {businessInfo.email}</p>
              </div>
            )}
            {counterpartyInfo && (
              <div className="bg-accent/10 rounded-lg p-2 text-center space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">{type === 'purchase' ? 'Supplier' : 'Customer Business'}</p>
                <p className="text-sm font-semibold">{counterpartyInfo.name}</p>
                {counterpartyInfo.contact && <p className="text-xs text-muted-foreground">{counterpartyInfo.contact}</p>}
              </div>
            )}
            <Separator />
            <div className={`text-center py-1.5 rounded-md font-bold tracking-wider ${isInvoice ? 'bg-warning/15 text-warning border border-warning/30' : 'bg-success/10 text-success border border-success/30'}`}>
              {isInvoice ? '📄' : '✅'} {docLabel}
              {isInvoice && status === 'partial' && <span className="ml-1 text-[10px] font-semibold">(PARTIAL)</span>}
              {isInvoice && status === 'unpaid' && <span className="ml-1 text-[10px] font-semibold">(UNPAID)</span>}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{type === 'order' ? 'Order' : type === 'service' ? 'Service' : type === 'purchase' ? 'Purchase' : 'Sale'} {isInvoice ? 'Invoice' : 'Receipt'}</span>
              <span>{new Date(date).toLocaleString()}</span>
            </div>
            {code && <div className="text-xs text-muted-foreground">Ref: <span className="font-semibold text-foreground">{code}</span></div>}

            <div className="bg-muted/40 rounded-lg p-2 space-y-1">
              {buyer && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Buyer:</span>
                  <span className="font-semibold text-foreground">{buyer}</span>
                </div>
              )}
              {sellerName && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Seller:</span>
                  <span className="font-semibold text-foreground">{sellerName}</span>
                </div>
              )}
            </div>

            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Item</span><span>Amount</span>
              </div>
              {items.map((item, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {item.itemName} × {item.quantity}
                      {item.priceType && item.priceType !== 'service' && item.priceType !== 'part' ? ` (${item.priceType})` : ''}
                      {item.priceType === 'part' && <span className="text-xs text-accent ml-1">(part used)</span>}
                    </span>
                    <span className="font-medium tabular-nums ml-2">{fmt(item.subtotal)}</span>
                  </div>
                  {(item.category || item.quality) && item.category !== 'Service' && (
                    <p className="text-xs text-muted-foreground pl-2">
                      {[item.category, item.quality].filter(Boolean).filter(v => v !== '-').join(' · ')}
                    </p>
                  )}
                  {item.serialNumbers && (
                    <p className="text-xs text-info pl-2 font-mono">
                      S/N: {item.serialNumbers}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>TOTAL</span>
              <span className="text-foreground tabular-nums">{fmt(grandTotal)}</span>
            </div>
            {isInvoice && (
              <div className="space-y-1 bg-warning/5 border border-warning/20 rounded-md p-2">
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Recorded by:</span>
                <span className="font-medium text-foreground">{recordedBy} {recordedByRole && <span className="text-[10px]">({recordedByRole})</span>}</span>
              </div>
            )}
            {verifyId && verifyType && (
              <div className="pt-2 flex flex-col items-center gap-1 border-t border-dashed">
                <ReceiptQR url={`${window.location.origin}/verify/${verifyType}/${verifyId}`} size={92} />
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground pt-2">
              {isInvoice ? 'Please settle the outstanding balance. Thank you!' : 'Thank you for your business!'}
            </p>
          </CardContent>
        </Card>
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
