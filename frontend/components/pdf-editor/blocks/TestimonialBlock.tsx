'use client';

import React from 'react';
import { Quote, Star } from 'lucide-react';

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
  rating?: number;
}

export interface TestimonialBlockProps {
  testimonials?: Testimonial[];
  title?: string;
  layout?: 'single' | 'double' | 'triple';
  showRating?: boolean;
  onChange?: (testimonials: Testimonial[]) => void;
}

const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    quote: 'This product has completely transformed how we work. The results have exceeded our expectations in every way.',
    author: 'Sarah Johnson',
    role: 'CEO',
    company: 'TechCorp Inc.',
    rating: 5,
  },
  {
    id: '2',
    quote: 'Outstanding service and incredible value. Our team productivity has increased by 40% since implementation.',
    author: 'Michael Chen',
    role: 'Product Manager',
    company: 'Innovation Labs',
    rating: 5,
  },
  {
    id: '3',
    quote: 'The best investment we\'ve made for our business. Highly recommend to anyone looking to scale efficiently.',
    author: 'Emily Rodriguez',
    role: 'Director of Operations',
    company: 'Growth Ventures',
    rating: 5,
  },
];

export function TestimonialBlock({
  testimonials = defaultTestimonials,
  title = 'What Our Customers Say',
  layout = 'triple',
  showRating = true,
  onChange,
}: TestimonialBlockProps) {
  const renderStars = (rating: number = 5) => {
    return (
      <div className="flex gap-1">
        {[...Array(rating)].map((_, index) => (
          <Star key={index} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
    );
  };

  const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => (
    <div className="bg-white border-2 border-[#E3E1DA] rounded-2xl p-6 hover:border-[#A8B9AE] hover:shadow-lg transition-all h-full flex flex-col">
      {/* Quote Icon */}
      <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center mb-4">
        <Quote className="h-6 w-6 text-[#4F7563]" />
      </div>

      {/* Rating */}
      {showRating && testimonial.rating && (
        <div className="mb-4">{renderStars(testimonial.rating)}</div>
      )}

      {/* Quote */}
      <blockquote className="text-[#111111] leading-relaxed mb-6 flex-1 italic">
        "{testimonial.quote}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-[#F1F0EC]">
        {testimonial.avatar ? (
          <img
            src={testimonial.avatar}
            alt={testimonial.author}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
            {testimonial.author.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-bold text-[#111111]">{testimonial.author}</p>
          <p className="text-sm text-[#6B6B6B]">
            {testimonial.role} at {testimonial.company}
          </p>
        </div>
      </div>
    </div>
  );

  const gridCols = layout === 'single' ? 1 : layout === 'double' ? 2 : 3;
  const displayTestimonials = testimonials.slice(0, gridCols);

  return (
    <div className="w-full py-8">
      {/* Header */}
      {title && (
        <div className="text-center mb-10">
          <h3 className="text-3xl font-bold text-[#111111]">{title}</h3>
        </div>
      )}

      {/* Testimonials Grid */}
      <div className={`grid grid-cols-${gridCols} gap-6`}>
        {displayTestimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>
    </div>
  );
}

export default TestimonialBlock;
