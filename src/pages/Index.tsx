import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Clock, MapPin, Users, Shield, Smartphone, BarChart3, ShieldCheck } from 'lucide-react';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      // Redirect authenticated users to their respective dashboards
      navigate(profile.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header with Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
                {t('landing.heroTitle').split(' ').map((word, index) => (
                  <span key={index}>
                    {index === 1 ? (
                      <span className="text-primary">{word}</span>
                    ) : (
                      word
                    )}
                    {index < t('landing.heroTitle').split(' ').length - 1 && ' '}
                  </span>
                ))}
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                {t('landing.heroSubtitle')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                {t('landing.getStarted')}
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                {t('landing.signIn')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              {t('landing.powerfulFeatures')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('landing.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{t('landing.gpsValidation')}</CardTitle>
                <CardDescription>
                  {t('landing.gpsValidationDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{t('landing.smartTimeTracking')}</CardTitle>
                <CardDescription>
                  {t('landing.smartTimeTrackingDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{t('landing.mobileFirstDesign')}</CardTitle>
                <CardDescription>
                  {t('landing.mobileFirstDesignDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-2 border-red-200 bg-red-50">
              <CardHeader>
                <div className="p-3 bg-red-100 rounded-lg w-fit">
                  <ShieldCheck className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-red-800">{t('landing.antiFraudSystem')}</CardTitle>
                <CardDescription className="text-red-700">
                  {t('landing.antiFraudSystemDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{t('landing.makeupRequests')}</CardTitle>
                <CardDescription>
                  {t('landing.makeupRequestsDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{t('landing.roleBasedAccess')}</CardTitle>
                <CardDescription>
                  {t('landing.roleBasedAccessDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{t('landing.advancedReporting')}</CardTitle>
                <CardDescription>
                  {t('landing.advancedReportingDesc')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              {t('landing.howItWorks')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('landing.howItWorksSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold">{t('landing.step1Title')}</h3>
              <p className="text-gray-600">
                {t('landing.step1Desc')}
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold">{t('landing.step2Title')}</h3>
              <p className="text-gray-600">
                {t('landing.step2Desc')}
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold">{t('landing.step3Title')}</h3>
              <p className="text-gray-600">
                {t('landing.step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {t('landing.readyToModernize')}
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {t('landing.readyToModernizeDesc')}
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 py-6"
              onClick={() => navigate('/auth')}
            >
              {t('landing.startFreeToday')}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            {t('landing.footerText')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;