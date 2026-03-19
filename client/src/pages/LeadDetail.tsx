import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DetailPageHeader } from '@/components/shared/DetailPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusPill } from '@/components/shared/StatusPill';
import { ActivityTimeline, ActivityItem } from '@/components/shared/ActivityTimeline';
import { FollowUpForm, FollowUpData } from '@/components/shared/FollowUpForm';
import {
  Phone, Mail, MapPin, Building2, User, Calendar, Loader2, ArrowRight,
  Globe, Linkedin, Facebook, Instagram, MessageCircle, Store, Navigation,
  Camera, CreditCard, Briefcase, Users, Target, TrendingUp, ChevronRight,
  Send, FileText, Package, Download, UserPlus, Star, Copy, ExternalLink,
  Image as ImageIcon, Clock, Zap, Upload, X, CheckCircle, Ban,
  CalendarCheck, Banknote, ShoppingCart, Trash2, AlertCircle, Eye
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Lead, User as UserType, MR } from '@shared/schema';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const { data: persistedActivities = [] } = useQuery<{ id: number; leadId: number; type: string; description: string; outcome: string | null; userId: number | null; createdAt: string }[]>({
    queryKey: ['/api/leads', id, 'activities'],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}/activities`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: { type: string; description: string; outcome?: string }) => {
      const res = await apiRequest('POST', `/api/leads/${id}/activities`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', id, 'activities'] });
    },
  });

  const [businessCardUrl, setBusinessCardUrl] = useState<string | null>(null);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [geocodedLat, setGeocodedLat] = useState<string | null>(null);
  const [geocodedLng, setGeocodedLng] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodedRef = useRef(false);
  const [converting, setConverting] = useState(false);
  const businessCardInputRef = useRef<HTMLInputElement>(null);

  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [editingDesignation, setEditingDesignation] = useState(false);
  const [designationValue, setDesignationValue] = useState('');

  const [actionRemark, setActionRemark] = useState('');
  const [actionDate, setActionDate] = useState('');
  const [actionAssignMRId, setActionAssignMRId] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<string | null>(null);

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ['/api/leads', id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error('Lead not found');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: users = [] } = useQuery<UserType[]>({ queryKey: ['/api/users'] });
  const { data: mrs = [] } = useQuery<MR[]>({ queryKey: ['/api/mrs'] });

  useEffect(() => {
    if (lead?.businessCardUrl) setBusinessCardUrl(lead.businessCardUrl);
  }, [lead?.businessCardUrl]);

  useEffect(() => {
    if (!lead) return;
    if (lead.latitude && lead.longitude) {
      setGeocodedLat(String(lead.latitude));
      setGeocodedLng(String(lead.longitude));
      return;
    }
    if (geocodedRef.current) return;
    const query = [lead.address, lead.city, lead.state].filter(Boolean).join(', ');
    if (!query) return;
    geocodedRef.current = true;
    setIsGeocoding(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'en' },
    })
      .then(r => r.json())
      .then((results: { lat: string; lon: string }[]) => {
        if (results.length > 0) {
          const { lat, lon } = results[0];
          setGeocodedLat(lat);
          setGeocodedLng(lon);
          apiRequest('PATCH', `/api/leads/${lead.id}`, { latitude: lat, longitude: lon }).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIsGeocoding(false));
  }, [lead?.id, lead?.latitude, lead?.longitude]);

  useEffect(() => {
    if (lead) setDesignationValue(lead.designation || lead.specialization || '');
  }, [lead?.designation, lead?.specialization]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest('PATCH', `/api/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({ title: 'Lead Updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({ title: 'Lead Deleted', description: 'Lead has been deleted successfully.' });
      navigate('/leads');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete lead.', variant: 'destructive' });
    },
  });

  const handleDelete = () => { deleteMutation.mutate(); setDeleteOpen(false); };

  const handleConvert = async () => {
    setConvertOpen(false);
    setConverting(true);
    try {
      const res = await apiRequest('POST', `/api/leads/${id}/convert-to-doctor`, {});
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
      toast({
        title: data.alreadyConverted ? 'Already Converted' : 'Lead Converted!',
        description: `${lead?.name} is now a Doctor. Navigating to profile...`,
      });
      setTimeout(() => navigate(`/doctors/${data.doctor.id}`), 800);
    } catch {
      toast({ title: 'Conversion Failed', description: 'Could not convert lead to doctor.', variant: 'destructive' });
    } finally {
      setConverting(false);
    }
  };

  const handleScheduleFollowUp = (data: FollowUpData) => {
    updateMutation.mutate({ nextFollowUp: data.date });
    setShowFollowUpForm(false);
    createActivityMutation.mutate({
      type: 'follow_up',
      description: `Follow-up scheduled for ${new Date(data.date).toLocaleDateString()}. ${data.notes || `${data.type} - ${data.priority} priority`}`,
      outcome: 'neutral',
    });
    toast({ title: 'Follow-up Scheduled', description: `Next follow-up set for ${new Date(data.date).toLocaleDateString()}` });
  };

  const handleAddActivity = (activity: Omit<ActivityItem, 'id' | 'timestamp' | 'user'>) => {
    createActivityMutation.mutate({
      type: activity.type,
      description: activity.description || activity.title,
      outcome: activity.outcome,
    });
    toast({ title: 'Activity Added' });
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePhotoUploading(true);
    try {
      const res = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error('Could not get upload URL');
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await apiRequest('PATCH', `/api/leads/${id}`, { profilePhoto: objectPath as string });
      queryClient.invalidateQueries({ queryKey: ['/api/leads', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({ title: 'Profile Photo Saved', description: "Doctor's profile photo has been updated." });
    } catch {
      toast({ title: 'Upload Failed', description: 'Could not save profile photo. Try again.', variant: 'destructive' });
    } finally {
      setProfilePhotoUploading(false);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = '';
    }
  };

  const handleSaveDesignation = () => {
    const value = designationValue.trim();
    updateMutation.mutate({ designation: value });
    setEditingDesignation(false);
    toast({ title: 'Designation Updated', description: value || 'Designation cleared.' });
  };

  const ALLOWED_BC_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const ALLOWED_BC_EXTS = ['.jpg', '.jpeg', '.png', '.pdf'];
  const MAX_BC_SIZE_MB = 10;

  const handleBusinessCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_BC_TYPES.includes(file.type)) {
      toast({
        title: 'Unsupported Format',
        description: `Only ${ALLOWED_BC_EXTS.join(', ')} files are allowed.`,
        variant: 'destructive',
      });
      if (businessCardInputRef.current) businessCardInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_BC_SIZE_MB * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: `Business card must be under ${MAX_BC_SIZE_MB} MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
        variant: 'destructive',
      });
      if (businessCardInputRef.current) businessCardInputRef.current.value = '';
      return;
    }

    setUploadingCard(true);
    try {
      const res = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error('Could not get upload URL');
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const url = objectPath as string;
      setBusinessCardUrl(url);
      await apiRequest('PATCH', `/api/leads/${id}`, { businessCardUrl: url });
      queryClient.invalidateQueries({ queryKey: ['/api/leads', id] });
      toast({ title: 'Business Card Saved', description: "Doctor's business card has been saved to the lead." });
    } catch {
      toast({ title: 'Upload Failed', description: 'Could not save business card. Try again.', variant: 'destructive' });
    } finally {
      setUploadingCard(false);
      if (businessCardInputRef.current) businessCardInputRef.current.value = '';
    }
  };

  const handleActionSubmit = (actionType: string) => {
    if (!actionRemark && !actionDate) {
      toast({ title: 'Add Remarks or Date', description: 'Please enter remarks or select a date before logging this action.', variant: 'destructive' });
      return;
    }
    setSelectedActionType(actionType);

    if (actionType === 'Sale') {
      handleConvert();
      return;
    } else if (actionType === 'Follow Up' && actionDate) {
      updateMutation.mutate({ nextFollowUp: actionDate });
    } else if (actionType === 'Not Interested') {
      updateMutation.mutate({ stage: 'Lost' });
    }

    if (actionAssignMRId) {
      updateMutation.mutate({ assignedMRId: parseInt(actionAssignMRId) });
    }

    createActivityMutation.mutate({
      type: actionType === 'Follow Up' ? 'follow_up' : actionType === 'Sale' ? 'status_change' : 'call',
      description: [actionType, actionRemark, actionDate ? `Date: ${actionDate}` : ''].filter(Boolean).join(' · '),
      outcome: actionType === 'Sale' ? 'positive' : actionType === 'Not Interested' ? 'negative' : 'neutral',
    });
    toast({ title: `Action: ${actionType}`, description: actionRemark || 'Action logged successfully' });
    setActionRemark('');
    setActionDate('');
  };

  const handleAssignMR = () => {
    if (!actionAssignMRId) {
      toast({ title: 'Select an MR', description: 'Please select an MR to assign', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({ assignedMRId: parseInt(actionAssignMRId) });
    const mr = mrs.find(m => m.id === parseInt(actionAssignMRId));
    toast({ title: 'MR Assigned', description: `Lead assigned to ${mr?.name || 'selected MR'}` });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Lead not found</p>
      </div>
    );
  }

  const assignedMR = mrs.find(m => m.id === lead.assignedMRId);
  const mrName = assignedMR?.name || 'Unassigned';
  const mrTerritory = assignedMR?.territory || 'N/A';
  const daysInPipeline = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const STAGE_STEPS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Converted'];
  const currentStageIndex = STAGE_STEPS.indexOf(lead.stage || 'New');

  const defaultActivities: ActivityItem[] = [
    {
      id: 'created',
      type: 'status_change',
      title: 'Lead Created',
      description: `Source: ${lead.source || 'Unknown'}`,
      user: 'System',
      timestamp: new Date(lead.createdAt).toISOString(),
      outcome: 'positive',
    },
    ...(lead.assignedMRId ? [{
      id: 'assigned',
      type: 'task' as const,
      title: 'MR Assigned',
      description: `Assigned to ${mrName}`,
      user: 'System',
      timestamp: new Date(lead.updatedAt).toISOString(),
      outcome: 'neutral' as const,
    }] : []),
  ];

  const dbActivities: ActivityItem[] = persistedActivities.map(a => ({
    id: String(a.id),
    type: a.type as ActivityItem['type'],
    title: a.description.split(' · ')[0] || a.type,
    description: a.description,
    user: 'Recorded',
    timestamp: a.createdAt,
    outcome: (a.outcome as ActivityItem['outcome']) || 'neutral',
  }));

  const allActivities = [...dbActivities, ...defaultActivities];

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const designation = lead.designation || lead.specialization || '';
  const clinicExteriorPhoto = lead.clinicImages?.[0] || null;
  const additionalClinicPhotos = lead.clinicImages?.slice(1) || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <DetailPageHeader
        title={lead.name}
        subtitle={`ID: LD-${lead.id} · ${designation || 'Doctor Lead'}`}
        status={lead.stage || 'New'}
        backPath="/leads"
        primaryActions={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(true)} data-testid="button-delete">
              Delete
            </Button>
            {lead.stage !== 'Converted' && (
              <Button onClick={() => setConvertOpen(true)} disabled={converting} data-testid="button-convert">
                <ArrowRight className="h-4 w-4 mr-2" />
                {converting ? 'Converting...' : 'Convert to Doctor'}
              </Button>
            )}
            {lead.stage === 'Converted' && lead.convertedDoctorId && (
              <Button variant="outline" onClick={() => navigate(`/doctors/${lead.convertedDoctorId}`)} data-testid="button-view-doctor">
                <UserPlus className="h-4 w-4 mr-2" />
                View Doctor Profile
              </Button>
            )}
          </>
        }
      />

      {/* ══════════════════════════════════════════════════════════
          HERO PROFILE BANNER
      ══════════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden" data-testid="card-hero-banner">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/8 to-accent/10 relative">
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {lead.priority === 'High' && (
              <Badge className="text-xs flex items-center gap-1 bg-amber-500 text-white border-0">
                <Star className="h-3 w-3 fill-current" /> High Priority
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">{lead.stage || 'New'}</Badge>
            <Badge variant="outline" className="text-xs">{daysInPipeline}d in pipeline</Badge>
          </div>
        </div>
        <CardContent className="-mt-10 pb-5">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0 group/avatar">
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoUpload}
                data-testid="input-profile-photo-file"
              />
              <Avatar className="h-20 w-20 border-4 border-background shadow-xl" data-testid="avatar-doctor">
                <AvatarImage src={lead.profilePhoto || undefined} alt={lead.name} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(lead.name)}
                </AvatarFallback>
              </Avatar>
              {/* Camera upload overlay — always visible on hover, spinner when uploading */}
              <button
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover/avatar:bg-black/40 transition-all border-4 border-transparent"
                onClick={() => !profilePhotoUploading && profilePhotoInputRef.current?.click()}
                title="Upload profile photo"
                data-testid="button-upload-photo"
              >
                {profilePhotoUploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                ) : (
                  <Camera className="h-5 w-5 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                )}
              </button>
              {/* View full photo in new tab */}
              {lead.profilePhoto && (
                <button
                  className="absolute -bottom-1 -right-1 bg-background border rounded-full p-0.5 shadow hover:bg-muted transition-colors z-10"
                  onClick={(e) => { e.stopPropagation(); window.open(lead.profilePhoto!, '_blank'); }}
                  data-testid="button-view-photo"
                  title="View full photo"
                >
                  <Eye className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 pt-2 min-w-0">
              <h2 className="text-2xl font-bold leading-tight" data-testid="text-doctor-name">{lead.name}</h2>

              {/* Designation — always shown, inline-editable */}
              <div className="mt-0.5 flex items-center gap-1.5 group/designation" data-testid="div-designation-row">
                {editingDesignation ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={designationValue}
                      onChange={(e) => setDesignationValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDesignation(); if (e.key === 'Escape') setEditingDesignation(false); }}
                      placeholder="e.g. Dermatologist, MD"
                      className="h-7 text-sm w-52 border-primary/40"
                      autoFocus
                      data-testid="input-designation"
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleSaveDesignation} data-testid="button-save-designation">
                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingDesignation(false)} data-testid="button-cancel-designation">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {designationValue ? (
                      <p className="text-base text-primary font-medium" data-testid="text-doctor-designation">{designationValue}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 italic" data-testid="text-designation-empty">Add designation…</p>
                    )}
                    <button
                      className="opacity-0 group-hover/designation:opacity-100 transition-opacity ml-0.5"
                      onClick={() => setEditingDesignation(true)}
                      title="Edit designation"
                      data-testid="button-edit-designation"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                    </button>
                  </>
                )}
              </div>
              {lead.clinic && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground" data-testid="text-clinic-name">{lead.clinic}</span>
                </div>
              )}
              {(lead.city || lead.state) && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {/* Quick-dial pills */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    data-testid="pill-call">
                    <Phone className="h-3.5 w-3.5" />{lead.phone}
                  </a>
                )}
                {(lead.whatsappNumber || lead.phone) && (
                  <a href={`https://wa.me/${(lead.whatsappNumber || lead.phone)!.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                    data-testid="pill-whatsapp">
                    <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-sm font-medium hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                    data-testid="pill-email">
                    <Mail className="h-3.5 w-3.5" />{lead.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          QUICK ACTIONS — full-width horizontal strip
      ══════════════════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-primary/20 bg-primary" data-testid="section-quick-actions">
        <div className="px-4 py-2 border-b border-primary-foreground/10 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-primary-foreground/80" />
          <span className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider">Quick Actions</span>
        </div>
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {[
            { id: 'call',         label: 'Call',           Icon: Phone,         action: () => lead.phone ? window.open(`tel:${lead.phone}`) : toast({ title: 'No phone' }) },
            { id: 'whatsapp',     label: 'WhatsApp',       Icon: MessageCircle, action: () => { const n = lead.whatsappNumber || lead.phone; n ? window.open(`https://wa.me/${n.replace(/\D/g, '')}`) : toast({ title: 'No WhatsApp' }); } },
            { id: 'email',        label: 'Email',          Icon: Mail,          action: () => lead.email ? window.open(`mailto:${lead.email}`) : toast({ title: 'No email' }) },
            { id: 'follow-up',    label: 'Follow-up',      Icon: Calendar,      action: () => setShowFollowUpForm(true) },
            { id: 'send-mr',      label: 'Send to MR',     Icon: Send,          action: () => toast({ title: 'Sent to MR' }) },
            { id: 'create-order', label: 'Create Order',   Icon: FileText,      action: () => navigate(`/orders/create?leadId=${lead.id}`) },
            { id: 'quote',        label: 'Generate Quote', Icon: CreditCard,    action: () => toast({ title: 'Quote Generated' }) },
            { id: 'samples',      label: 'Send Samples',   Icon: Package,       action: () => toast({ title: 'Sample Request Created' }) },
            { id: 'brochure',     label: 'Share Brochure', Icon: Download,      action: () => toast({ title: 'Brochure Shared' }) },
            { id: 'assign-mr',   label: 'Assign MR',      Icon: UserPlus,      action: () => toast({ title: 'Use Action Panel to assign MR' }) },
          ].map(({ id, label, Icon, action }) => (
            <button key={id} onClick={action}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground transition-colors text-sm font-medium border border-primary-foreground/15 hover:border-primary-foreground/30"
              data-testid={`button-qa-${id}`}>
              <Icon className="h-3.5 w-3.5 text-primary-foreground/70" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2-COLUMN LAYOUT: LEFT SIDEBAR + MAIN CONTENT
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">

        {/* ═══════ LEFT SIDEBAR: Static/context data ═══════ */}
        <div className="space-y-4">

          {/* Stage Progress — compact stepper */}
          <Card data-testid="card-stage-progress">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pipeline Stage</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center gap-0 mb-2">
                {STAGE_STEPS.map((stage, index) => (
                  <div key={stage} className="flex items-center flex-1 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-colors
                        ${lead.stage === stage ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1' :
                          index < currentStageIndex ? 'bg-primary/60 text-white' : 'bg-muted text-muted-foreground/50'}`}
                      data-testid={`stage-step-${stage.toLowerCase().replace(' ', '-')}`}
                      title={stage}
                    >
                      {index < currentStageIndex ? '✓' : index + 1}
                    </div>
                    {index < STAGE_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-0.5 ${index < currentStageIndex ? 'bg-primary/60' : 'bg-muted'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                <span>{STAGE_STEPS[0]}</span>
                <span className="font-medium text-primary">{lead.stage || 'New'}</span>
                <span>{STAGE_STEPS[STAGE_STEPS.length - 1]}</span>
              </div>
            </CardContent>
          </Card>

          {/* Lead Details */}
          <Card data-testid="card-lead-details">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lead Info</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Source</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{lead.source || 'Unknown'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Priority</span>
                <Badge variant={lead.priority === 'High' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" />{lead.priority || 'Medium'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Follow-up</span>
                <span className="text-xs font-medium flex items-center gap-1 text-foreground">
                  {lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : <span className="text-muted-foreground">—</span>}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Created</span>
                <span className="text-xs text-foreground">{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
              {lead.lastContactedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Last Contact</span>
                  <span className="text-xs text-foreground">{new Date(lead.lastContactedAt).toLocaleDateString()}</span>
                </div>
              )}
              {lead.notes && (
                <div className="pt-1.5 border-t">
                  <p className="text-[10px] text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs leading-relaxed text-foreground/80">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact + Social — compact combined */}
          <Card data-testid="card-contact-details">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact & Social</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {lead.phone && (
                <div className="flex items-center gap-2 group" data-testid="contact-primary-phone">
                  <div className="p-1 rounded bg-blue-50 dark:bg-blue-950 flex-shrink-0">
                    <Phone className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <a href={`tel:${lead.phone}`} className="text-xs font-medium hover:text-primary flex-1 truncate">{lead.phone}</a>
                  <button onClick={() => copyToClipboard(lead.phone!, 'Phone')} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid="button-copy-primary-phone">
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2" data-testid="contact-whatsapp">
                <div className="p-1 rounded bg-green-50 dark:bg-green-950 flex-shrink-0">
                  <MessageCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                {(lead.whatsappNumber || lead.phone) ? (
                  <a href={`https://wa.me/${(lead.whatsappNumber || lead.phone)!.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium hover:text-green-600 truncate" data-testid="link-whatsapp">
                    {lead.whatsappNumber || lead.phone}
                  </a>
                ) : <span className="text-xs text-muted-foreground">Not provided</span>}
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 group" data-testid="contact-email">
                  <div className="p-1 rounded bg-orange-50 dark:bg-orange-950 flex-shrink-0">
                    <Mail className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  </div>
                  <a href={`mailto:${lead.email}`} className="text-xs font-medium hover:text-primary truncate flex-1">{lead.email}</a>
                  <button onClick={() => copyToClipboard(lead.email!, 'Email')} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid="button-copy-email">
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-2" data-testid="contact-website">
                  <div className="p-1 rounded bg-muted flex-shrink-0">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <a href={lead.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium hover:text-primary truncate flex items-center gap-1" data-testid="link-website">
                    {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                  </a>
                </div>
              )}
              {lead.receptionistName && (
                <div className="flex items-center gap-2" data-testid="contact-receptionist">
                  <div className="p-1 rounded bg-purple-50 dark:bg-purple-950 flex-shrink-0">
                    <User className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium" data-testid="text-receptionist-name">{lead.receptionistName}</p>
                    {lead.receptionistPhone && <a href={`tel:${lead.receptionistPhone}`} className="text-[10px] text-muted-foreground hover:text-primary" data-testid="text-receptionist-phone">{lead.receptionistPhone}</a>}
                  </div>
                </div>
              )}

              {/* Social divider */}
              {(lead.socialLinkedIn || lead.socialFacebook || lead.socialInstagram) && (
                <div className="pt-1.5 border-t space-y-1.5" data-testid="card-social-links">
                  {lead.socialLinkedIn && (
                    <div className="flex items-center gap-2" data-testid="row-linkedin">
                      <div className="p-1 rounded bg-[#0077b5]/10 flex-shrink-0">
                        <Linkedin className="h-3 w-3 text-[#0077b5]" />
                      </div>
                      <a href={lead.socialLinkedIn} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium text-[#0077b5] hover:underline truncate flex items-center gap-1" data-testid="link-linkedin">
                        LinkedIn <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                  {lead.socialFacebook && (
                    <div className="flex items-center gap-2" data-testid="row-facebook">
                      <div className="p-1 rounded bg-[#1877f2]/10 flex-shrink-0">
                        <Facebook className="h-3 w-3 text-[#1877f2]" />
                      </div>
                      <a href={lead.socialFacebook} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium text-[#1877f2] hover:underline truncate flex items-center gap-1" data-testid="link-facebook">
                        Facebook <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                  {lead.socialInstagram && (
                    <div className="flex items-center gap-2" data-testid="row-instagram">
                      <div className="p-1 rounded bg-[#e4405f]/10 flex-shrink-0">
                        <Instagram className="h-3 w-3 text-[#e4405f]" />
                      </div>
                      <a href={lead.socialInstagram} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium text-[#e4405f] hover:underline truncate flex items-center gap-1" data-testid="link-instagram">
                        Instagram <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinic Location */}
          <Card data-testid="card-clinic-location">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Clinic Location
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {(() => {
                const addressParts = [lead.address, lead.city, lead.state].filter(Boolean);
                const addressQuery = addressParts.join(', ');
                const hasAddress = addressParts.length > 0;
                const hasCoords = !!geocodedLat && !!geocodedLng;

                const mapEmbedUrl = hasCoords
                  ? `https://maps.google.com/maps?q=${geocodedLat},${geocodedLng}&z=15&output=embed`
                  : hasAddress
                    ? `https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&output=embed`
                    : null;

                const openMapsUrl = hasCoords
                  ? `https://www.google.com/maps?q=${geocodedLat},${geocodedLng}`
                  : hasAddress
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
                    : null;

                return (
                  <>
                    {hasAddress ? (
                      <div className="p-2 rounded-md bg-muted/40 text-xs" data-testid="contact-address">
                        <p className="font-medium" data-testid="text-full-address">{addressQuery}</p>
                        {openMapsUrl && (
                          <a href={openMapsUrl} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 mt-1" data-testid="link-open-maps">
                            <Navigation className="h-2.5 w-2.5" />
                            Open in Google Maps
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60" data-testid="text-no-address">Address not provided</p>
                    )}

                    <div className="rounded-lg overflow-hidden border bg-muted/20 relative" style={{ height: '160px' }} data-testid="section-maps-embed">
                      {isGeocoding ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2" data-testid="state-geocoding">
                          <Loader2 className="h-5 w-5 text-muted-foreground/50 animate-spin" />
                          <p className="text-[10px] text-muted-foreground/60">Locating on map…</p>
                        </div>
                      ) : mapEmbedUrl ? (
                        <>
                          <iframe
                            key={mapEmbedUrl}
                            src={mapEmbedUrl}
                            width="100%" height="100%" style={{ border: 0 }}
                            allowFullScreen loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Clinic Location Map"
                            data-testid="iframe-map"
                          />
                          {openMapsUrl && (
                            <a
                              href={openMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute bottom-2 right-2 bg-white dark:bg-zinc-800 border rounded shadow-sm px-2 py-1 flex items-center gap-1 text-[10px] font-medium text-primary hover:bg-primary/5 transition-colors"
                              data-testid="button-open-gmaps-overlay"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> Google Maps
                            </a>
                          )}
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-1 text-center p-3" data-testid="state-no-location">
                          <MapPin className="h-6 w-6 text-muted-foreground/25" />
                          <p className="text-[10px] text-muted-foreground/60">No address or coordinates available</p>
                        </div>
                      )}
                    </div>

                    {hasCoords && (
                      <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1" data-testid="text-coords">
                        <MapPin className="h-2.5 w-2.5" />
                        {Number(geocodedLat).toFixed(5)}, {Number(geocodedLng).toFixed(5)}
                      </p>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Nearby Chemist — compact */}
          {lead.nearbyChemistName && (
            <Card>
              <CardContent className="px-3 py-3">
                <div className="flex items-center gap-2" data-testid="contact-chemist">
                  <div className="p-1 rounded bg-teal-50 dark:bg-teal-950 flex-shrink-0">
                    <Store className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Nearby Chemist</p>
                    <p className="text-xs font-medium" data-testid="text-chemist-name">{lead.nearbyChemistName}</p>
                    {lead.nearbyChemistPhone && (
                      <a href={`tel:${lead.nearbyChemistPhone}`} className="text-[10px] text-muted-foreground hover:text-primary" data-testid="text-chemist-phone">{lead.nearbyChemistPhone}</a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up form (when active) */}
          {showFollowUpForm && (
            <FollowUpForm
              entityType="lead"
              entityName={lead.name}
              currentFollowUp={lead.nextFollowUp || undefined}
              onSchedule={handleScheduleFollowUp}
              onCancel={() => setShowFollowUpForm(false)}
            />
          )}
        </div>

        {/* ═══════ MAIN COLUMN: Action-focused content ═══════ */}
        <div className="space-y-4">

          {/* ── ACTION DASHBOARD ── Doctor → MR → Company relationship + stats + next steps */}
          <Card className="overflow-hidden border border-primary/15" data-testid="card-relationship-dashboard">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Action Dashboard</span>
                <span className="text-xs text-muted-foreground">— Doctor · MR · Company</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {daysInPipeline}d in pipeline</span>
                <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Stage {currentStageIndex + 1}/{STAGE_STEPS.length}</span>
              </div>
            </div>
            <CardContent className="p-4 space-y-4">
              {/* Relationship map */}
              <div className="flex items-stretch gap-3">
                {/* Doctor Node */}
                <div className="flex-1 rounded-xl border-2 border-primary/25 bg-primary/5 p-3 text-center" data-testid="node-doctor">
                  <Avatar className="h-10 w-10 mx-auto mb-2">
                    <AvatarImage src={lead.profilePhoto || undefined} />
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(lead.name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-bold text-primary truncate">{lead.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{designation || 'Doctor'}</p>
                  {lead.clinic && <p className="text-[10px] text-muted-foreground truncate">{lead.clinic}</p>}
                  <Badge variant="secondary" className="text-[10px] mt-1 px-1.5">{lead.stage || 'New'}</Badge>
                </div>

                <div className="flex flex-col items-center justify-center gap-1 px-1">
                  <ChevronRight className="h-4 w-4 text-primary/40" />
                  <div className="flex flex-col items-center">
                    <div className="w-px h-5 bg-primary/20" />
                    <span className="text-[9px] text-muted-foreground/60 bg-background px-1 z-10 -my-1.5">via</span>
                    <div className="w-px h-5 bg-primary/20" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary/40" />
                </div>

                {/* MR Node */}
                <div className="flex-1 rounded-xl border-2 border-amber-400/30 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-center" data-testid="node-mr">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-2">
                    <Briefcase className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                  </div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 truncate">{mrName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Medical Rep</p>
                  <p className="text-[10px] text-muted-foreground truncate">{mrTerritory}</p>
                  {!lead.assignedMRId
                    ? <Badge variant="outline" className="text-[10px] mt-1 px-1.5 border-amber-400 text-amber-600">Unassigned</Badge>
                    : <Badge className="text-[10px] mt-1 px-1.5 bg-amber-600 text-white border-0">Assigned</Badge>
                  }
                </div>

                <div className="flex flex-col items-center justify-center gap-1 px-1">
                  <ChevronRight className="h-4 w-4 text-primary/40" />
                  <div className="flex flex-col items-center">
                    <div className="w-px h-5 bg-primary/20" />
                    <span className="text-[9px] text-muted-foreground/60 bg-background px-1 z-10 -my-1.5">to</span>
                    <div className="w-px h-5 bg-primary/20" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary/40" />
                </div>

                {/* Company Node */}
                <div className="flex-1 rounded-xl border-2 border-green-500/25 bg-green-50/60 dark:bg-green-950/20 p-3 text-center" data-testid="node-company">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-2">
                    <Building2 className="h-5 w-5 text-green-700 dark:text-green-400" />
                  </div>
                  <p className="text-xs font-bold text-green-800 dark:text-green-300">Monoskin</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Company</p>
                  <p className="text-[10px] text-muted-foreground">Dermatology</p>
                  <Badge className="text-[10px] mt-1 px-1.5 bg-green-600 text-white border-0">Active</Badge>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2" data-testid="stat-row">
                <div className="rounded-lg bg-muted/40 p-2.5 text-center" data-testid="stat-days-pipeline">
                  <p className="text-base font-bold leading-none">{daysInPipeline}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Days in Pipeline</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 text-center" data-testid="stat-stage-number">
                  <p className="text-base font-bold leading-none">{currentStageIndex + 1}/{STAGE_STEPS.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Stage Progress</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 text-center" data-testid="stat-mr-assigned">
                  <p className="text-base font-bold leading-none">{lead.assignedMRId ? '✓' : '—'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">MR Assigned</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 text-center" data-testid="stat-followup">
                  <p className="text-base font-bold leading-none truncate">{lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Next Follow-up</p>
                </div>
              </div>

              {/* Recommended next steps */}
              <div className="rounded-lg border border-primary/15 bg-primary/3 p-3" data-testid="section-next-steps">
                <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" /> Recommended Next Steps
                </p>
                <div className="flex flex-wrap gap-2">
                  {(lead.stage === 'New' || !lead.stage) && (<>
                    <button onClick={() => lead.phone && window.open(`tel:${lead.phone}`)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors" data-testid="nextstep-call"><Phone className="h-3 w-3" /> Initial Call</button>
                    <button onClick={() => setShowFollowUpForm(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors" data-testid="nextstep-followup"><Calendar className="h-3 w-3" /> Schedule Visit</button>
                  </>)}
                  {lead.stage === 'Contacted' && (<>
                    <button onClick={() => toast({ title: 'Sample Request Created' })} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 text-amber-800 dark:text-amber-300 text-xs font-medium transition-colors" data-testid="nextstep-samples"><Package className="h-3 w-3" /> Send Samples</button>
                    <button onClick={() => toast({ title: 'Brochure Shared' })} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 text-amber-800 dark:text-amber-300 text-xs font-medium transition-colors" data-testid="nextstep-brochure"><Download className="h-3 w-3" /> Share Brochure</button>
                  </>)}
                  {(lead.stage === 'Qualified' || lead.stage === 'Proposal') && (<>
                    <button onClick={() => toast({ title: 'Quote Generated' })} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-800 dark:text-blue-300 text-xs font-medium transition-colors" data-testid="nextstep-quote"><CreditCard className="h-3 w-3" /> Generate Quote</button>
                    <button onClick={() => navigate(`/orders/create?leadId=${lead.id}`)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-800 dark:text-blue-300 text-xs font-medium transition-colors" data-testid="nextstep-order"><FileText className="h-3 w-3" /> Create Order</button>
                  </>)}
                  {lead.stage === 'Negotiation' && (
                    <button onClick={() => setConvertOpen(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/30 hover:bg-green-200 text-green-800 dark:text-green-300 text-xs font-medium transition-colors" data-testid="nextstep-convert"><ArrowRight className="h-3 w-3" /> Convert to Customer</button>
                  )}
                  {lead.stage === 'Converted' && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">✓ Lead Successfully Converted</span>
                  )}
                  {!lead.assignedMRId && (
                    <button onClick={() => toast({ title: 'Use Action Panel to assign MR' })} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium transition-colors" data-testid="nextstep-assign"><UserPlus className="h-3 w-3" /> Assign MR</button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── BUSINESS CARD ── */}
          <Card data-testid="card-business-card">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3" /> Business Card
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <input
                  ref={businessCardInputRef}
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf"
                  capture="environment"
                  className="hidden"
                  onChange={handleBusinessCardUpload}
                  data-testid="input-business-card-file"
                />
                <div
                  className="w-full h-28 rounded-xl border-2 border-dashed border-primary/25 bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all overflow-hidden relative group"
                  onClick={() => !uploadingCard && businessCardInputRef.current?.click()}
                  data-testid="area-business-card-upload"
                >
                  {uploadingCard ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-muted-foreground">Saving…</span>
                    </div>
                  ) : businessCardUrl ? (
                    <>
                      {businessCardUrl.toLowerCase().endsWith('.pdf') ? (
                        <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
                          <FileText className="h-8 w-8 text-primary/60" />
                          <span className="text-xs font-medium text-muted-foreground">PDF Document</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(businessCardUrl, '_blank'); }}
                            className="text-[10px] text-primary underline underline-offset-2"
                            data-testid="button-open-pdf"
                          >
                            Open PDF
                          </button>
                        </div>
                      ) : (
                        <img src={businessCardUrl} alt="Business Card" className="w-full h-full object-contain" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); window.open(businessCardUrl, '_blank'); }}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 transition-colors" data-testid="button-view-business-card">
                          <Eye className="h-3.5 w-3.5 text-white" />
                        </button>
                        <button onClick={async (e) => {
                            e.stopPropagation(); setBusinessCardUrl(null);
                            await apiRequest('PATCH', `/api/leads/${id}`, { businessCardUrl: null });
                            queryClient.invalidateQueries({ queryKey: ['/api/leads', id] });
                          }}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 transition-colors" data-testid="button-remove-business-card">
                          <X className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center px-3">
                      <Upload className="h-5 w-5 text-primary/40" />
                      <p className="text-xs text-muted-foreground font-medium">Upload Business Card</p>
                      <p className="text-[10px] text-muted-foreground/60">JPG, PNG or PDF · max 10 MB</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


          {/* ── ACTION PANEL ── */}
          <Card className="overflow-hidden border border-primary/20" data-testid="card-action-panel">
            <div className="bg-primary px-4 py-3">
              <h3 className="text-sm font-bold text-primary-foreground uppercase tracking-wide flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary-foreground/80" /> Action
              </h3>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex gap-2 items-center md:col-span-1" data-testid="action-assign-row">
                  <Select value={actionAssignMRId} onValueChange={setActionAssignMRId}>
                    <SelectTrigger className="h-9 text-sm flex-1" data-testid="select-assign-mr">
                      <SelectValue placeholder="Select MR…" />
                    </SelectTrigger>
                    <SelectContent>
                      {mrs.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name} — {m.territory}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={handleAssignMR} className="h-9 shrink-0 border-primary/30 hover:bg-primary/5" data-testid="button-assign-mr">
                    Assign <CheckCircle className="h-3.5 w-3.5 ml-1 text-primary" />
                  </Button>
                </div>
                <div className="md:col-span-1">
                  <Textarea placeholder="Remarks" value={actionRemark} onChange={e => setActionRemark(e.target.value)}
                    className="min-h-[36px] max-h-20 resize-none text-sm border-primary/20 focus-visible:ring-primary/30" data-testid="textarea-remarks" />
                </div>
                <div className="flex items-center border border-primary/20 rounded-md overflow-hidden h-9 md:col-span-1" data-testid="action-date-row">
                  <span className="px-3 py-2 text-sm font-medium bg-primary/10 text-primary border-r border-primary/20 whitespace-nowrap">Date</span>
                  <Input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)}
                    className="border-0 rounded-none h-full text-sm flex-1 focus-visible:ring-0" data-testid="input-action-date" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-primary/10" data-testid="action-type-buttons">
                {([
                  { type: 'Visited',        Icon: Building2,     bg: 'bg-primary hover:bg-primary/90',                      border: 'border-primary/80' },
                  { type: 'No Response',    Icon: AlertCircle,   bg: 'bg-amber-500 hover:bg-amber-600',                     border: 'border-amber-500' },
                  { type: 'Not Interested', Icon: Ban,           bg: 'bg-muted-foreground/60 hover:bg-muted-foreground/70', border: 'border-muted-foreground/50' },
                  { type: 'Follow Up',      Icon: CalendarCheck, bg: 'bg-primary hover:bg-primary/90',                      border: 'border-primary/80' },
                  { type: 'Appointment',    Icon: Calendar,      bg: 'bg-green-600 hover:bg-green-700',                     border: 'border-green-600' },
                  { type: 'Budget Issue',   Icon: Banknote,      bg: 'bg-primary/80 hover:bg-primary/70',                   border: 'border-primary/60' },
                  { type: 'Loan',           Icon: CreditCard,    bg: 'bg-primary/80 hover:bg-primary/70',                   border: 'border-primary/60' },
                  { type: 'Sale',           Icon: ShoppingCart,  bg: 'bg-primary hover:bg-primary/90',                      border: 'border-primary/80' },
                  { type: 'Delete',         Icon: Trash2,        bg: 'bg-destructive hover:bg-destructive/90',              border: 'border-destructive' },
                ] as const).map(({ type, Icon, bg, border }) => (
                  <button
                    key={type}
                    onClick={() => type === 'Delete' ? setDeleteOpen(true) : handleActionSubmit(type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white border transition-all ${bg} ${border} ${selectedActionType === type ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                    data-testid={`button-action-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="h-3.5 w-3.5" />{type}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── CLINIC PHOTOS ── */}
          {(clinicExteriorPhoto || additionalClinicPhotos.length > 0) && (
            <Card data-testid="card-clinic-exterior">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" /> Clinic Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {clinicExteriorPhoto && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity col-span-1"
                      onClick={() => window.open(clinicExteriorPhoto, '_blank')} data-testid="img-clinic-exterior">
                      <img src={clinicExteriorPhoto} alt="Clinic Exterior" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {additionalClinicPhotos.map((img, index) => (
                    <div key={index} className="aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(img, '_blank')} data-testid={`img-clinic-${index + 1}`}>
                      <img src={img} alt={`Clinic ${index + 2}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>{/* end MAIN COLUMN */}
      </div>{/* end 2-col layout */}

      {/* ══════════════════════════════════════════════════════════
          ACTIVITY TIMELINE (full width)
      ══════════════════════════════════════════════════════════ */}
      <ActivityTimeline
        activities={allActivities}
        onAddActivity={handleAddActivity}
        entityType="lead"
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        confirmLabel="Delete"
        destructive={true}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert Lead"
        description="This will create a Doctor profile with all the data from this lead, including profile photo, clinic images, social links, and contact details. You'll be taken to the new Doctor profile immediately."
        confirmLabel="Convert"
        onConfirm={handleConvert}
      />
    </div>
  );
}
