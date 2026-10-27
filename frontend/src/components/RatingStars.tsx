import { useState } from 'react';
import { Star } from 'lucide-react';

type Props = {
  average: number;
  count: number;
  myRating?: number;
  onRate?: (rating: number) => void;
  disabled?: boolean;
};

export default function RatingStars({ average, count, myRating = 0, onRate, disabled = false }: Props) {
  const [hovered, setHovered] = useState(0);
  const selected = hovered || myRating;
  const filledAverage = Math.round(average);

  return (
    <section className="rating-panel" aria-label="Calificación del proyecto">
      <div className="rating-summary">
        <div className="rating-average-stars" aria-label={`Promedio ${average.toFixed(1)} de 5 estrellas`}>
          {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill={star <= filledAverage ? 'currentColor' : 'none'} />)}
        </div>
        <strong>{average.toFixed(1)}</strong>
        <span>{count} {count === 1 ? 'calificación' : 'calificaciones'}</span>
      </div>
      {onRate && <div className="rating-action">
        <span>{myRating ? `Tu calificación: ${myRating}/5` : 'Califica este proyecto'}</span>
        <div className="rating-buttons" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => <button
            key={star}
            type="button"
            className={star <= selected ? 'rating-star is-selected' : 'rating-star'}
            aria-label={`Calificar ${star} de 5 estrellas`}
            aria-pressed={myRating === star}
            disabled={disabled}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(0)}
            onClick={() => onRate(star)}
          ><Star size={20} fill={star <= selected ? 'currentColor' : 'none'} /></button>)}
        </div>
      </div>}
    </section>
  );
}
