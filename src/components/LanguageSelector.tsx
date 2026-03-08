import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function LanguageSelector({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { i18n, t } = useTranslation();
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  function setLanguage(code: string) {
    i18n.changeLanguage(code);
  }

  function resetToEnglish() {
    i18n.changeLanguage('en');
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <select
          value={i18n.language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-sm bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={resetToEnglish}
          className="text-xs h-7 px-2"
        >
          🇬🇧 Default English
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4" /> {t('language.title')}
        </h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={resetToEnglish}
          className="text-xs gap-1.5"
        >
          🇬🇧 Default English
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('language.currentLanguage')}: {currentLang.flag} {currentLang.name}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
              i18n.language === lang.code
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-muted/30 border-border text-foreground hover:bg-muted/60'
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="truncate">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
