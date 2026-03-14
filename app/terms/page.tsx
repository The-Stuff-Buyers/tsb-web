export const metadata = {
  title: 'Terms of Service — The Stuff Buyers',
};

export default function TermsPage() {
  return (
    <div className="bg-brand-bg min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold text-brand-gold mb-2">Terms of Service</h1>
        <p className="text-brand-gray text-sm mb-10">Effective date: March 14, 2026</p>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">1. Acceptance of Terms</h2>
        <p className="text-brand-gray leading-relaxed">
          By using thestuffbuyers.com or submitting inventory for quote, you agree to these terms.
        </p>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">2. Services</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>The Stuff Buyers LLC operates as an inventory recovery brokerage</li>
          <li>We connect sellers of excess, overstock, returned, and liquidation inventory with qualified recovery partners</li>
          <li>Submitting a form constitutes a request for quote, not a binding agreement to sell</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">3. Quote Process</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>Quotes are provided based on information you submit</li>
          <li>Quotes are valid for 72 hours from delivery unless otherwise stated</li>
          <li>Acceptance of a quote creates a binding agreement subject to inventory verification</li>
          <li>We reserve the right to adjust or withdraw quotes if submitted information is materially inaccurate</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">4. User Responsibilities</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>You represent that you have authority to sell the inventory described</li>
          <li>Information submitted must be accurate to the best of your knowledge</li>
          <li>You are responsible for the accuracy of quantities, conditions, and descriptions</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">5. Limitation of Liability</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>The Stuff Buyers LLC acts as a broker and is not the end buyer of inventory</li>
          <li>We are not liable for recovery partner performance, pickup scheduling, or final recovery amounts beyond quoted values</li>
          <li>Our liability is limited to fees collected for brokerage services</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">6. Communication Consent</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>By submitting your contact information, you consent to receiving communications related to your quote and deal status</li>
          <li>Marketing communications require separate opt-in — see Privacy Policy</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">7. Modifications</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>We may update these terms at any time</li>
          <li>Continued use of the site constitutes acceptance of updated terms</li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-gold mt-8 mb-3">8. Governing Law</h2>
        <ul className="text-brand-gray leading-relaxed space-y-2 list-disc pl-5">
          <li>These terms are governed by the laws of the State of Texas</li>
          <li>Any disputes shall be resolved in courts located in Burnet County, Texas</li>
        </ul>
      </div>
    </div>
  );
}
