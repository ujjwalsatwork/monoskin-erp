import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Mail, Phone, Shield, BarChart3, Package, Users, ArrowLeft } from 'lucide-react';
import loginBg from '@assets/generated_images/medical_skincare_login_background.png';
import monoskinLogo from '@assets/image_1768994507532.png';

export default function SignIn() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const loginMutation = useMutation({
    mutationFn: (data: { identifier: string; password: string; authMethod: string }) =>
      apiRequest('POST', '/api/auth/login', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        title: 'Login Failed',
        description: error?.message || 'Invalid credentials',
        variant: 'destructive',
      });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: (data: { phone: string }) =>
      apiRequest('POST', '/api/auth/send-otp', data),
    onSuccess: () => {
      setOtpSent(true);
      toast({
        title: 'OTP Sent',
        description: 'Please check your phone for the verification code',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send OTP',
        description: error?.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (data: { phone: string; otp: string }) =>
      apiRequest('POST', '/api/auth/verify-otp', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        title: 'Verification Failed',
        description: error?.message || 'Invalid OTP',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMethod === 'email') {
      if (!identifier.trim() || !password.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter your email/username and password',
          variant: 'destructive',
        });
        return;
      }
      loginMutation.mutate({ 
        identifier, 
        password,
        authMethod 
      });
    }
  };

  const handleSendOtp = () => {
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast({
        title: 'Error',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }
    sendOtpMutation.mutate({ phone: phone.replace(/\D/g, '') });
  };

  const handleVerifyOtp = () => {
    if (!otp.trim() || otp.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter the 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }
    verifyOtpMutation.mutate({ phone: phone.replace(/\D/g, ''), otp });
  };

  const handleTabChange = (value: string) => {
    setAuthMethod(value as 'email' | 'phone');
    setIdentifier('');
    setPhone('');
    setPassword('');
    setOtp('');
    setOtpSent(false);
  };

  const features = [
    { icon: Package, label: 'Inventory', desc: 'Real-time stock tracking' },
    { icon: BarChart3, label: 'Analytics', desc: 'Business insights' },
    { icon: Users, label: 'CRM', desc: 'Customer management' },
    { icon: Shield, label: 'Secure', desc: 'Enterprise security' },
  ];

  return (
    <div className="min-h-screen flex">
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col justify-between p-8"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-primary/70 to-primary/50" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm">
            <Shield className="h-4 w-4" />
            Enterprise Grade Security
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
            Streamline Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">
              Business Operations
            </span>
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Clinical-grade enterprise resource planning designed for modern skincare businesses. 
            Manage inventory, orders, customers, and analytics in one unified platform.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <div 
                key={feature.label}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white">{feature.label}</div>
                  <div className="text-sm text-white/60">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/50 text-sm">
          Trusted by skincare professionals worldwide
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-10">
            <img 
              src={monoskinLogo} 
              alt="Monoskin" 
              className="h-12 w-auto" 
              data-testid="img-logo"
            />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2" data-testid="text-title">Welcome Back</h2>
            <p className="text-muted-foreground" data-testid="text-description">
              Sign in to access your dashboard
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-xl border p-8">
            <Tabs value={authMethod} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                <TabsTrigger value="email" data-testid="tab-email" className="flex items-center gap-2 h-10">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" data-testid="tab-phone" className="flex items-center gap-2 h-10">
                  <Phone className="h-4 w-4" />
                  Phone
                </TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <TabsContent value="email" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-sm font-medium">
                      Email or Username
                    </Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="you@company.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={loginMutation.isPending}
                      autoComplete="username"
                      className="h-12 text-base"
                      data-testid="input-identifier"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="phone" className="mt-0 space-y-4">
                  {!otpSent ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={sendOtpMutation.isPending}
                          autoComplete="tel"
                          className="h-12 text-base"
                          data-testid="input-phone"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSendOtp}
                        className="w-full h-12 text-base font-semibold"
                        disabled={sendOtpMutation.isPending}
                        data-testid="button-send-otp"
                      >
                        {sendOtpMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          'Send OTP'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setOtpSent(false); setOtp(''); }}
                        className="mb-2 -ml-2"
                        data-testid="button-back-to-phone"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Change number
                      </Button>
                      <div className="text-sm text-muted-foreground mb-2">
                        OTP sent to <span className="font-medium">{phone}</span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="otp" className="text-sm font-medium">
                          Enter OTP
                        </Label>
                        <Input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          disabled={verifyOtpMutation.isPending}
                          className="h-12 text-base text-center tracking-widest font-mono"
                          maxLength={6}
                          data-testid="input-otp"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="w-full h-12 text-base font-semibold"
                        disabled={verifyOtpMutation.isPending || otp.length !== 6}
                        data-testid="button-verify-otp"
                      >
                        {verifyOtpMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Verify & Sign In'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSendOtp}
                        disabled={sendOtpMutation.isPending}
                        className="w-full text-muted-foreground"
                        data-testid="button-resend-otp"
                      >
                        {sendOtpMutation.isPending ? 'Sending...' : 'Resend OTP'}
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                {authMethod === 'email' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Password
                        </Label>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loginMutation.isPending}
                        autoComplete="current-password"
                        className="h-12 text-base"
                        data-testid="input-password"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold"
                      disabled={loginMutation.isPending}
                      data-testid="button-signin"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </>
                )}
              </form>
            </Tabs>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
