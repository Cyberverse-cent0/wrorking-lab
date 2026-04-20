import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { 
  MessageSquare, 
  Users, 
  FileText, 
  FileText as Blog, 
  Settings, 
  ArrowLeft,
  Send,
  Paperclip,
  Upload,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Pin,
  Reply,
  Edit3,
  Trash2,
  Heart,
  MessageCircle,
  Calendar,
  User,
  Clock,
  Download,
  Eye
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface RoomMessage {
  id: string;
  content: string;
  messageType: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: string;
  isPinned: boolean;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderImage?: string;
}

interface RoomFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  description?: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  uploadedBy: string;
  uploaderName: string;
  uploaderEmail: string;
  uploaderImage?: string;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt?: string;
  content: string;
  status: string;
  isFeatured: boolean;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt?: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorImage?: string;
}

interface RoomMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  lastActiveAt: string;
  userName: string;
  userEmail: string;
  userImage?: string;
}

interface ProjectRoom {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  projectId: string;
  members: RoomMember[];
}

export default function ProjectRoom() {
  const { user } = useAuth();
  const params = useParams();
  const roomId = params.roomId;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("messages");
  const [messageInput, setMessageInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewRoomDialog, setShowNewRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch room details
  const { data: room, isLoading: roomLoading } = useQuery<ProjectRoom>(
    `/api/rooms/${roomId}`,
    [],
    { enabled: !!roomId }
  );

  // Fetch room messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<RoomMessage[]>(
    `/api/rooms/${roomId}/messages`,
    [],
    { enabled: !!roomId && activeTab === "messages" }
  );

  // Fetch room files
  const { data: files = [], isLoading: filesLoading } = useQuery<RoomFile[]>(
    `/api/rooms/${roomId}/files`,
    [],
    { enabled: !!roomId && activeTab === "files" }
  );

  // Fetch project blog posts
  const { data: blogPosts = [], isLoading: blogLoading } = useQuery<BlogPost[]>(
    `/api/projects/${room?.projectId}/blog`,
    [],
    { enabled: !!room?.projectId && activeTab === "blog" }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    async (content: string) => {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("scholarforge_token")}`,
        },
        body: JSON.stringify({
          content,
          replyTo: replyingTo,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      return response.json();
    },
    {
      onSuccess: () => {
        setMessageInput("");
        setReplyingTo(null);
        queryClient.invalidateQueries([`/api/rooms/${roomId}/messages`]);
        scrollToBottom();
      },
    }
  );

  // Join room mutation
  const joinRoomMutation = useMutation(
    async () => {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("scholarforge_token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to join room");
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([`/api/rooms/${roomId}`]);
      },
    }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageInput.trim() && room) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  const handleReply = (messageId: string) => {
    setReplyingTo(messageId);
    setMessageInput("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getUserRole = () => {
    if (!room || !user) return null;
    const member = room.members.find(m => m.userId === user.id);
    return member?.role;
  };

  const canManageContent = () => {
    const role = getUserRole();
    return role === "admin" || role === "moderator";
  };

  if (roomLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Room not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Check if user is a member
  const isMember = room.members.some(m => m.userId === user?.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{room.name}</h1>
                {room.description && (
                  <p className="text-sm text-muted-foreground">{room.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                {room.members.length} members
              </Badge>
              {!isMember ? (
                <Button onClick={() => joinRoomMutation.mutate()} disabled={joinRoomMutation.isLoading}>
                  Join Room
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      Room Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Leave Room
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2">
              <Blog className="w-4 h-4" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Room Messages</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className={cn(
                        "flex gap-3 p-3 rounded-lg",
                        message.senderId === user?.id ? "bg-primary/10 ml-auto max-w-[80%]" : "bg-muted max-w-[80%]"
                      )}>
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={message.senderImage} alt={message.senderName} />
                          <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{message.senderName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(message.createdAt)}
                            </span>
                            {message.isPinned && <Pin className="w-3 h-3 text-primary" />}
                          </div>
                          <div className="text-sm">{message.content}</div>
                          {message.fileUrl && (
                            <div className="mt-2 p-2 bg-background rounded border">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-medium">{message.fileName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {message.fileSize && formatFileSize(message.fileSize)}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={() => handleReply(message.id)}>
                              <Reply className="w-3 h-3 mr-1" />
                              Reply
                            </Button>
                            {canManageContent() && (
                              <>
                                <Button variant="ghost" size="sm">
                                  <Pin className="w-3 h-3 mr-1" />
                                  {message.isPinned ? "Unpin" : "Pin"}
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive">
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {isMember && (
                  <div className="border-t pt-4 mt-4">
                    {replyingTo && (
                      <div className="mb-2 p-2 bg-muted rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span>Replying to message...</span>
                          <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        className="flex-1 min-h-[80px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm">
                          <Paperclip className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={handleSendMessage} 
                          disabled={sendMessageMutation.isLoading}
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shared Files</CardTitle>
                  {isMember && (
                    <Button>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No files shared yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {files.map((file) => (
                      <div key={file.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-8 h-8 text-primary" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{file.fileName}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.fileSize)}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              {file.uploadedBy === user?.id && (
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {file.description && (
                          <p className="text-sm text-muted-foreground mb-2">{file.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{file.uploaderName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{file.downloadCount}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blog Tab */}
          <TabsContent value="blog" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Project Blog</CardTitle>
                  {isMember && (
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Post
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {blogLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : blogPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Blog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No blog posts yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blogPosts.map((post) => (
                      <div key={post.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{post.title}</h3>
                            {post.excerpt && (
                              <p className="text-muted-foreground mt-1">{post.excerpt}</p>
                            )}
                          </div>
                          {post.isFeatured && (
                            <Badge variant="secondary">Featured</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{post.authorName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{post.viewCount}</span>
                          </div>
                        </div>
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm">
                            <Heart className="w-4 h-4 mr-1" />
                            {post.likeCount}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {post.commentCount}
                          </Button>
                          <Button variant="outline" size="sm">
                            Read More
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Room Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {room.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.userImage} alt={member.userName} />
                          <AvatarFallback>{member.userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{member.userName}</h4>
                          <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {member.role}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Last active: {formatDate(member.lastActiveAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Joined: {formatDate(member.joinedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
