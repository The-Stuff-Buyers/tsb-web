export const metadata = {
  title: 'Communication Preferences — The Stuff Buyers',
};

export default function UnsubscribePage() {
  return (
    <div className="bg-brand-bg min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold text-brand-gold mb-8">
          Manage Your Communication Preferences
        </h1>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-brand-white mb-2">Email</h2>
            <p className="text-brand-gray leading-relaxed">
              Click the &ldquo;unsubscribe&rdquo; link at the bottom of any email you&apos;ve received from us.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-brand-white mb-2">SMS</h2>
            <p className="text-brand-gray leading-relaxed">
              Reply STOP to any text message from The Stuff Buyers.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-brand-white mb-2">Questions?</h2>
            <p className="text-brand-gray leading-relaxed">
              Contact us at quotes@thestuffbuyers.com or (314) 358-5293.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
