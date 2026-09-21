import { Link } from 'react-router-dom';
import { Seo } from '../seo/Seo';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Seo path="/404" />
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-slate-600">That address does not lead anywhere. Try one of the tools instead.</p>
      <p className="mt-4"><Link to="/" className="btn no-underline !text-white">Go to the home page</Link></p>
    </div>
  );
}
