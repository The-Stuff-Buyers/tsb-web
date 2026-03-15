// This route is served as a static HTML page via next.config.mjs rewrite.
// The actual content lives at /public/training.html
// No link to this page exists in the main site navigation — direct URL access only.
export const metadata = {
  title: 'Team Training — The Stuff Buyers',
  robots: 'noindex, nofollow',
};

export default function TrainingPage() {
  return null;
}
