import type { Metadata, Viewport } from 'next';
import './justice.css';
import './workspace.css';
import {PortalProvider} from '@/components/justice-portal';
import {WorkspaceProvider} from '@/lib/ws/store';
export const metadata: Metadata = { title: 'South Omo Zone Justice Department', description: 'Access justice services, explore legal resources, and connect with the South Omo Zone Justice Department. Design preview.', icons: {icon:'/justice-logo.png',shortcut:'/justice-logo.png'} };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><WorkspaceProvider><PortalProvider>{children}</PortalProvider></WorkspaceProvider></body></html>}
