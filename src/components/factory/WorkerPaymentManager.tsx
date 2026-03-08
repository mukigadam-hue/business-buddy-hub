import { useState, useMemo } from 'react';
import { useFactory, FactoryTeamMember, WorkerPayment, WorkerAdvance } from '@/context/FactoryContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Wallet, AlertTriangle, Clock, CheckCircle2, Plus, 
  Calendar, ArrowDownCircle, History, Bell, User
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isOwnerOrAdmin: boolean;
}

export default function WorkerPaymentManager({ isOwnerOrAdmin }: Props) {
  const { 
    teamMembers, workerPayments, workerAdvances,
    addWorkerPayment, updateWorkerPayment, deleteWorkerPayment,
    addWorkerAdvance, updateWorkerAdvance, updateTeamMember,
    getWorkerBalance, getDuePayments
  } = useFactory();
  const { fmt } = useCurrency();
  
  const [selectedWorker, setSelectedWorker] = useState<FactoryTeamMember | null>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', notes: '' });
  const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '' });
  
  const activeMembers = teamMembers.filter(m => m.is_active);
  const { overdue, dueToday, dueSoon } = getDuePayments();
  
  // Calculate next payment date based on frequency
  function getNextPaymentDate(frequency: string, fromDate: Date = new Date()): string {
    const next = new Date(fromDate);
    if (frequency === 'daily') {
      next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    return next.toISOString().slice(0, 10);
  }
  
  // Get payment period dates
  function getPaymentPeriod(frequency: string, endDate: Date = new Date()): { start: string; end: string } {
    const end = new Date(endDate);
    const start = new Date(end);
    if (frequency === 'daily') {
      // Same day
    } else if (frequency === 'weekly') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setMonth(start.getMonth() - 1);
    }
    return { 
      start: start.toISOString().slice(0, 10), 
      end: end.toISOString().slice(0, 10) 
    };
  }
  
  // Handle paying a worker
  async function handlePayWorker() {
    if (!selectedWorker) return;
    const amountPaid = parseFloat(payForm.amount) || 0;
    if (amountPaid <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    
    const balance = getWorkerBalance(selectedWorker.id);
    const period = getPaymentPeriod(selectedWorker.payment_frequency || 'monthly');
    
    // Check if there's an existing pending payment for this period
    const existingPayment = workerPayments.find(
      p => p.worker_id === selectedWorker.id && p.status !== 'completed'
    );
    
    if (existingPayment) {
      // Update existing payment
      const newPaid = existingPayment.amount_paid + amountPaid;
      const newStatus = newPaid >= existingPayment.amount_due ? 'completed' : 'partial';
      await updateWorkerPayment(existingPayment.id, {
        amount_paid: newPaid,
        status: newStatus as any,
        paid_at: newStatus === 'completed' ? new Date().toISOString() : null,
        notes: payForm.notes || existingPayment.notes,
      });
    } else {
      // Create new payment record
      const amountDue = selectedWorker.salary;
      const status = amountPaid >= amountDue ? 'completed' : 'partial';
      await addWorkerPayment({
        worker_id: selectedWorker.id,
        period_start: period.start,
        period_end: period.end,
        amount_due: amountDue,
        amount_paid: amountPaid,
        advance_deducted: 0,
        status: status as any,
        paid_at: status === 'completed' ? new Date().toISOString() : null,
        notes: payForm.notes,
      });
    }
    
    // Update next payment due date
    await updateTeamMember(selectedWorker.id, {
      next_payment_due: getNextPaymentDate(selectedWorker.payment_frequency || 'monthly'),
    });
    
    setShowPayDialog(false);
    setPayForm({ amount: '', notes: '' });
    setSelectedWorker(null);
  }
  
  // Handle giving advance
  async function handleGiveAdvance() {
    if (!selectedWorker) return;
    const amount = parseFloat(advanceForm.amount) || 0;
    if (amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    
    await addWorkerAdvance({
      worker_id: selectedWorker.id,
      amount,
      remaining_balance: amount,
      date_given: new Date().toISOString().slice(0, 10),
      reason: advanceForm.reason,
      status: 'active',
    });
    
    setShowAdvanceDialog(false);
    setAdvanceForm({ amount: '', reason: '' });
    setSelectedWorker(null);
  }
  
  // Mark payment as complete
  async function markPaymentComplete(payment: WorkerPayment) {
    await updateWorkerPayment(payment.id, {
      amount_paid: payment.amount_due,
      status: 'completed',
      paid_at: new Date().toISOString(),
    });
  }
  
  // Update payment frequency
  async function updateFrequency(worker: FactoryTeamMember, frequency: string) {
    await updateTeamMember(worker.id, {
      payment_frequency: frequency as any,
      next_payment_due: getNextPaymentDate(frequency),
    });
  }
  
  if (!isOwnerOrAdmin) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-4 text-center text-muted-foreground">
          Only owners and admins can manage payments.
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Payment Reminders */}
      {(overdue.length > 0 || dueToday.length > 0) && (
        <Card className="shadow-card border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <h3 className="font-semibold flex items-center gap-2 text-destructive mb-2">
              <Bell className="h-4 w-4" /> Payment Reminders
            </h3>
            {overdue.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-destructive font-medium mb-1">⚠️ OVERDUE:</p>
                <div className="flex flex-wrap gap-1">
                  {overdue.map(w => (
                    <Badge key={w.id} variant="destructive" className="text-xs">
                      {w.full_name} ({fmt(w.salary)})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {dueToday.length > 0 && (
              <div>
                <p className="text-xs text-warning font-medium mb-1">📅 DUE TODAY:</p>
                <div className="flex flex-wrap gap-1">
                  {dueToday.map(w => (
                    <Badge key={w.id} variant="outline" className="text-xs border-warning text-warning">
                      {w.full_name} ({fmt(w.salary)})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {dueSoon.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground font-medium mb-1">⏰ Due in 3 days:</p>
                <div className="flex flex-wrap gap-1">
                  {dueSoon.map(w => (
                    <Badge key={w.id} variant="secondary" className="text-xs">
                      {w.full_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="workers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workers" className="space-y-3 mt-3">
          {activeMembers.length === 0 ? (
            <Card><CardContent className="p-4 text-center text-muted-foreground">No active workers</CardContent></Card>
          ) : (
            activeMembers.map(worker => {
              const balance = getWorkerBalance(worker.id);
              const isOverdue = overdue.some(w => w.id === worker.id);
              const isDueToday = dueToday.some(w => w.id === worker.id);
              
              return (
                <Card key={worker.id} className={`shadow-card ${isOverdue ? 'border-destructive/50' : isDueToday ? 'border-warning/50' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{worker.full_name}</span>
                          <Badge variant="outline" className="text-xs">{worker.rank}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{fmt(worker.salary)}/{worker.payment_frequency || 'monthly'}</span>
                          {worker.next_payment_due && (
                            <span className={isOverdue ? 'text-destructive' : isDueToday ? 'text-warning' : ''}>
                              <Calendar className="inline h-3 w-3 mr-1" />
                              {isOverdue ? 'Overdue!' : isDueToday ? 'Due today' : `Due: ${new Date(worker.next_payment_due).toLocaleDateString()}`}
                            </span>
                          )}
                        </div>
                        {balance.totalAdvances > 0 && (
                          <p className="text-xs text-warning mt-1">
                            <ArrowDownCircle className="inline h-3 w-3 mr-1" />
                            Advance owed: {fmt(balance.totalAdvances)}
                          </p>
                        )}
                        {balance.totalOwed > 0 && (
                          <p className="text-xs text-destructive mt-1">
                            <AlertTriangle className="inline h-3 w-3 mr-1" />
                            Unpaid balance: {fmt(balance.totalOwed)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Select 
                          value={worker.payment_frequency || 'monthly'} 
                          onValueChange={v => updateFrequency(worker, v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs flex-1"
                            onClick={() => { setSelectedWorker(worker); setShowAdvanceDialog(true); }}
                          >
                            <ArrowDownCircle className="h-3 w-3 mr-1" />Adv
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-7 text-xs flex-1"
                            onClick={() => { 
                              setSelectedWorker(worker); 
                              setPayForm({ amount: String(worker.salary), notes: '' });
                              setShowPayDialog(true); 
                            }}
                          >
                            <Wallet className="h-3 w-3 mr-1" />Pay
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-3 mt-3">
          {workerPayments.filter(p => p.status !== 'completed').length === 0 ? (
            <Card><CardContent className="p-4 text-center text-muted-foreground">No pending payments</CardContent></Card>
          ) : (
            workerPayments.filter(p => p.status !== 'completed').map(payment => {
              const worker = teamMembers.find(w => w.id === payment.worker_id);
              const remaining = payment.amount_due - payment.amount_paid;
              return (
                <Card key={payment.id} className="shadow-card">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{worker?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={payment.status === 'partial' ? 'outline' : 'secondary'}>
                            {payment.status === 'partial' ? `Partial (${fmt(payment.amount_paid)})` : 'Pending'}
                          </Badge>
                          <span className="text-sm font-semibold text-destructive">
                            Owes: {fmt(remaining)}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markPaymentComplete(payment)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          
          {/* Active Advances */}
          {workerAdvances.filter(a => a.status === 'active').length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground mt-4 flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4" /> Active Advances
              </h3>
              {workerAdvances.filter(a => a.status === 'active').map(advance => {
                const worker = teamMembers.find(w => w.id === advance.worker_id);
                return (
                  <Card key={advance.id} className="shadow-card border-warning/30">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{worker?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Given: {new Date(advance.date_given).toLocaleDateString()}
                            {advance.reason && ` · ${advance.reason}`}
                          </p>
                          <p className="text-sm mt-1">
                            Remaining: <span className="font-semibold text-warning">{fmt(advance.remaining_balance)}</span>
                            <span className="text-muted-foreground"> of {fmt(advance.amount)}</span>
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => updateWorkerAdvance(advance.id, { status: 'fully_deducted', remaining_balance: 0 })}
                        >
                          Clear
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-3 mt-3">
          {workerPayments.filter(p => p.status === 'completed').length === 0 ? (
            <Card><CardContent className="p-4 text-center text-muted-foreground">No payment history yet</CardContent></Card>
          ) : (
            workerPayments.filter(p => p.status === 'completed').slice(0, 20).map(payment => {
              const worker = teamMembers.find(w => w.id === payment.worker_id);
              return (
                <Card key={payment.id} className="shadow-card">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          {worker?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paid_at && new Date(payment.paid_at).toLocaleDateString()}
                          {payment.notes && ` · ${payment.notes}`}
                        </p>
                      </div>
                      <span className="font-semibold text-success">{fmt(payment.amount_paid)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
      
      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay {selectedWorker?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm">Salary: <span className="font-semibold">{selectedWorker && fmt(selectedWorker.salary)}</span> / {selectedWorker?.payment_frequency || 'monthly'}</p>
              {selectedWorker && getWorkerBalance(selectedWorker.id).totalAdvances > 0 && (
                <p className="text-sm text-warning">Advance to deduct: {fmt(getWorkerBalance(selectedWorker.id).totalAdvances)}</p>
              )}
            </div>
            <div>
              <Label>Amount to Pay</Label>
              <Input 
                type="number" 
                value={payForm.amount} 
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input 
                value={payForm.notes} 
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g., Bank transfer"
              />
            </div>
            <Button onClick={handlePayWorker} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Advance Dialog */}
      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Advance to {selectedWorker?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Advance Amount</Label>
              <Input 
                type="number" 
                value={advanceForm.amount} 
                onChange={e => setAdvanceForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input 
                value={advanceForm.reason} 
                onChange={e => setAdvanceForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g., Emergency"
              />
            </div>
            <Button onClick={handleGiveAdvance} className="w-full">
              <ArrowDownCircle className="h-4 w-4 mr-2" /> Record Advance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
