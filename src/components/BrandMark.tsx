import React from 'react';

/**
 * Marque PEAK : une arête franche, trait épais à bouts ronds.
 * Géométrie identique au favicon (public/favicon.svg, viewBox 24) pour que
 * l'onglet et le header racontent exactement la même chose. Le trait unique
 * est volontaire : à 16 px un double trait devient une brouillasse.
 */
interface BrandMarkProps {
  /** Hauteur/largeur en px (le marqueur est carré). */
  size?: number;
  /** Couleur de l'arête. Défaut : blanc (posé sur la tuile orange). */
  color?: string;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 20, color = '#ffffff', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M4.6 19.4 L12 5.6 L19.4 19.4"
      stroke={color}
      strokeWidth="3.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default BrandMark;
