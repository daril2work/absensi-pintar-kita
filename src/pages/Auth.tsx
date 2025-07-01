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
import { Clock, MapPin, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Auth() {
  const { user, profile, signIn, signUp, loading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const getAuthErrorMessage = (error: any) => {
    const errorMessage = error?.message || '';
    
    if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials')) {
      return 'The email or password you entered is incorrect. Please check your credentials and try again.';
    }
    
    if (errorMessage.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.';
    }
    
    if (errorMessage.includes('User not found')) {
      return 'No account found with this email address. Please sign up first or check your email.';
    }
    
    if (errorMessage.includes('Too many requests')) {
      return 'Too many sign-in attempts. Please wait a few minutes before trying again.';
    }
    
    return errorMessage || 'An unexpected error occurred. Please try again.';
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const { error } = await signIn(signInData.email, signInData.password);
      
      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        setAuthError(friendlyMessage);
        toast({
          title: t('general.error'),
          description: friendlyMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('general.success'),
          description: "Signed in successfully!",
        });
      }
    } catch (error: any) {
      const friendlyMessage = getAuthErrorMessage(error);
      setAuthError(friendlyMessage);
      toast({
        title: t('general.error'),
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.name);
      
      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        setAuthError(friendlyMessage);
        toast({
          title: t('general.error'),
          description: friendlyMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('general.success'),
          description: "Account created successfully! Please check your email to verify your account.",
        });
        // Clear the form after successful signup
        setSignUpData({ email: '', password: '', name: '' });
      }
    } catch (error: any) {
      const friendlyMessage = getAuthErrorMessage(error);
      setAuthError(friendlyMessage);
      toast({
        title: t('general.error'),
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setAuthError(null);
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
            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" onClick={clearError}>{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup" onClick={clearError}>{t('auth.signUp')}</TabsTrigger>
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
                      onChange={(e) => {
                        setSignInData({ ...signInData, email: e.target.value });
                        clearError();
                      }}
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
                      onChange={(e) => {
                        setSignInData({ ...signInData, password: e.target.value });
                        clearError();
                      }}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : t('auth.signIn')}
                  </Button>
                  
                  <div className="text-center text-sm text-gray-600 mt-4">
                    <p>Don't have an account? Switch to the Sign Up tab above.</p>
                    <p className="mt-2">Having trouble? Make sure your email and password are correct.</p>
                  </div>
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
                      onChange={(e) => {
                        setSignUpData({ ...signUpData, name: e.target.value });
                        clearError();
                      }}
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
                      onChange={(e) => {
                        setSignUpData({ ...signUpData, email: e.target.value });
                        clearError();
                      }}
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
                      onChange={(e) => {
                        setSignUpData({ ...signUpData, password: e.target.value });
                        clearError();
                      }}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : t('auth.signUp')}
                  </Button>
                  
                  <div className="text-center text-sm text-gray-600 mt-4">
                    <p>Already have an account? Switch to the Sign In tab above.</p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}