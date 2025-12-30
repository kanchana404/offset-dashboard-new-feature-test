"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !authLoading) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(username, password);
      toast({
        title: "Sign In Successful",
        description: "You have signed in successfully.",
        variant: "default"
      });
      router.push("/");
    } catch (error) {
      console.error("Login failed", error);
      toast({
        title: "Sign In Failed",
        description: "Username or password incorrect.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="w-full max-w-4xl flex bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="w-full md:w-1/2 p-8">
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" /> Sign In
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Sign up
                </a>
              </p>
            </CardFooter>
          </Card>
        </div>
        <div className="hidden md:block md:w-1/2 bg-gray-100 p-8">
          <div className="h-full flex items-center justify-center">
            <AnimatedPrintingIcon />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedPrintingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100" className="text-purple-600">
      <rect width="70" height="50" x="15" y="25" fill="currentColor" rx="5" ry="5">
        <animate attributeName="y" values="25;20;25" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect width="60" height="10" x="20" y="15" fill="currentColor" rx="2" ry="2">
        <animate attributeName="y" values="15;10;15" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect width="50" height="5" x="25" y="80" fill="currentColor">
        <animate attributeName="width" values="0;50;0" dur="2s" repeatCount="indefinite" />
      </rect>
      <circle cx="25" cy="35" r="3" fill="white" />
      <circle cx="35" cy="35" r="3" fill="white" />
      <rect width="20" height="5" x="25" y="45" fill="white" rx="2" ry="2" />
      <rect width="20" height="5" x="25" y="55" fill="white" rx="2" ry="2" />
    </svg>
  );
}