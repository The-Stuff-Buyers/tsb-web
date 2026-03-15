// This route is served as a static HTML page via next.config.mjs rewrite.
// The actual content lives at /public/about.html
export const metadata = {
  title: 'About — The Stuff Buyers',
};

export default function AboutPage() {
  return null;
}
