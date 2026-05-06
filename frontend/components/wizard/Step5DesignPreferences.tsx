import { WizardData } from '@/app/create/page';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Palette, X, ImagePlus } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Step5Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

const THEMES = [
  { id: 'modern_tech', name: 'Modern Tech', colors: ['#3B82F6', '#8B5CF6', '#10B981'], description: 'Clean & innovative' },
  { id: 'professional', name: 'Professional', colors: ['#1F2937', '#4B5563', '#6B7280'], description: 'Traditional business' },
  { id: 'bold_startup', name: 'Bold Startup', colors: ['#EF4444', '#F59E0B', '#EC4899'], description: 'Energetic & dynamic' },
  { id: 'minimal_white', name: 'Minimal White', colors: ['#FFFFFF', '#F3F4F6', '#000000'], description: 'Simple & elegant' },
  { id: 'dark_mode', name: 'Dark Mode', colors: ['#111827', '#1F2937', '#3B82F6'], description: 'Modern dark theme' },
  { id: 'luxury_gold', name: 'Luxury Gold', colors: ['#D4AF37', '#000000', '#FFFFFF'], description: 'Premium & sophisticated' },
  { id: 'ocean_blue', name: 'Ocean Blue', colors: ['#0EA5E9', '#0284C7', '#0C4A6E'], description: 'Trust & stability' },
  { id: 'nature_green', name: 'Nature Green', colors: ['#10B981', '#059669', '#047857'], description: 'Growth & sustainability' },
  { id: 'sunset', name: 'Sunset', colors: ['#F59E0B', '#EF4444', '#EC4899'], description: 'Warm & inviting' },
  { id: 'corporate_blue', name: 'Corporate Blue', colors: ['#1E40AF', '#3B82F6', '#60A5FA'], description: 'Classic corporate' },
];

const FONT_STYLES = [
  { value: 'modern', label: 'Modern Sans' },
  { value: 'classic', label: 'Classic Serif' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'bold', label: 'Bold & Strong' },
  { value: 'elegant', label: 'Elegant' },
];

const VISUAL_STYLES = [
  { value: 'minimal', label: 'Minimal', description: 'Clean layouts, lots of white space' },
  { value: 'data_heavy', label: 'Data-Heavy', description: 'Charts, graphs, numbers' },
  { value: 'visual_rich', label: 'Visual-Rich', description: 'Images, illustrations, icons' },
  { value: 'text_focused', label: 'Text-Focused', description: 'Content-first, minimal visuals' },
];

export default function Step5DesignPreferences({ data, onUpdate }: Step5Props) {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Initialize image previews from existing files
  useEffect(() => {
    if (data.images && data.images.length > 0 && imagePreviews.length === 0) {
      const previews = data.images.map(file => {
        // If it's a File object, create URL; if it's already a URL string, use it
        return file instanceof File ? URL.createObjectURL(file) : file;
      });
      setImagePreviews(previews);
    }
  }, [data.images]);

  const handleColorChange = (colorType: 'primary' | 'secondary' | 'accent', value: string) => {
    onUpdate({
      brandColors: {
        ...data.brandColors,
        [colorType]: value,
      },
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentImages = data.images || [];
    const newImages = [...currentImages, ...files];

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);

    onUpdate({ images: newImages });
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = data.images || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    // Revoke the URL to free memory
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }

    setImagePreviews(newPreviews);
    onUpdate({ images: newImages });
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3">Design Your Look</h2>
        <p className="text-lg text-gray-600">Choose a theme and customize your brand</p>
      </div>

      {/* Theme Selection */}
      <div>
        <Label className="text-base mb-4 block">
          Choose a Theme <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {THEMES.map((theme) => {
            const isSelected = data.theme === theme.id;

            return (
              <button
                key={theme.id}
                onClick={() => onUpdate({ theme: theme.id })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex gap-1 mb-3 justify-center">
                  {theme.colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {theme.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">{theme.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <Label className="text-base mb-2 block">
          Company Logo (Optional)
        </Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
          <p className="text-sm text-gray-500">PNG, JPG, SVG up to 5MB</p>
          <Input
            type="file"
            accept="image/*"
            className="hidden"
            id="logo-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUpdate({ logo: file });
              }
            }}
          />
          <label htmlFor="logo-upload" className="cursor-pointer">
            <span className="mt-4 inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
              Select File
            </span>
          </label>
        </div>
        {data.logo && (
          <p className="text-sm text-green-600 mt-2">
            ✓ Logo uploaded
          </p>
        )}
      </div>

      {/* Image Gallery Upload */}
      <div>
        <Label className="text-base mb-2 flex items-center gap-2">
          <ImagePlus className="h-5 w-5" />
          Additional Images (Optional)
        </Label>
        <p className="text-sm text-gray-500 mb-3">
          Upload product images, team photos, screenshots, or other visuals to use in your {data.documentType?.replace('_', ' ')}
        </p>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-1">Upload multiple images</p>
          <p className="text-sm text-gray-500 mb-3">PNG, JPG up to 5MB each</p>
          <Input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="images-upload"
            onChange={handleImageUpload}
          />
          <label htmlFor="images-upload" className="cursor-pointer">
            <span className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
              Select Images
            </span>
          </label>
        </div>

        {/* Image Preview Grid */}
        {data.images && data.images.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {data.images.length} image{data.images.length !== 1 ? 's' : ''} uploaded
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={preview} 
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center truncate">
                    {data.images?.[index]?.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Brand Colors */}
      <div>
        <Label className="text-base mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Brand Colors
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="primaryColor" className="text-sm">Primary Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                id="primaryColor"
                value={data.brandColors.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-20 h-10 p-1"
              />
              <Input
                type="text"
                value={data.brandColors.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="secondaryColor" className="text-sm">Secondary Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                id="secondaryColor"
                value={data.brandColors.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-20 h-10 p-1"
              />
              <Input
                type="text"
                value={data.brandColors.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="accentColor" className="text-sm">Accent Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                id="accentColor"
                value={data.brandColors.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-20 h-10 p-1"
              />
              <Input
                type="text"
                value={data.brandColors.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Font Style */}
      <div>
        <Label htmlFor="fontStyle" className="text-base">
          Font Style
        </Label>
        <Select value={data.fontStyle} onValueChange={(value) => onUpdate({ fontStyle: value })}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select font style" />
          </SelectTrigger>
          <SelectContent>
            {FONT_STYLES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visual Style */}
      <div>
        <Label className="text-base mb-4 block">
          Visual Style
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {VISUAL_STYLES.map((style) => {
            const isSelected = data.visualStyle === style.value;

            return (
              <button
                key={style.value}
                onClick={() => onUpdate({ visualStyle: style.value })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <p className={`font-semibold mb-1 ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                  {style.label}
                </p>
                <p className="text-sm text-gray-600">{style.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
