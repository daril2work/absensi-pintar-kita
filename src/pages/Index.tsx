
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Clock, MapPin, Users, Shield, Smartphone, BarChart3 } from 'lucide-react';

const Index = () => {
  const { user, profile, loading } = useAuth();
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
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
                Modern <span className="text-primary">Attendance</span> System
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                GPS-powered attendance tracking with real-time validation, shift management, and comprehensive reporting
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                Sign In
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
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need for modern attendance management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>GPS Validation</CardTitle>
                <CardDescription>
                  Automatic location verification ensures employees are at designated work locations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Smart Time Tracking</CardTitle>
                <CardDescription>
                  Real-time attendance monitoring with shift-based validation and late detection
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Mobile-First Design</CardTitle>
                <CardDescription>
                  Optimized for mobile devices with responsive design and native geolocation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Make-up Requests</CardTitle>
                <CardDescription>
                  Easy system for employees to request make-up time for missed attendance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Role-Based Access</CardTitle>
                <CardDescription>
                  Separate interfaces and permissions for employees and administrators
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Advanced Reporting</CardTitle>
                <CardDescription>
                  Comprehensive analytics with export capabilities for CSV and PDF reports
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
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple steps to modern attendance tracking
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold">Check In</h3>
              <p className="text-gray-600">
                Employees open the app and tap check-in. GPS automatically validates their location.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold">Real-time Validation</h3>
              <p className="text-gray-600">
                System validates location, time, and shift schedule to determine attendance status.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold">Analytics & Reports</h3>
              <p className="text-gray-600">
                Admins can view real-time data, generate reports, and manage make-up requests.
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
              Ready to Modernize Your Attendance System?
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Join organizations that trust our GPS-powered attendance system for accurate, real-time tracking.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 py-6"
              onClick={() => navigate('/auth')}
            >
              Start Free Today
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 Attendance System. Built with modern technology for reliable attendance tracking.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
