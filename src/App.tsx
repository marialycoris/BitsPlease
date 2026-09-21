import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';

const BinaryLab = lazy(() => import('./pages/BinaryLab'));
const IpCalculator = lazy(() => import('./pages/IpCalculator'));
const CustomSubnet = lazy(() => import('./pages/CustomSubnet'));
const SubnetGenerator = lazy(() => import('./pages/SubnetGenerator'));
const VlsmCalculator = lazy(() => import('./pages/VlsmCalculator'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteEffects() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Layout>
      <RouteEffects />
      <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/binary-lab" element={<BinaryLab />} />
          <Route path="/ip-calculator" element={<IpCalculator />} />
          <Route path="/custom-subnet" element={<CustomSubnet />} />
          <Route path="/subnet-generator" element={<SubnetGenerator />} />
          <Route path="/vlsm-calculator" element={<VlsmCalculator />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
