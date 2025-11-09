'use client';

import { Dashboard } from './components/Dashboard';
import { SignOutButton } from './components/SignOut';
import { ThemeToggle } from './components/ThemeToggle';



export default function Home() {
  return (
    <>
      <SignOutButton/>
      <ThemeToggle />
      <Dashboard />
    </>
  );
  
}
