import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCurrency } from '@/hooks/useCurrency';
import ReceiptActions from '@/components/ReceiptActions';
import { usePremium } from '@/hooks/usePremium';

interface ReceiptItem {
  itemName: string;
  category?: string;
  quality?: string;
  quantity: number;
  priceType?: string;
  unitPrice: number;
  subtotal: number;
}

interface ReceiptProps {
  items: ReceiptItem[];
  grandTotal: number;
  buyerName?: string;
  sellerName?: string;
  customerName?: string;
  code?: string;
  date: string;
  type: 'sale' | 'order' | 'service' | 'checkout' | 'purchase';
  businessInfo?: { name: string; address: string; contact: string; email: string };
  counterpartyInfo?: { name: string; contact: string };
  recordedBy?: string;
  recordedByRole?: string;
}

export default function Receipt({ items, grandTotal, buyerName, sellerName, customerName, code, date, type, businessInfo }: ReceiptProps) {
  const { fmt } = useCurrency();
  const { canShareReceipts, canDownloadReceipts, canPrintReceipts } = usePremium();
  const buyer = buyerName || customerName || '';
  const receiptRef = useRef<HTMLDivElement>(null);
  const fileName = `receipt-${type}-${code || new Date(date).toISOString().slice(0, 10)}`;

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
            <Separator />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{type === 'order' ? 'Order' : type === 'service' ? 'Service' : 'Sale'} Receipt</span>
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
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>TOTAL</span>
              <span className="text-success tabular-nums">{fmt(grandTotal)}</span>
            </div>
            <p className="text-center text-xs text-muted-foreground pt-2">Thank you for your business!</p>
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
