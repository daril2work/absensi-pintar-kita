import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useToast } from '@/hooks/use-toast';
import { Clock, MapPin, Users } from 'lucide-react';

export default function Auth() {
  const { user, profile, signIn, signUp, loading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ email: '', password: '', name: '' });

  // Redirect authenticated users
  useEffect(() => {
    if (user && profile) {
      // Redirect based on role
      window.location.href = profile.role === 'admin' ? '/admin' : '/dashboard';
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(signInData.email, signInData.password);
      
      if (error) {
        toast({
          title: t('general.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('general.success'),
          description: "Signed in successfully!",
        });
      }
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.name);
      
      if (error) {
        toast({
          title: t('general.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('general.success'),
          description: "Account created successfully! Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">
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
            <p className="text-xl text-gray-600">
              {t('landing.heroSubtitle')}
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{t('landing.gpsValidation')}</h3>
                <p className="text-gray-600">{t('landing.gpsValidationDesc')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{t('landing.smartTimeTracking')}</h3>
                <p className="text-gray-600">{t('landing.smartTimeTrackingDesc')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{t('landing.roleBasedAccess')}</h3>
                <p className="text-gray-600">{t('landing.roleBasedAccessDesc')}</p>
              </div>
            </div>
          </div>

          {/* Collaboration Footer in Auth Page */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-500">
                {t('landing.poweredBy')}
              </p>
              <p className="text-base font-semibold text-gray-700">
                {t('landing.collaborationText')}
              </p>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center mb-1">
                    <span className="text-white font-bold text-sm">C1</span>
                  </div>
                  <p className="text-xs text-gray-400">Cluster 1</p>
                </div>
                <div className="text-gray-400">×</div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center mb-1">
                    <span className="text-white font-bold text-sm">ST</span>
                  </div>
                  <p className="text-xs text-gray-400">Symbiotech</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <Card className="w-full max-w-md mx-auto shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('auth.email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('auth.password')}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Your password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : t('auth.signIn')}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('auth.name')}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your full name"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : t('auth.signUp')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}