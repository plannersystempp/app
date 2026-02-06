import React, { useEffect, useState } from 'react';
import { Info, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTeam } from '@/contexts/TeamContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/utils/formatters';

interface FreelancerRatingProps {
  eventId: string;
  freelancerId: string;
  freelancerName: string;
  existingRating?: number;
  onRatingSubmitted?: () => void;
}

export const FreelancerRating: React.FC<FreelancerRatingProps> = ({
  eventId,
  freelancerId,
  freelancerName,
  existingRating,
  onRatingSubmitted
}) => {
  const [rating, setRating] = useState(existingRating || 0);
  const [currentRowId, setCurrentRowId] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auditRatings, setAuditRatings] = useState<Array<{ id: string; rating: number; created_at: string | null; rated_by_id: string | null; rated_by_name: string | null }>>([]);
  const { toast } = useToast();
  const { activeTeam } = useTeam();
  const { user } = useAuth();

  useEffect(() => {
    const fetchExisting = async () => {
      if (!activeTeam || !user) return;
      const { data, error } = await supabase
        .from('freelancer_ratings')
        .select('id, rating')
        .eq('team_id', activeTeam.id)
        .eq('event_id', eventId)
        .eq('freelancer_id', freelancerId)
        .eq('rated_by_id', user.id)
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        setCurrentRowId(data.id as string);
        setRating(Number(data.rating) || 0);
      }
    };
    fetchExisting();
  }, [activeTeam, user, eventId, freelancerId]);

  useEffect(() => {
    const fetchAuditRatings = async () => {
      if (!activeTeam) return;
      const { data, error } = await supabase
        .from('freelancer_ratings_enriched')
        .select('id, rating, created_at, rated_by_id, rated_by_name')
        .eq('team_id', activeTeam.id)
        .eq('event_id', eventId)
        .eq('freelancer_id', freelancerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching rating audit:', error);
        return;
      }

      setAuditRatings((data || []) as any);
    };

    fetchAuditRatings();
  }, [activeTeam, eventId, freelancerId]);

  const handleRatingSubmit = async (selectedRating: number) => {
    if (!activeTeam || !user) {
      toast({
        title: "Erro",
        description: "Usuário ou equipe não encontrados",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentRowId) {
        const { error } = await supabase
          .from('freelancer_ratings')
          .update({ rating: selectedRating })
          .eq('id', currentRowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('freelancer_ratings')
          .insert({
            team_id: activeTeam.id,
            event_id: eventId,
            freelancer_id: freelancerId,
            rating: selectedRating,
            rated_by_id: user.id
          })
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (data?.id) setCurrentRowId(String(data.id));
      }

      setRating(selectedRating);
      toast({
        title: "Avaliação salva",
        description: `${freelancerName} avaliado com ${selectedRating} estrela${selectedRating > 1 ? 's' : ''}`,
      });

      onRatingSubmitted?.();

      const { data: refreshed } = await supabase
        .from('freelancer_ratings_enriched')
        .select('id, rating, created_at, rated_by_id, rated_by_name')
        .eq('team_id', activeTeam.id)
        .eq('event_id', eventId)
        .eq('freelancer_id', freelancerId)
        .order('created_at', { ascending: false });
      setAuditRatings((refreshed || []) as any);
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar avaliação",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderReadOnlyStars = (value: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isActive = starValue <= value;
      return (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${isActive ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      );
    });
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isActive = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={index}
          type="button"
          onClick={() => !isSubmitting && handleRatingSubmit(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          disabled={isSubmitting}
          className={`${
            'cursor-pointer hover:scale-110'
          } transition-transform`}
        >
          <Star
            className={`w-5 h-5 ${
              isActive 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        </button>
      );
    });
  };

  return (
    <div className="flex items-center gap-1">
      {renderStars()}

      {auditRatings.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-accent"
              aria-label="Ver histórico de avaliações"
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <div className="text-sm font-medium">Histórico de avaliações</div>
              <div className="max-h-64 space-y-2 overflow-auto pr-1">
                {auditRatings.map(r => (
                  <div key={r.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium truncate">
                        {r.rated_by_name || 'Usuário'}
                      </div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(r.created_at || '')}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {renderReadOnlyStars(Number(r.rating) || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {isSubmitting && (
        <span className="text-sm text-muted-foreground ml-2">
          Enviando...
        </span>
      )}
    </div>
  );
};
