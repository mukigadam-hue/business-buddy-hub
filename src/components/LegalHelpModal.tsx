import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle, Shield, BookOpen, Store, Package, TrendingUp, ShoppingCart, ClipboardList, Wrench, Flame, Users, Globe, Settings, Factory, Home, UserPlus, LogIn, CreditCard, BarChart3, Bell, Receipt, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-base font-bold text-foreground mt-5 mb-2">
      <Icon className="h-5 w-5 text-primary shrink-0" />
      {children}
    </h3>
  );
}

function GuideStep({ step, icon: Icon, title, description }: { step: number; icon: any; title: string; description: string }) {
  return (
    <div className="flex gap-3 py-2.5">
      <div className="flex flex-col items-center gap-1">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{step}</span>
        <div className="flex-1 w-px bg-border" />
      </div>
      <div className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <p className="font-semibold text-sm text-foreground">{title}</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      <p className="text-xs text-muted-foreground italic mb-4">Last updated: March 2026. By using BizTrack, you agree to these terms.</p>

      <SectionTitle icon={Shield}>1. What BizTrack Is</SectionTitle>
      <p className="text-muted-foreground text-xs">BizTrack is a business management app that helps you track stock, sales, purchases, orders, expenses, services, and team members. It also includes FlexRent for property management. We provide the tools — you run your business.</p>

      <SectionTitle icon={UserPlus}>2. Your Account</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
        <li>You must provide a valid email and keep your password safe.</li>
        <li>One person = one account. Don't share your login.</li>
        <li>You're responsible for everything that happens under your account.</li>
        <li>You can delete your account anytime from Settings — this is permanent.</li>
      </ul>

      <SectionTitle icon={FileText}>3. Your Data</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
        <li><strong>You own your data.</strong> Your sales, stock, receipts — it's all yours.</li>
        <li>We store your data securely in the cloud so you can access it anywhere.</li>
        <li>We don't sell your data to anyone. Period.</li>
        <li>If you delete your account, your data is permanently removed.</li>
      </ul>

      <SectionTitle icon={Store}>4. Business & Team Rules</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
        <li>Business owners control who can access their business data.</li>
        <li>Workers added to a team can only see what the owner allows.</li>
        <li>Don't use the app for illegal activities or fraud.</li>
        <li>If you add serial numbers to products, make sure they're accurate.</li>
      </ul>

      <SectionTitle icon={CreditCard}>5. Payments & Receipts</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
        <li>BizTrack helps you track payments but we don't process money directly.</li>
        <li>Receipts are generated based on info you enter — double-check accuracy.</li>
        <li>We're not responsible for disputes between you and your customers.</li>
      </ul>

      <SectionTitle icon={AlertTriangle}>6. What We're Not Responsible For</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
        <li>Losses caused by incorrect data entry (typos, wrong prices, etc.).</li>
        <li>Business decisions you make based on app data.</li>
        <li>Internet outages or device issues that prevent access.</li>
        <li>Third-party services you connect to your account.</li>
      </ul>

      <SectionTitle icon={Shield}>7. Fair Use</SectionTitle>
      <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
        <li>Don't try to hack, reverse-engineer, or abuse the app.</li>
        <li>Don't use bots or automated tools to interact with BizTrack.</li>
        <li>We can suspend accounts that violate these terms.</li>
      </ul>

      <SectionTitle icon={Bell}>8. Changes to These Terms</SectionTitle>
      <p className="text-muted-foreground text-xs">We may update these terms from time to time. If we make big changes, we'll notify you in the app. Continuing to use BizTrack after changes means you accept them.</p>

      <SectionTitle icon={Globe}>9. Contact Us</SectionTitle>
      <p className="text-muted-foreground text-xs">Questions? Reach us at <a href="mailto:ndamson8@gmail.com" className="text-primary underline">ndamson8@gmail.com</a> or on Twitter/X <a href="https://x.com/mukigaDam" className="text-primary underline" target="_blank" rel="noopener noreferrer">@mukigaDam</a>.</p>
    </div>
  );
}

