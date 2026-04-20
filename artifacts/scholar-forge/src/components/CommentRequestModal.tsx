import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CommentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; title: string }>;
  user: { name: string; email: string };
}

export function CommentRequestModal({ isOpen, onClose, projects, user }: CommentRequestModalProps) {
  const [selectedProject, setSelectedProject] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject || !commentText.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call to submit comment request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      console.error("Failed to submit comment request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedProject("");
    setCommentText("");
    setSubmitted(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Request to Add Comment
          </DialogTitle>
          <DialogDescription>
            Submit a request to add a comment to an existing research project.
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">Select Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project to comment on" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Your Comment</Label>
              <Textarea
                id="comment"
                placeholder="Share your thoughts, questions, or feedback about this project..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Requesting as:</strong> {user.name} ({user.email})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your request will be reviewed by the project owners before being added.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedProject || !commentText.trim()}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Request Submitted!</h3>
            <p className="text-sm text-muted-foreground">
              Your comment request has been submitted and will be reviewed by the project owners.
              You'll receive a notification once it's approved.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
