import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        </div>

        <p className="text-sm text-muted-foreground">Last updated: March 20, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Business Manager ("we," "our," or "us"). We are committed to protecting
              your personal information and your right to privacy. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when you use our
              mobile application and services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Data Collection</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Account Information:</strong> Email address, full name, and password when you create an account.</li>
              <li><strong className="text-foreground">Business Information:</strong> Business name, address, contact details, business type, and country code that you provide during business setup.</li>
              <li><strong className="text-foreground">Transaction Data:</strong> Sales, purchases, expenses, orders, and service records you create within the app.</li>
              <li><strong className="text-foreground">Team Data:</strong> Names, phone numbers, and payment information for team members you add.</li>
              <li><strong className="text-foreground">Property Data:</strong> Asset details, booking records, and tenant information for property management features.</li>
              <li><strong className="text-foreground">Device Information:</strong> Device type and operating system for app optimization.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Data Usage</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide and maintain our business management services.</li>
              <li>To process transactions, generate receipts, and manage your business records.</li>
              <li>To enable business-to-business (B2B) interactions including orders, contacts, and discovery features.</li>
              <li>To send important notifications about your account, orders, and business activities.</li>
              <li>To improve our app's functionality and user experience.</li>
              <li>To display relevant advertisements (free tier users only).</li>
              <li>To provide customer support and respond to inquiries.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal data. We may share limited information in the following cases:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">B2B Features:</strong> Your business name, contact details, and products description are shared with other businesses when you enable discoverability.</li>
              <li><strong className="text-foreground">Service Providers:</strong> We use trusted third-party services (Supabase for database and authentication, Google AdMob for advertisements) that may process your data.</li>
              <li><strong className="text-foreground">Legal Requirements:</strong> We may disclose data if required by law or to protect our legal rights.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>All data is encrypted in transit using TLS/SSL protocols.</li>
              <li>Row-Level Security (RLS) policies ensure users can only access their own business data.</li>
              <li>Authentication is handled through secure, industry-standard protocols.</li>
              <li>Passwords are hashed and never stored in plain text.</li>
              <li>Regular security audits are performed on our infrastructure.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. You may request
              deletion of your account and all associated data at any time through the
              Settings page in the app. Upon account deletion, all personal and business
              data is permanently removed from our systems.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access and review your personal data stored in the app.</li>
              <li>Update or correct your personal information.</li>
              <li>Delete your account and all associated data.</li>
              <li>Opt out of business discoverability features.</li>
              <li>Request a copy of your data.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not directed to individuals under the age of 13. We do not
              knowingly collect personal information from children under 13. If we become
              aware that a child under 13 has provided us with personal data, we will take
              steps to delete such information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of
              any changes by posting the new Privacy Policy on this page and updating the
              "Last updated" date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-foreground font-medium">nextworldforbetterquality@gmail.com</p>
          </section>
        </div>

        <div className="border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">© 2026 Business Manager. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
