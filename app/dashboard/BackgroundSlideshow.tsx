'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const slides = [
  '/slide1.png',
  '/slide2.png',
  '/slide3.png',
];

export default function BackgroundSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-neutral-950">
      {slides.map((slide, index) => (
        <div
          key={slide}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentSlide ? 'opacity-40' : 'opacity-0'
          }`}
        >
          <Image
            src={slide}
            alt={`Slide ${index + 1}`}
            fill
            sizes="100vw"
            className="object-cover grayscale contrast-125"
            priority={index === 0}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-neutral-950/80" />
    </div>
  );
}