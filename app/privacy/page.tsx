export const metadata = {
  title: 'Privacy Policy — The Stuff Buyers',
};

export default function PrivacyPage() {
  return (
    <div className="bg-brand-bg min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold text-brand-gold mb-2">Privacy Policy</h1>
        <p className="text-brand-gray text-sm mb-10">Effective date: March 14, 2026</p>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">1. Information We Collect</h2>
        <p className="text-brand-white leading-relaxed mb-3">
          We collect the following categories of information when you use our site or submit inventory for quote:
        </p>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li><strong className="text-brand-white">Personal information:</strong> name, email address, phone number, company name, website</li>
          <li><strong className="text-brand-white">Inventory information:</strong> item descriptions, quantities, conditions, locations, UPC codes, estimated values</li>
          <li><strong className="text-brand-white">Technical information:</strong> IP address, browser type, device information (collected automatically)</li>
          <li><strong className="text-brand-white">Communication preferences</strong> and consent status</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">2. How We Use Your Information</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>To process inventory recovery quotes and manage deal lifecycle</li>
          <li>To communicate about your submissions, quotes, and offers</li>
          <li>To send marketing communications via email and SMS (with your consent)</li>
          <li>To improve our services and website functionality</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">3. Marketing Communications</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>We use Klaviyo to manage email and SMS marketing</li>
          <li>You may receive promotional emails about inventory recovery services, industry updates, and special offers</li>
          <li>You may receive SMS messages if you provide your phone number and consent to SMS communications</li>
          <li>Frequency: email — no more than weekly; SMS — no more than monthly</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">4. Your Choices and Opt-Out</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>Email: click the &ldquo;unsubscribe&rdquo; link in any marketing email</li>
          <li>SMS: reply STOP to any SMS message</li>
          <li>You may also email quotes@thestuffbuyers.com to request removal from marketing lists</li>
          <li>Opting out of marketing does not affect transactional communications about active quotes or deals</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">5. Information Sharing</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>We do NOT sell your personal information</li>
          <li>Service providers who process data on our behalf: Klaviyo (email/SMS), Supabase (data storage), Vercel (hosting)</li>
          <li>We share inventory details (NOT your personal contact information) with recovery partners to obtain quotes — see our PII firewall policy</li>
          <li>We may disclose information if required by law</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">6. Data Retention</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>We retain submission data for the duration of the business relationship plus 3 years</li>
          <li>Marketing preferences are retained until you opt out</li>
          <li>You may request deletion by emailing quotes@thestuffbuyers.com</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">7. Contact</h2>
        <div className="text-brand-gray leading-relaxed space-y-1">
          <p className="text-brand-white font-medium">The Stuff Buyers LLC</p>
          <p>Email: quotes@thestuffbuyers.com</p>
          <p>Phone: (314) 358-5293</p>
        </div>
      </div>
    </div>
  );
}
