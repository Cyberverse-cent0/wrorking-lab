import { useState } from "react";
import { X, User, Upload, Building, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function ProfilePopup() {
  const { user, setShowProfilePopup } = useAuth();
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    setShowProfilePopup(false);
  };

  const goToProfile = () => {
    setIsVisible(false);
    setShowProfilePopup(false);
    navigate("/account");
  };

  if (!isVisible || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="relative pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-8 w-8 p-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-center text-lg">Welcome to ScholarForge! 👋</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto mb-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.image || ''} alt={user?.name} />
                <AvatarFallback className="text-xl">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <h3 className="font-semibold text-foreground">Hi, {user?.name}!</h3>
            <p className="text-sm text-muted-foreground">
              Complete your profile to enhance your research collaboration experience
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Upload className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">Profile Picture</div>
                <div className="text-xs text-muted-foreground">Add a professional photo</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Building className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">Institution</div>
                <div className="text-xs text-muted-foreground">Share your research affiliation</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">Bio & Interests</div>
                <div className="text-xs text-muted-foreground">Tell others about your research</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={goToProfile}
              className="flex-1"
            >
              Complete Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
