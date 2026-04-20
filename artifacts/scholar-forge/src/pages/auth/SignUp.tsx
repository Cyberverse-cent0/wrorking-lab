import { useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function SignUp() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    // Basic validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    
    if (!trimmedName) {
      setError("Full name is required");
      setLoading(false);
      return;
    }
    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters long");
      setLoading(false);
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required");
      setLoading(false);
      return;
    }
    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }
    if (!password) {
      setError("Password is required");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: trimmedName, 
          email: trimmedEmail, 
          password, 
          institution: institution.trim() || null 
        }),
      });
      
      // Handle non-JSON responses
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Sign up failed");
      }
      
      if (!data.token || !data.user) {
        throw new Error("Invalid response from server");
      }
      
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Sign up error:", err);
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Unable to connect to server. Please check your internet connection.");
      } else if (err.message.includes("Failed to fetch")) {
        setError("Server is not responding. Please try again later.");
      } else {
        setError(err.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">ScholarForge</h1>
        </div>
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Join ScholarForge</CardTitle>
            <CardDescription>Create your research workspace account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Dr. Jane Smith" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  data-testid="input-name" 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email"
                  type="email" 
                  autoComplete="username"
                  placeholder="you@university.edu" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  data-testid="input-email" 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institution">Institution <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input 
                  id="institution" 
                  name="institution"
                  type="text"
                  autoComplete="organization"
                  placeholder="MIT" 
                  value={institution} 
                  onChange={(e) => setInstitution(e.target.value)} 
                  data-testid="input-institution" 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                    data-testid="input-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-signup">
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/signin" className="text-primary hover:underline font-medium">Sign in</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