function UsageGuideContent() {
  return (
    <div className="space-y-2 pb-6">
      <p className="text-xs text-muted-foreground italic mb-3">A step-by-step guide to help you get the most out of BizTrack.</p>

      <SectionTitle icon={LogIn}>Getting Started</SectionTitle>
      <GuideStep step={1} icon={UserPlus} title="Create Your Account"
        description="Sign up with your email or Google account. You'll be prompted to choose how you want to use the app." />
      <GuideStep step={2} icon={Store} title="Choose Your Account Type"
        description="Pick from: Business (shop/store), Factory (manufacturing), FlexRent (property rental), or Personal Use. Personal Use is for individuals who just want to make orders to businesses or book properties — no business registration needed." />
      <GuideStep step={3} icon={Settings} title="Configure Settings"
        description="Go to Settings to set your currency, add a settings password for security, and customize your profile." />

      <SectionTitle icon={UserPlus}>Personal Use Account</SectionTitle>
      <GuideStep step={4} icon={ShoppingCart} title="Order from Businesses"
        description="As a personal user, you can browse and discover businesses on BizTrack, send orders directly to them, and track your order status." />
      <GuideStep step={5} icon={Home} title="Book Properties"
        description="Browse available properties (rooms, houses, event spaces) listed on FlexRent and make bookings directly from your personal account." />
      <GuideStep step={6} icon={Store} title="Upgrade Anytime"
        description="If you decide to start a business later, use the 'Add Business' option to register a commercial entity without losing your personal data." />

      <SectionTitle icon={Package}>Managing Your Stock</SectionTitle>
      <GuideStep step={7} icon={Package} title="Add Stock Items"
        description="Go to 'My Stock' and tap 'Add Item'. Enter the item name, buying price, wholesale price, retail price, and quantity. You can also add photos and barcodes." />
      <GuideStep step={8} icon={BarChart3} title="Track Stock Levels"
        description="Set minimum stock levels to get alerts when items run low. The dashboard shows stock alerts so you never run out of popular items." />

      <SectionTitle icon={TrendingUp}>Recording Sales</SectionTitle>
      <GuideStep step={9} icon={TrendingUp} title="Record a Sale"
        description="Go to 'Sales', select items from your stock, set quantities and prices (retail/wholesale/custom). Add the customer name and choose payment status (Paid, Partial, or Credit)." />
      <GuideStep step={10} icon={Receipt} title="Serial Numbers & Receipts"
        description="For items with serial numbers (phones, electronics), enter them in the optional serial number field. After completing a sale, a receipt is generated automatically — serial numbers included!" />

      <SectionTitle icon={ShoppingCart}>Recording Purchases</SectionTitle>
      <GuideStep step={11} icon={ShoppingCart} title="Record Purchases"
        description="Go to 'Purchases' to log what you buy from suppliers. Enter item details, prices, and quantities. Items are automatically added to your stock." />

      <SectionTitle icon={ClipboardList}>Orders (B2B)</SectionTitle>
      <GuideStep step={12} icon={ClipboardList} title="Create & Send Orders"
        description="Use 'Orders' to create purchase orders and send them to other BizTrack businesses. Track order status from pending to completed. You can also receive orders from other businesses." />

      <SectionTitle icon={Wrench}>Services</SectionTitle>
      <GuideStep step={13} icon={Wrench} title="Record Services"
        description="If you offer services (repairs, installations, etc.), go to 'Services' to log them. You can track parts used from stock and charge separately." />

      <SectionTitle icon={Flame}>Expenses</SectionTitle>
      <GuideStep step={14} icon={Flame} title="Track Expenses"
        description="Record all business expenses (rent, utilities, transport, etc.) in the 'Expenses' section. Categorize them for better financial overview." />

      <SectionTitle icon={Users}>Team Management</SectionTitle>
      <GuideStep step={15} icon={Users} title="Add Team Members"
        description="Go to 'Team' to add workers. Set their salary, payment frequency, and track advances. You can also invite workers via invite codes so they can access the business on their own device." />

      <SectionTitle icon={Globe}>Discover & Contacts</SectionTitle>
      <GuideStep step={16} icon={Globe} title="Find Other Businesses"
        description="Use 'Discover' to find other businesses on BizTrack. Add them as contacts to easily send orders or communicate." />

      <SectionTitle icon={Factory}>Factory Mode</SectionTitle>
      <GuideStep step={17} icon={Factory} title="Manufacturing Features"
        description="Factory mode adds Input Stock (raw materials), Product Stock (finished goods), and Production tracking. Record production batches, track material usage, and manage waste." />

      <SectionTitle icon={Home}>FlexRent (Property)</SectionTitle>
      <GuideStep step={18} icon={Home} title="Property Management"
        description="FlexRent lets you list properties for rent (rooms, houses, event spaces). Manage bookings, check-ins/check-outs, and communicate with renters directly in the app." />

      <SectionTitle icon={Bell}>Pro Tips</SectionTitle>
      <ul className="space-y-2 text-xs text-muted-foreground pb-4">
        <li className="flex items-start gap-2"><span className="text-primary font-bold">💡</span> Use the barcode scanner for faster stock lookups and sales.</li>
        <li className="flex items-start gap-2"><span className="text-primary font-bold">💡</span> Check the Dashboard daily for overdue debts and stock alerts.</li>
        <li className="flex items-start gap-2"><span className="text-primary font-bold">💡</span> Set a settings password to protect sensitive business data.</li>
        <li className="flex items-start gap-2"><span className="text-primary font-bold">💡</span> Use the Proof Video button to record evidence of deliveries or transactions.</li>
        <li className="flex items-start gap-2"><span className="text-primary font-bold">💡</span> You can manage multiple businesses from one account — switch between them using the sidebar.</li>
        <li className="flex items-start gap-2"><span className="text-primary font-bold">💡</span> Personal users can upgrade to a business account anytime without losing data.</li>
      </ul>
    </div>
  );
}

interface LegalHelpModalProps {
  trigger?: React.ReactNode;
  defaultTab?: 'guide' | 'terms';
}

export default function LegalHelpModal({ trigger, defaultTab = 'guide' }: LegalHelpModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <HelpCircle className="h-3.5 w-3.5" /> Help & Legal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Help & Legal
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 grid grid-cols-2">
            <TabsTrigger value="guide" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" /> Usage Guide
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" /> Terms & Conditions
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 px-4 pb-4">
            <TabsContent value="guide" className="mt-3">
              <UsageGuideContent />
            </TabsContent>
            <TabsContent value="terms" className="mt-3">
              <TermsContent />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
