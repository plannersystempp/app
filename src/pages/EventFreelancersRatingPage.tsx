import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, X } from 'lucide-react';
import { FreelancerRating } from '@/components/personnel/FreelancerRating';
import { FreelancerAverageRating } from '@/components/personnel/FreelancerAverageRating';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export const EventFreelancersRatingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useTeam();
  const { events, assignments, personnel, loading } = useEnhancedData();
  const isMobile = useIsMobile();
  const [photoModalPerson, setPhotoModalPerson] = useState<any | null>(null);

  const event = events.find(e => e.id === id);

  const freelancers = useMemo(() => {
    if (!event) return [];
    const allocatedIds = assignments
      .filter(a => a.event_id === event.id)
      .map(a => a.personnel_id);
    const allocatedSet = new Set(allocatedIds);
    return personnel
      .filter(p => p.type === 'freelancer' && allocatedSet.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [event, assignments, personnel]);

  const closePhotoModal = () => {
    setPhotoModalPerson(null);
  };

  if (loading && !event) {
    return (
      <div className="p-4 md:p-6">
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Evento não encontrado.</p>
            <Button onClick={() => navigate('/app/eventos')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar à Lista de Eventos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!(userRole === 'admin' || userRole === 'coordinator')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Acesso restrito. Apenas administradores e coordenadores podem avaliar freelancers.</p>
            <Button onClick={() => navigate(`/app/eventos/${event.id}`)} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Evento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-full ${isMobile ? 'px-0 py-3' : 'p-4 md:p-6'} space-y-3 sm:space-y-4 md:space-y-6`}>
      <div className={`${isMobile ? 'px-3' : ''} flex items-center justify-between`}>
        <Button variant="ghost" onClick={() => navigate(`/app/eventos/${event.id}`)} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Evento
        </Button>
      </div>

      <Card className={isMobile ? 'border-0' : undefined}>
        <CardHeader className={`${isMobile ? 'px-3 pt-2 pb-1' : 'pb-2'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
            <Star className="w-4 h-4" />
            Avaliar Freelancers
            <Badge variant="outline" className="ml-2">{freelancers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'px-2 sm:px-3 pt-0' : 'p-2 sm:p-3'}`}>
          {freelancers.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3">Nenhum freelancer alocado para este evento.</div>
          ) : (
            <div className="space-y-1 sm:space-y-2">
              {freelancers.map(f => (
                <div key={f.id} className={`${isMobile ? 'px-2 py-2' : 'p-2'} rounded border flex items-center justify-between gap-2`}>
                  <div className={`${isMobile ? 'flex-1 min-w-0' : ''} flex items-start sm:items-center gap-2`}>
                    <button
                      type="button"
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-shrink-0"
                      onClick={() => setPhotoModalPerson(f)}
                    >
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border">
                        <AvatarImage src={f.photo_url} />
                        <AvatarFallback>{f.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="min-w-0">
                      <div className={`${isMobile ? 'text-sm' : 'text-base'} font-medium leading-tight line-clamp-2 break-words`}>{f.name}</div>
                      <div className="mt-0.5">
                        <FreelancerAverageRating freelancerId={f.id} showCount={false} clickable={false} />
                      </div>
                    </div>
                  </div>
                  <FreelancerRating
                    eventId={event.id}
                    freelancerId={f.id}
                    freelancerName={f.name}
                    onRatingSubmitted={() => {}}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!photoModalPerson} onOpenChange={open => { if (!open) closePhotoModal(); }}>
        <DialogContent className="w-screen h-screen max-w-none p-0 rounded-none border-0">
          {photoModalPerson && (
            <div className="relative w-full h-full bg-black">
              <button
                type="button"
                onClick={closePhotoModal}
                className="absolute top-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              {photoModalPerson.photo_url ? (
                <img src={photoModalPerson.photo_url} alt={photoModalPerson.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="text-7xl font-semibold">{photoModalPerson.name.substring(0, 2).toUpperCase()}</div>
                    <div className="mt-3 text-lg break-words px-6">{photoModalPerson.name}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

