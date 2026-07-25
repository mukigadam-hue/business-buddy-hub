import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen-safe bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
          <p><strong className="text-foreground">App name:</strong> Business Manager (BizTrack / My Factory)</p>
          <p><strong className="text-foreground">Developer:</strong> Ndamwesiga App</p>
          <p><strong className="text-foreground">Package ID:</strong> com.despia.biztrack</p>
          <p><strong className="text-foreground">Official website:</strong> https://ndamwesigaapp.store</p>
          <p><strong className="text-foreground">Privacy Policy URL:</strong> https://ndamwesigaapp.store/privacy</p>
          <p><strong className="text-foreground">Contact:</strong> nextworldforbetterquality@gmail.com</p>
          <p><strong className="text-foreground">Effective date:</strong> July 25, 2026</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Business Manager ("we", "our", "us", or "the App") is a business and factory
              management application published on Google Play under the package
              <strong className="text-foreground"> com.despia.biztrack</strong>. This Privacy
              Policy explains what information the App collects, how it is used, with whom it
              is shared, and the rights you have. It applies to the Android app, the website
              at https://ndamwesigaapp.store, and any related services we provide.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Account Information:</strong> email, full name, phone number (with country dial code), 5-digit PIN or password (stored as a secure hash), optional profile photo, and — if you choose Google sign-in — the basic Google profile fields (name, email, avatar) returned by Google OAuth.</li>
              <li><strong className="text-foreground">Business Information:</strong> business name, address, district/region, country, business type (Retail/Wholesale Business, Factory, or FlexRent property), currency, and an 11-character regional business ID.</li>
              <li><strong className="text-foreground">Financial &amp; Transaction Data:</strong> sales, purchases, expenses, services, orders, bookings, debts/credits with partial payments, stock, waste, and production records you create inside the App.</li>
              <li><strong className="text-foreground">Inventory &amp; AI Scan Data:</strong> product names, categories, prices, quantities, bulk/intangible unit conversions, barcodes you scan, and photos of shelves/products submitted to the <strong className="text-foreground">Mass AI Inventory Scan</strong> feature. Shelf photos are sent to Google's Gemini AI (via our secure backend) to detect items and crop per-item images; photos are not used to train Google's models and are not retained by the AI provider beyond the request.</li>
              <li><strong className="text-foreground">Team, Worker &amp; Contact Data:</strong> names, phone numbers, payment details and per-day worker-activity logs for team members you add, plus B2B contacts and 11-character Business Codes you interact with.</li>
              <li><strong className="text-foreground">B2B Discovery Data:</strong> if you opt in, your business appears in the public Discover directory with business name, country/district, business type, product list, contact you choose to share, and a <em>last-active</em> timestamp so other users can see whether the account is actively used.</li>
              <li><strong className="text-foreground">Property &amp; Booking Data:</strong> asset listings, rental bookings, capacity/availability and tenant details for the FlexRent module.</li>
              <li><strong className="text-foreground">Receipts &amp; Media:</strong> receipt customizations (business logo, watermark text/image), proof videos (short 320×240 clips), product photos, and any files you upload from camera or gallery.</li>
              <li><strong className="text-foreground">Device &amp; Technical Data:</strong> device model, OS version, app version, language, crash logs, and a non-permanent advertising identifier used by Google AdMob.</li>
              <li><strong className="text-foreground">Approximate Location:</strong> only the country and district/region you enter manually, plus the country/language reported by your device to localize ads and currency. We do not collect precise GPS location.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide core business, factory and FlexRent management features (sales, stock, orders, bookings, receipts, debts/credits, waste, production).</li>
              <li>Authenticate you via email + password, phone + 5-digit PIN, Google OAuth, or the public demo/reviewer account, and sync your data across devices.</li>
              <li>Run the <strong className="text-foreground">Mass AI Inventory Scan</strong>: send shelf photos to Google Gemini through our backend to detect items and generate cropped product images for your stock.</li>
              <li>Enable optional B2B Discovery, orders and contacts — including showing your business's <em>last-active</em> time so other users can identify active suppliers.</li>
              <li>Record per-worker daily activity so business owners can review who did what inside their own business.</li>
              <li>Send in-app notifications and important account, order or booking alerts.</li>
              <li>Display localized advertisements through Google AdMob (interstitial and bottom banner) to users on the free tier, in the language/region reported by your device.</li>
              <li>Diagnose crashes, improve stability, and prevent abuse or fraud.</li>
              <li>Comply with applicable laws and respond to lawful requests.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Advertising &amp; Google AdMob</h2>
            <p className="text-muted-foreground leading-relaxed">
              The free version of the App displays interstitial and bottom-banner ads served by Google AdMob through the
              WebViewGold native shell. AdMob may collect and process the device's advertising ID, coarse network
              information, language/region and standard ad-event data in order to serve and measure localized ads. We do
              not share your name, email, business records or financial data with AdMob. Banners refresh approximately
              every 120 seconds.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You can reset or limit your advertising ID at any time in your Android device
              settings (Settings → Privacy → Ads). Premium users do not see ads. For more
              information see Google's policy at
              <a href="https://policies.google.com/technologies/ads" className="text-primary underline ml-1" target="_blank" rel="noopener noreferrer">policies.google.com/technologies/ads</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Permissions We Request</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Internet / Network state:</strong> required to sync data with our backend and to run the AI inventory scan.</li>
              <li><strong className="text-foreground">Camera:</strong> only when you choose to take a product photo, scan a barcode, record a proof video, or capture a shelf photo for the Mass AI Inventory Scan.</li>
              <li><strong className="text-foreground">Photos / Media / Files:</strong> only when you choose to upload an image, watermark logo, or receipt from your gallery.</li>
              <li><strong className="text-foreground">Microphone:</strong> only when you choose to record a proof video with sound.</li>
              <li><strong className="text-foreground">Notifications:</strong> to deliver order, booking and debt-reminder alerts.</li>
              <li><strong className="text-foreground">Advertising ID:</strong> used by Google AdMob (free tier only).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. How We Share Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do <strong className="text-foreground">not</strong> sell your personal
              information. We share data only in the limited cases below:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Other businesses inside the App</strong> – only the public Discover profile fields you choose to make discoverable (business name, country/district, business type, products description, last-active time, and any contact you opt in to share).</li>
              <li><strong className="text-foreground">Service providers</strong> – our managed cloud backend (database, authentication, storage, edge functions), Google AdMob and the WebViewGold native shell, strictly to operate the service.</li>
              <li><strong className="text-foreground">AI processing</strong> – shelf photos submitted to Mass AI Inventory Scan are forwarded to Google Gemini for detection and cropping; only the image and a generic prompt are sent, and results are returned immediately without long-term retention by the AI provider.</li>
              <li><strong className="text-foreground">Google Sign-In</strong> – when you choose "Continue with Google", Google shares your basic profile fields with us to create or match your account, per Google's privacy terms.</li>
              <li><strong className="text-foreground">Legal &amp; safety</strong> – when required by law, court order, or to protect rights, safety and integrity of users.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Data Security</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>All traffic between the App and our servers is encrypted with TLS/HTTPS.</li>
              <li>Row-Level Security policies isolate every business's data from other tenants, including worker activity, orders, receipts and property bookings.</li>
              <li>Passwords and 5-digit PINs are stored as one-way hashes; we never see them in plain text. Optional password visibility toggles ("eye" icons) only reveal what you have just typed on your own device.</li>
              <li>Google's HIBP leaked-password protection is enforced on all new passwords.</li>
              <li>Sensitive secrets (including the AI API key) are stored in an encrypted secrets vault and never exposed to the client.</li>
              <li>A public demo/reviewer account (used for Google Play review) contains only sample data and is periodically reset.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Data Retention &amp; Account Deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              We keep your data for as long as your account is active. You can delete your
              account at any time from <strong className="text-foreground">Settings → Account → Delete Account</strong>
              inside the App. Account deletion permanently removes your profile, business
              records, team members, photos, orders and all related child data from our
              systems, usually within 30 days. You may also request deletion by emailing
              <a href="mailto:nextworldforbetterquality@gmail.com" className="text-primary underline ml-1">nextworldforbetterquality@gmail.com</a>
              from the email address linked to your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Your Rights</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access, review and export the data linked to your account.</li>
              <li>Correct or update inaccurate information.</li>
              <li>Delete your account and all associated data.</li>
              <li>Withdraw consent for optional features such as B2B discoverability.</li>
              <li>Lodge a complaint with your local data-protection authority.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The App is intended for business owners and is not directed to children under
              13. We do not knowingly collect personal information from children. If you
              believe a child has provided us with personal data, contact us and we will
              delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our cloud backend may store and process data in data centres outside your
              country. We rely on industry-standard safeguards to protect your information
              wherever it is processed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">12. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. The latest version will
              always be available at
              <a href="https://ndamwesigaapp.store/privacy" className="text-primary underline ml-1" target="_blank" rel="noopener noreferrer">https://ndamwesigaapp.store/privacy</a>
              with an updated effective date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this Privacy Policy, account deletion, or any privacy
              concern, contact:
            </p>
            <p className="text-foreground font-medium">nextworldforbetterquality@gmail.com</p>
            <p className="text-sm text-muted-foreground">Website: https://ndamwesigaapp.store</p>
            <p className="text-sm text-muted-foreground">App package: com.despia.biztrack</p>
          </section>
        </div>

        <div className="border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">© 2026 Business Manager. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
