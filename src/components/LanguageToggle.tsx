
import React from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4" />
      <Toggle
        pressed={language === 'en'}
        onPressedChange={(pressed) => setLanguage(pressed ? 'en' : 'id')}
        className="text-xs px-2 py-1"
      >
        {language === 'id' ? 'ID' : 'EN'}
      </Toggle>
    </div>
  );
};
