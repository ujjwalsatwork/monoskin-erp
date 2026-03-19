import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Phone, Mail, MapPin, Building2, Globe, 
  Copy, Share2, Download, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BusinessCardProps {
  name: string;
  title?: string;
  organization?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  importance?: 'High' | 'Medium' | 'Low';
  avatarUrl?: string;
  showActions?: boolean;
}

export function BusinessCard({
  name,
  title,
  organization,
  phone,
  email,
  address,
  city,
  state,
  website,
  importance,
  avatarUrl,
  showActions = true,
}: BusinessCardProps) {
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  const handleShare = () => {
    const vCard = `BEGIN:VCARD
VERSION:3.0
N:${name}
FN:${name}
${organization ? `ORG:${organization}` : ''}
${title ? `TITLE:${title}` : ''}
${phone ? `TEL:${phone}` : ''}
${email ? `EMAIL:${email}` : ''}
${address ? `ADR:;;${address};${city || ''};${state || ''};;` : ''}
END:VCARD`;

    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '_')}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Contact Downloaded', description: 'vCard file has been downloaded' });
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-primary/20 to-primary/5" />
      <CardContent className="-mt-8">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-4 border-background">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 pt-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg" data-testid="text-business-name">{name}</h3>
                {title && <p className="text-sm text-muted-foreground" data-testid="text-business-title">{title}</p>}
              </div>
              {importance && (
                <Badge 
                  variant={importance === 'High' ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                  data-testid="badge-importance"
                >
                  <Star className="h-3 w-3" />
                  {importance}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {organization && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-business-org">{organization}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-sm group">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${phone}`} className="hover:underline" data-testid="link-business-phone">{phone}</a>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(phone, 'Phone')}
                data-testid="button-copy-phone"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2 text-sm group">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${email}`} className="hover:underline" data-testid="link-business-email">{email}</a>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(email, 'Email')}
                data-testid="button-copy-email"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {(address || city || state) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-business-address">
                {[address, city, state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a href={website} target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-business-website">
                {website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>

        {showActions && (
          <div className="mt-4 flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleShare} data-testid="button-download-contact">
              <Download className="h-4 w-4 mr-2" />
              Save Contact
            </Button>
            {phone && (
              <Button variant="outline" size="sm" asChild data-testid="button-call">
                <a href={`tel:${phone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            )}
            {email && (
              <Button variant="outline" size="sm" asChild data-testid="button-email">
                <a href={`mailto:${email}`}>
                  <Mail className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
