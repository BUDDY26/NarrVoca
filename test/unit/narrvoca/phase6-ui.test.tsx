/**
 * @jest-environment jsdom
 *
 * Phase 6 UI tests:
 *   1. Footer renders all 4 nav links with correct href values.
 *   2. Each new page module exports a default React component.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Shared mocks for all tests in this file
// ---------------------------------------------------------------------------

jest.mock('@/lang/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: jest.fn() }),
}));

jest.mock('@/lang/Footer', () => ({
  __esModule: true,
  default: {
    en: { about: 'About', privacy: 'Privacy', terms: 'Terms', contact: 'Contact' },
    es: { about: 'Acerca', privacy: 'Privacidad', terms: 'Términos', contact: 'Contacto' },
    zh: { about: '关于', privacy: '隐私', terms: '条款', contact: '联系' },
  },
}));

jest.mock('@/lang/Navbar', () => ({
  __esModule: true,
  default: {
    en: { login: 'Login', signup: 'Sign Up' },
    es: { login: 'Iniciar sesión', signup: 'Registrarse' },
    zh: { login: '登录', signup: '注册' },
  },
}));

jest.mock('@/lang/Dashboard', () => ({
  __esModule: true,
  default: {
    en: { navBar: { logout: 'Logout', dashboard: 'Dashboard', progressDays: 'Progress', settings: 'Settings', profile: 'Profile', account: 'Account' } },
    es: { navBar: { logout: 'Cerrar sesión', dashboard: 'Panel', progressDays: 'Progreso', settings: 'Configuración', profile: 'Perfil', account: 'Cuenta' } },
    zh: { navBar: { logout: '退出', dashboard: '仪表板', progressDays: '进度', settings: '设置', profile: '个人资料', account: '账户' } },
  },
}));

jest.mock('@/components/vocora-mascot', () => ({
  VocoraMascot: () => <span data-testid="vocora-mascot" />,
}));

jest.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle" />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<object>) => (
    <button {...(props as object)}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ---------------------------------------------------------------------------
// 1. Footer — link hrefs
// ---------------------------------------------------------------------------

describe('Footer nav links', () => {
  let Footer: React.ComponentType;

  beforeAll(async () => {
    const mod = await import('@/components/Footer');
    Footer = mod.default;
  });

  it('renders the About link pointing to /about', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /about/i });
    expect(link).toHaveAttribute('href', '/about');
  });

  it('renders the Privacy link pointing to /privacy', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /privacy/i });
    expect(link).toHaveAttribute('href', '/privacy');
  });

  it('renders the Terms link pointing to /terms', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /terms/i });
    expect(link).toHaveAttribute('href', '/terms');
  });

  it('renders the Contact link pointing to /contact', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /contact/i });
    expect(link).toHaveAttribute('href', '/contact');
  });

  it('renders the NarrVoca brand name', () => {
    render(<Footer />);
    expect(screen.getByText('NarrVoca')).toBeInTheDocument();
  });

  it('renders the mascot icon', () => {
    render(<Footer />);
    expect(screen.getByTestId('vocora-mascot')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. New page modules — export a default React component
// ---------------------------------------------------------------------------

describe('New page module exports', () => {
  it('/about page exports a default function', async () => {
    const mod = await import('@/app/about/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/privacy page exports a default function', async () => {
    const mod = await import('@/app/privacy/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/terms page exports a default function', async () => {
    const mod = await import('@/app/terms/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/contact page exports a default function', async () => {
    const mod = await import('@/app/contact/page');
    expect(typeof mod.default).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 3. Navbar — mascot icon rendered
// ---------------------------------------------------------------------------

describe('Navbar mascot icon', () => {
  it('public Navbar renders mascot icon', () => {
    const { Navbar } = require('@/components/Navbar');
    render(<Navbar />);
    expect(screen.getByTestId('vocora-mascot')).toBeInTheDocument();
  });
});
