import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandingValues {
  branding_primary_color: string;
  branding_secondary_color: string;
  branding_text_color: string;
  branding_logo_url: string | null;
  branding_banner_url: string | null;
  branding_banner_height: number | null;
}

interface BrandingSectionProps {
  eventId?: string;
  values: BrandingValues;
  onChange: (values: BrandingValues) => void;
}

export function BrandingSection({ eventId, values, onChange }: BrandingSectionProps) {
  const uploadPrefix = eventId || `temp-${Date.now()}`;
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const updateField = useCallback(
    <K extends keyof BrandingValues>(key: K, value: BrandingValues[K]) => {
      onChange({ ...values, [key]: value });
    },
    [values, onChange]
  );

  const uploadFile = async (
    file: File,
    folder: 'logos' | 'banners',
    setLoading: (v: boolean) => void,
    urlKey: 'branding_logo_url' | 'branding_banner_url'
  ) => {
    setLoading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${uploadPrefix}/${folder}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('event-branding')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('event-branding')
        .getPublicUrl(path);

      updateField(urlKey, publicUrlData.publicUrl);
      toast.success(`${folder === 'logos' ? 'Logo' : 'Banner'} uploaded`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: 'logos' | 'banners',
    setLoading: (v: boolean) => void,
    urlKey: 'branding_logo_url' | 'branding_banner_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB');
      return;
    }
    uploadFile(file, folder, setLoading, urlKey);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Branding
        </h3>
        <p className="text-sm text-muted-foreground">
          Customize colors and images for your event
        </p>
      </div>
      <Separator />

      {/* Colors */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Colors</p>
        <div className="grid grid-cols-3 gap-4">
          <ColorField
            label="Primary Color"
            value={values.branding_primary_color}
            onChange={(v) => updateField('branding_primary_color', v)}
          />
          <ColorField
            label="Secondary Color"
            value={values.branding_secondary_color}
            onChange={(v) => updateField('branding_secondary_color', v)}
          />
          <ColorField
            label="Text Color"
            value={values.branding_text_color}
            onChange={(v) => updateField('branding_text_color', v)}
          />
        </div>
      </div>

      {/* Image Uploads */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Images</p>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Logo (recommended 200×200px)</Label>
          <div className="flex items-center gap-3">
            {values.branding_logo_url ? (
              <div className="relative h-16 w-16 rounded-md border border-border overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={values.branding_logo_url}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center"
                  onClick={() => updateField('branding_logo_url', null)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/50 flex-shrink-0">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'logos', setUploadingLogo, 'branding_logo_url')}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              {uploadingLogo ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              Upload Logo
            </Button>
          </div>
        </div>

        {/* Banner */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Banner (recommended 1200×400px)</Label>
          {values.branding_banner_url ? (
            <div className="relative rounded-md border border-border overflow-hidden bg-muted">
              <img
                src={values.branding_banner_url}
                alt="Banner"
                className="w-full h-24 object-cover"
              />
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center"
                onClick={() => updateField('branding_banner_url', null)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-16 flex-1 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/50">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'banners', setUploadingBanner, 'branding_banner_url')}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadingBanner}
            onClick={() => bannerInputRef.current?.click()}
          >
            {uploadingBanner ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            Upload Banner
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Preview</p>
        <div
          className="rounded-lg border border-border overflow-hidden"
          style={{ backgroundColor: values.branding_secondary_color }}
        >
          {/* Banner preview */}
          {values.branding_banner_url ? (
            <div className="w-full h-20 overflow-hidden">
              <img
                src={values.branding_banner_url}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-full h-20"
              style={{ backgroundColor: values.branding_primary_color }}
            />
          )}
          {/* Content preview */}
          <div className="p-3 flex items-center gap-3">
            {values.branding_logo_url ? (
              <img
                src={values.branding_logo_url}
                alt="Logo preview"
                className="h-10 w-10 rounded object-contain flex-shrink-0"
                style={{ backgroundColor: values.branding_secondary_color }}
              />
            ) : (
              <div
                className="h-10 w-10 rounded flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: values.branding_primary_color }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: values.branding_secondary_color }}
                >
                  Logo
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: values.branding_text_color }}
              >
                Event Title Preview
              </p>
              <p
                className="text-xs truncate opacity-70"
                style={{ color: values.branding_text_color }}
              >
                Subtitle text in your chosen colors
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <div
                className="px-3 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: values.branding_primary_color,
                  color: values.branding_secondary_color,
                }}
              >
                Register
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Color field with picker + hex input ── */

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const handleHexChange = (hex: string) => {
    // Allow typing partial hex
    if (hex === '' || /^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 rounded border border-border cursor-pointer p-0.5 bg-transparent"
        />
        <Input
          value={value || ''}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#6366f1"
          className="h-8 text-xs font-mono"
        />
      </div>
    </div>
  );
}
