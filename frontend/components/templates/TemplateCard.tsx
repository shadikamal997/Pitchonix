'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Sparkles, Star, TrendingUp, Zap, Heart } from 'lucide-react';
import { IndustryTemplate } from './TemplateGallery';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface TemplateCardProps {
  template: IndustryTemplate;
  onPreview: (template: IndustryTemplate) => void;
  onUse: (template: IndustryTemplate) => void;
}

// Premium glassmorphism category colors with gradients
const CATEGORY_STYLES: Record<string, { bg: string; gradient: string; badge: string }> = {
  technology: { 
    bg: 'from-blue-500/10 via-cyan-500/10 to-blue-600/5',
    gradient: 'from-blue-500 to-cyan-600',
    badge: 'bg-blue-500/10 backdrop-blur-xl border-blue-300/30 text-blue-700'
  },
  fintech: { 
    bg: 'from-emerald-500/10 via-green-500/10 to-teal-600/5',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-500/10 backdrop-blur-xl border-emerald-300/30 text-emerald-700'
  },
  ecommerce: { 
    bg: 'from-purple-500/10 via-violet-500/10 to-fuchsia-600/5',
    gradient: 'from-purple-500 to-fuchsia-600',
    badge: 'bg-purple-500/10 backdrop-blur-xl border-purple-300/30 text-purple-700'
  },
  healthcare: { 
    bg: 'from-rose-500/10 via-red-500/10 to-pink-600/5',
    gradient: 'from-rose-500 to-pink-600',
    badge: 'bg-rose-500/10 backdrop-blur-xl border-rose-300/30 text-rose-700'
  },
  education: { 
    bg: 'from-amber-500/10 via-yellow-500/10 to-orange-600/5',
    gradient: 'from-amber-500 to-orange-600',
    badge: 'bg-amber-500/10 backdrop-blur-xl border-amber-300/30 text-amber-700'
  },
  food: { 
    bg: 'from-orange-500/10 via-amber-500/10 to-red-600/5',
    gradient: 'from-orange-500 to-red-600',
    badge: 'bg-orange-500/10 backdrop-blur-xl border-orange-300/30 text-orange-700'
  },
};

export default function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get(`/templates/${template.id}/favourite`)
      .then((res) => setIsFav(res.data.isFavourite))
      .catch(() => {});
  }, [template.id, isAuthenticated]);

  const toggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    try {
      if (isFav) {
        await api.delete(`/templates/${template.id}/favourite`);
        setIsFav(false);
      } else {
        await api.post(`/templates/${template.id}/favourite`);
        setIsFav(true);
      }
    } catch (_) {}
  };

  const categoryStyle = CATEGORY_STYLES[template.category] || {
    bg: 'from-slate-500/10 via-gray-500/10 to-slate-600/5',
    gradient: 'from-slate-500 to-gray-600',
    badge: 'bg-slate-500/10 backdrop-blur-xl border-slate-300/30 text-slate-700'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      <div className="relative bg-white rounded-2xl overflow-hidden border border-slate-200/60 shadow-md shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/50 hover:border-slate-300/80 transition-all duration-500">
        
        {/* Large Template Preview - 70% of card */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
          {template.thumbnail ? (
            <motion.img
              src={template.thumbnail}
              alt={template.name}
              className="w-full h-full object-cover"
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.6 }}
            />
          ) : (
            // Premium placeholder with realistic preview
            <div className={`w-full h-full bg-gradient-to-br ${categoryStyle.bg} p-8 flex flex-col items-center justify-center`}>
              <div className="w-full max-w-xs space-y-3">
                {/* Simulated header */}
                <div className="space-y-2">
                  <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${categoryStyle.gradient} shadow-md`} />
                  <div className="h-2.5 bg-slate-300/50 rounded-full w-3/4" />
                  <div className="h-2 bg-slate-200/50 rounded-full w-full" />
                  <div className="h-2 bg-slate-200/50 rounded-full w-5/6" />
                </div>
                
                {/* Simulated content blocks */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/40 p-2">
                    <div className="h-1.5 bg-slate-300/40 rounded w-8 mb-1" />
                    <div className="h-2 bg-slate-400/50 rounded w-10" />
                  </div>
                  <div className="h-12 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/40 p-2">
                    <div className="h-1.5 bg-slate-300/40 rounded w-8 mb-1" />
                    <div className="h-2 bg-slate-400/50 rounded w-10" />
                  </div>
                </div>

                {/* Simulated chart */}
                <div className="h-16 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/40 p-2 flex items-end gap-1">
                  <div className="flex-1 bg-slate-300/50 rounded h-8" />
                  <div className="flex-1 bg-slate-400/50 rounded h-10" />
                  <div className="flex-1 bg-slate-300/50 rounded h-6" />
                  <div className="flex-1 bg-slate-400/50 rounded h-12" />
                </div>
              </div>
            </div>
          )}
          
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          
          {/* Floating Category Badge - Top Left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute top-2 left-2"
          >
            <Badge className={`${categoryStyle.badge} border px-2 py-0.5 text-[10px] font-semibold shadow-md`}>
              {template.category}
            </Badge>
          </motion.div>

          {/* Favourite button */}
          {isAuthenticated && (
            <button
              onClick={toggleFav}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:scale-110 transition-transform"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
              />
            </button>
          )}

          {/* Popular Badge - Top Right */}
          {template.popular && !isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute top-2 right-2"
            >
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-2 py-0.5 text-[10px] font-semibold shadow-md flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" />
                Popular
              </Badge>
            </motion.div>
          )}

          {/* Hover Action Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-center gap-2"
          >
            <Button
              onClick={() => onPreview(template)}
              variant="outline"
              size="sm"
              className="bg-white/95 backdrop-blur-md border-white/40 hover:bg-white text-slate-900 font-semibold shadow-xl text-xs"
            >
              <Eye className="w-3 h-3 mr-1.5" />
              Preview
            </Button>
            <Button
              onClick={() => onUse(template)}
              size="sm"
              className={`bg-gradient-to-r ${categoryStyle.gradient} hover:opacity-90 border-0 text-white font-semibold shadow-xl text-xs`}
            >
              <Zap className="w-3 h-3 mr-1.5" />
              Use
            </Button>
          </motion.div>
        </div>

        {/* Template Info - Bottom 30% */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-cyan-600 group-hover:bg-clip-text transition-all duration-300 line-clamp-1">
            {template.name}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            {template.description}
          </p>

          {/* Tags - Premium Pills */}
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 2).map((tag, index) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-2 py-0 rounded-full border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {tag}
              </Badge>
            ))}
            {template.tags.length > 2 && (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 rounded-full border-slate-300 bg-slate-50 text-slate-700"
              >
                +{template.tags.length - 2}
              </Badge>
            )}
          </div>

          {/* Mobile Actions (shown on mobile, hidden on desktop where hover shows buttons) */}
          <div className="flex gap-1.5 lg:hidden">
            <Button
              onClick={() => onPreview(template)}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </Button>
            <Button
              onClick={() => onUse(template)}
              size="sm"
              className={`flex-1 bg-gradient-to-r ${categoryStyle.gradient} hover:opacity-90 text-white text-xs`}
            >
              Use
            </Button>
          </div>
        </div>

        {/* Premium Glow Effect on Hover */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${categoryStyle.gradient} opacity-0 blur-2xl -z-10 transition-opacity duration-500`}
        />
      </div>
    </motion.div>
  );
}
