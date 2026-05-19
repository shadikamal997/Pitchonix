"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const AnimatedNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <Link href={href} className="text-white/90 hover:text-white transition-colors duration-200 text-sm font-medium">
      {children}
    </Link>
  );
};

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass('rounded-xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const logoElement = (
    <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
        <span className="text-black font-bold text-base">P</span>
      </div>
      <span className="text-base font-bold text-white hidden sm:inline">Pitchonix</span>
    </Link>
  );

  const navLinksData = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'About', href: '#about' },
  ];

  const loginButtonElement = (
    <Link href="/login">
      <button className="px-6 py-2 text-sm font-medium border border-white/20 text-white/90 rounded-full hover:border-white/40 hover:text-white transition-all duration-200 w-full sm:w-auto" style={{ backgroundColor: 'rgba(20,20,20,0.4)' }}>
        Login
      </button>
    </Link>
  );

  const signupButtonElement = (
    <div className="relative group w-full sm:w-auto">
       <div className="absolute inset-0 -m-1 rounded-full
                     hidden sm:block
                     bg-white
                     opacity-30 filter blur-lg pointer-events-none
                     transition-all duration-300 ease-out
                     group-hover:opacity-50 group-hover:blur-xl group-hover:-m-2"></div>
       <Link href="/register">
         <button className="relative z-10 px-6 py-2 text-sm font-semibold text-black bg-white rounded-full hover:bg-white/95 transition-all duration-200 w-full sm:w-auto shadow-lg hover:shadow-xl">
           Get Started
         </button>
       </Link>
    </div>
  );

  return (
    <header className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50
                       flex flex-col items-center
                       px-6 sm:px-14 py-3 backdrop-blur-xl
                       ${headerShapeClass}
                       border border-white/15 bg-[rgba(20,20,20,0.72)]
                       w-[calc(100%-2rem)] sm:w-auto
                       transition-[border-radius] duration-300 ease-in-out
                       shadow-lg`}>

      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-16">
        <div className="flex items-center flex-shrink-0">
           {logoElement}
        </div>

        <nav className="hidden sm:flex items-center space-x-10 text-sm">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          {loginButtonElement}
          {signupButtonElement}
        </div>

        <button
          className="sm:hidden flex items-center justify-center w-8 h-8 text-white/90 hover:text-white focus:outline-none transition-colors"
          onClick={toggleMenu}
          aria-label={isOpen ? 'Close Menu' : 'Open Menu'}
        >
          {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      <div className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${isOpen ? 'max-h-[1000px] opacity-100 pt-6' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}>
        <nav className="flex flex-col items-center space-y-5 text-base w-full">
          {navLinksData.map((link) => (
            <Link key={link.href} href={link.href} className="text-white/90 hover:text-white transition-colors w-full text-center font-medium">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-6 w-full px-4">
          {loginButtonElement}
          {signupButtonElement}
        </div>
      </div>
    </header>
  );
}
