import type { Metadata } from 'next';
import '../../global.css';
import LocalAccessibilityAudit from '../components/LocalAccessibilityAudit';

export const metadata: Metadata = {
  title: 'BarrioList',
  description: 'Neighborhood Listing Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {process.env.ENABLE_LOCAL_ACCESSIBILITY_AUDIT === 'true' && <LocalAccessibilityAudit />}
      </body>
    </html>
  );
}
