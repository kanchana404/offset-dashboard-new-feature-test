// components/NoticeManager.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Calendar, User, Users, Trophy, Star, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Notice {
  _id: string;
  type: 'best_team' | 'best_employee' | 'other';
  title: string;
  description: string;
  teamName?: string;
  teamMembers?: string[];
  employeeId?: string;
  employeeName?: string;
  branchId?: string;
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface NoticeFormData {
  type: 'best_team' | 'best_employee' | 'other';
  title: string;
  description: string;
  teamName: string;
  teamMembers: string;
  employeeName: string;
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate: string;
}

export default function NoticeManager() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState<NoticeFormData>({
    type: 'other',
    title: '',
    description: '',
    teamName: '',
    teamMembers: '',
    employeeName: '',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notices');
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices);
      } else {
        toast.error('Failed to fetch notices');
      }
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast.error('Error fetching notices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      teamMembers: formData.teamMembers ? formData.teamMembers.split(',').map(m => m.trim()).filter(m => m) : [],
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined
    };

    try {
      const url = editingNotice ? `/api/notices/${editingNotice._id}` : '/api/notices';
      const method = editingNotice ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success(editingNotice ? 'Notice updated successfully' : 'Notice created successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchNotices();
      } else {
        toast.error(data.error || 'Failed to save notice');
      }
    } catch (error) {
      console.error('Error saving notice:', error);
      toast.error('Error saving notice');
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      type: notice.type,
      title: notice.title,
      description: notice.description,
      teamName: notice.teamName || '',
      teamMembers: notice.teamMembers ? notice.teamMembers.join(', ') : '',
      employeeName: notice.employeeName || '',
      priority: notice.priority,
      startDate: new Date(notice.startDate).toISOString().split('T')[0],
      endDate: notice.endDate ? new Date(notice.endDate).toISOString().split('T')[0] : ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      const res = await fetch(`/api/notices/${noticeId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success('Notice deleted successfully');
        fetchNotices();
      } else {
        toast.error('Failed to delete notice');
      }
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast.error('Error deleting notice');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'other',
      title: '',
      description: '',
      teamName: '',
      teamMembers: '',
      employeeName: '',
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    });
    setEditingNotice(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'best_team':
        return <Trophy className="h-4 w-4" />;
      case 'best_employee':
        return <Star className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notice Management</h1>
        {/* Optionally, add a create button here for main branch only */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No notices found.
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => (
                <div key={notice._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(notice.type)}
                        <h3 className="font-semibold text-lg">{notice.title}</h3>
                        <Badge className={getPriorityColor(notice.priority)}>
                          {notice.priority}
                        </Badge>
                        <Badge variant={notice.isActive ? "default" : "secondary"}>
                          {notice.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      {notice.type === 'best_team' && notice.teamName && (
                        <p className="text-sm text-blue-600 font-medium">
                          🏆 Team: {notice.teamName}
                        </p>
                      )}
                      
                      {notice.type === 'best_employee' && notice.employeeName && (
                        <p className="text-sm text-green-600 font-medium">
                          ⭐ Employee: {notice.employeeName}
                        </p>
                      )}
                      
                      {notice.teamMembers && notice.teamMembers.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Members: {notice.teamMembers.join(', ')}
                        </p>
                      )}
                    </div>
                    {/* Only show edit/delete for main branch */}
                    {user?.branch === 'main' && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(notice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(notice._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{notice.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Start: {new Date(notice.startDate).toLocaleDateString()}
                      </div>
                      {notice.endDate && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          End: {new Date(notice.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {notice.createdBy}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
