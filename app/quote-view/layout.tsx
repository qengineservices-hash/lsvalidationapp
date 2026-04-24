import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Official Quotation | Livspace Services',
  robots: {
    index: false,
    follow: false,
  },
};

export default function QuoteViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
