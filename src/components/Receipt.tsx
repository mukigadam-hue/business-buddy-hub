import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ReceiptItem {
  itemName: string;
  quantity: number;
  priceType?: string;
  unitPrice: number;
  subtotal: number;
}

interface ReceiptProps {
  items: ReceiptItem[];
  grandTotal: number;
  customerName?: string;
  code?: string;
  date: string;
  type: 'sale' | 'order';
}

export default function Receipt({ items, grandTotal, customerName, code, date, type }: ReceiptProps) {
  const { data } = useBusiness();
  const { businessInfo } = data;

  return (
    <Card className="shadow-card max-w-sm mx-auto">
      <CardContent className="p-4 space-y-3 text-sm">
        {/* Business Header */}
        <div className="text-center space-y-0.5">
          <h3 className="font-bold text-base">{businessInfo.name}</h3>
          <p className="text-xs text-muted-foreground">{businessInfo.address}</p>
          <p className="text-xs text-muted-foreground">{businessInfo.contact} · {businessInfo.email}</p>
        </div>

        <Separator />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{type === 'order' ? 'Order' : 'Sale'} Receipt</span>
          <span>{new Date(date).toLocaleString()}</span>
        </div>

        {code && (
          <div className="text-xs text-muted-foreground">
            Code: <span className="font-semibold text-foreground">{code}</span>
          </div>
        )}
        {customerName && (
          <div className="text-xs text-muted-foreground">
            Customer: <span className="font-semibold text-foreground">{customerName}</span>
          </div>
        )}

        <Separator />

        {/* Items */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Item</span>
            <span>Amount</span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex justify-between">
              <span>{item.itemName} × {item.quantity}{item.priceType ? ` (${item.priceType})` : ''}</span>
              <span className="font-medium">${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between font-bold text-base">
          <span>TOTAL</span>
          <span>${grandTotal.toFixed(2)}</span>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">Thank you for your business!</p>
      </CardContent>
    </Card>
  );
}
