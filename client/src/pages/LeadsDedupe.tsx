import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, CheckCircle, Merge, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StatCard } from '@/components/shared/StatCard';
import { apiRequest } from '@/lib/queryClient';
import type { Lead } from '@shared/schema';

interface DuplicateGroup {
  id: string;
  matchScore: number;
  matchReason: string;
  leads: Lead[];
}

const LeadsDedupe = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resolvedGroups, setResolvedGroups] = useState<Set<string>>(new Set());
  const [mergingGroup, setMergingGroup] = useState<string | null>(null);

  const { data: leads = [], isLoading, error } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ primaryId, duplicateIds }: { primaryId: number; duplicateIds: number[] }) => {
      for (const dupId of duplicateIds) {
        await apiRequest('DELETE', `/api/leads/${dupId}`);
      }
      return primaryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({ title: 'Merge Complete', description: 'Duplicate leads have been merged successfully.' });
    },
    onError: () => {
      toast({ title: 'Merge Failed', description: 'Failed to merge leads. Please try again.', variant: 'destructive' });
    },
  });

  const findDuplicates = (leads: Lead[]): DuplicateGroup[] => {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<number>();

    leads.forEach((lead, i) => {
      if (processed.has(lead.id)) return;

      const duplicates = leads.filter((other, j) => {
        if (i === j || processed.has(other.id)) return false;
        
        if (lead.phone && other.phone && lead.phone === other.phone) return true;
        if (lead.email && other.email && lead.email.toLowerCase() === other.email.toLowerCase()) return true;
        
        const leadCity = lead.city || '';
        const otherCity = other.city || '';
        const nameSimilarity = lead.name?.toLowerCase().includes((other.name || '').toLowerCase().split(' ')[0]) ||
                               (other.name || '').toLowerCase().includes((lead.name || '').toLowerCase().split(' ')[0]);
        const citySame = leadCity && otherCity && leadCity.toLowerCase() === otherCity.toLowerCase();
        if (nameSimilarity && citySame) return true;
        
        return false;
      });

      if (duplicates.length > 0) {
        const allInGroup = [lead, ...duplicates];
        allInGroup.forEach(l => processed.add(l.id));
        
        let matchReason = 'Similar name and city';
        let matchScore = 75;
        
        if (duplicates.some(d => d.phone === lead.phone && lead.phone)) {
          matchReason = 'Same phone number';
          matchScore = 95;
        } else if (duplicates.some(d => d.email?.toLowerCase() === lead.email?.toLowerCase() && lead.email)) {
          matchReason = 'Same email address';
          matchScore = 90;
        }

        groups.push({
          id: `DG-${lead.id}`,
          matchScore,
          matchReason,
          leads: allInGroup,
        });
      }
    });

    return groups;
  };

  const duplicateGroups = findDuplicates(leads).filter(g => !resolvedGroups.has(g.id));

  const handleMerge = (group: DuplicateGroup) => {
    const sortedLeads = [...group.leads].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const primaryLead = sortedLeads[0];
    const duplicateIds = sortedLeads.slice(1).map(l => l.id);
    
    setMergingGroup(group.id);
    mergeMutation.mutate(
      { primaryId: primaryLead.id, duplicateIds },
      {
        onSettled: () => {
          setMergingGroup(null);
          setResolvedGroups(prev => new Set([...prev, group.id]));
        },
      }
    );
  };

  const handleIgnore = (group: DuplicateGroup) => {
    setResolvedGroups(prev => new Set([...prev, group.id]));
    toast({ title: 'Ignored', description: 'Duplicate group marked as not duplicates' });
  };

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.leads.length, 0);
  const highConfidence = duplicateGroups.filter(g => g.matchScore >= 90).length;
  const mediumConfidence = duplicateGroups.filter(g => g.matchScore >= 75 && g.matchScore < 90).length;

  const stats = [
    { title: 'Duplicate Groups', value: duplicateGroups.length.toString(), subtitle: 'To review', color: 'blue' as const },
    { title: 'Total Duplicates', value: totalDuplicates.toString(), subtitle: 'Leads affected', color: 'yellow' as const },
    { title: 'High Confidence', value: highConfidence.toString(), subtitle: '90%+ match', color: 'pink' as const },
    { title: 'Medium Confidence', value: mediumConfidence.toString(), subtitle: '75-89% match', color: 'purple' as const },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading leads data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Leads Deduplication"
        description="Identify and merge duplicate lead records"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {duplicateGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
            <p className="text-muted-foreground">All leads appear to be unique records.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map(group => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-5 w-5 ${group.matchScore >= 90 ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div>
                      <CardTitle className="text-base">{group.matchReason}</CardTitle>
                      <p className="text-sm text-muted-foreground">{group.leads.length} leads in this group</p>
                    </div>
                  </div>
                  <Badge variant={group.matchScore >= 90 ? 'destructive' : 'secondary'}>
                    {group.matchScore}% match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {group.leads.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {lead.email || 'No email'} | {lead.phone || 'No phone'} | {lead.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{lead.stage}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{lead.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleMerge(group)} 
                    disabled={mergingGroup === group.id}
                    data-testid={`button-merge-${group.id}`}
                  >
                    {mergingGroup === group.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Merge className="h-4 w-4 mr-2" />
                    )}
                    {mergingGroup === group.id ? 'Merging...' : 'Merge Leads'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleIgnore(group)} 
                    disabled={mergingGroup === group.id}
                    data-testid={`button-ignore-${group.id}`}
                  >
                    Not Duplicates
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadsDedupe;
