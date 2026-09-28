import type { Metadata } from 'next';
import './justice.css';
import {PortalProvider} from '@/components/justice-portal';
export const metadata: Metadata = { title: 'South Omo Zone Justice Department', description: 'Access justice services, explore legal resources, and connect with the South Omo Zone Justice Department. Design preview.', icons: {icon:'/justice-logo.png',shortcut:'/justice-logo.png'} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><PortalProvider>{children}</PortalProvider></body></html>}
