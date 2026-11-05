import React from "react";
import { MoveClassification } from "@/types/chess";

interface BadgeProps {
  classification: MoveClassification;
  size?: number;
  className?: string;
}

export const CLASSIFICATION_COLORS: Record<
  MoveClassification,
  {
    bg: string;
    text: string;
    border: string;
    label: string;
  }
> = {
  best: {
    bg: "#95c23d",
    text: "#ffffff",
    border: "#82ab33",
    label: "Best",
  },
  excellent: {
    bg: "#96bc4b",
    text: "#ffffff",
    border: "#85a73f",
    label: "Excellent",
  },
  good: {
    bg: "#96af8b",
    text: "#ffffff",
    border: "#819976",
    label: "Good",
  },
  book: {
    bg: "#d5a47d",
    text: "#ffffff",
    border: "#bc8e68",
    label: "Book",
  },
  inaccuracy: {
    bg: "#f7c631",
    text: "#ffffff",
    border: "#dfb027",
    label: "Inaccuracy",
  },
  mistake: {
    bg: "#ffa43d",
    text: "#ffffff",
    border: "#e58e2d",
    label: "Mistake",
  },
  blunder: {
    bg: "#fa412d",
    text: "#ffffff",
    border: "#de3422",
    label: "Blunder",
  },
};

export const ChessComBadge: React.FC<BadgeProps> = ({
  classification,
  size = 28,
  className = "",
}) => {
  const config = CLASSIFICATION_COLORS[classification] || CLASSIFICATION_COLORS.best;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={`inline-block select-none overflow-visible drop-shadow-md ${className}`}
      aria-label={config.label}
    >
      {/* Circle Badge background with subtle dark shadow */}
      <circle
        cx="20"
        cy="20"
        r="18"
        fill={config.bg}
        stroke="#ffffff"
        strokeWidth="2.5"
      />

      {/* Chess.com Classification SVG Glyphs */}
      {classification === "book" && (
        <g fill="#ffffff" transform="translate(10, 10) scale(0.83)">
          {/* Open Book icon */}
          <path d="M12 4.5C9.8 2.8 6.5 2.5 3.5 2.5v15c3 0 6.3.3 8.5 2 2.2-1.7 5.5-2 8.5-2v-15c-3 0-6.3.3-8.5 2zm-1 12.8c-1.8-1.1-4.4-1.5-6.8-1.6V4.4c2.2.1 4.7.5 6.8 1.6v11.3zm10.3-1.6c-2.4.1-5 .5-6.8 1.6V6c2.1-1.1 4.6-1.5 6.8-1.6v11.3z" />
        </g>
      )}

      {classification === "best" && (
        <g fill="#ffffff" transform="translate(11, 10.5) scale(0.95)">
          {/* Chess.com Best Move Checkmark */}
          <path
            d="M6.5 14.5L1.5 9.5l2-2 3 3 8-8 2 2z"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </g>
      )}

      {classification === "excellent" && (
        <g fill="#ffffff" transform="translate(16, 9) scale(0.95)">
          {/* Single Exclamation Mark '!' */}
          <path d="M2.5 1.5h3.5l-.8 11.5H3.3L2.5 1.5zm.3 14.5h3v3.2h-3V16z" />
        </g>
      )}

      {classification === "good" && (
        <g fill="#ffffff" transform="translate(13, 9) scale(0.88)">
          {/* Chess.com thumbs-up icon */}
          <path d="M2 17h4v-9H2v9zm14-8c0-.8-.7-1.5-1.5-1.5h-4.3l.6-3.2.03-.3c0-.4-.2-.8-.4-1.1L9.3 2 4.6 6.7C4.2 7.1 4 7.5 4 8v8c0 1.1.9 2 2 2h7.6c.6 0 1.2-.4 1.4-.9l2.4-5.6c.1-.2.1-.3.1-.5v-2z" />
        </g>
      )}

      {classification === "inaccuracy" && (
        <g fill="#ffffff" transform="translate(10.5, 9) scale(0.95)">
          {/* Inaccuracy '?!' */}
          <text
            x="0"
            y="17"
            fontFamily="Arial, system-ui, sans-serif"
            fontWeight="900"
            fontSize="16"
            fill="#ffffff"
          >
            ?!
          </text>
        </g>
      )}

      {classification === "mistake" && (
        <g fill="#ffffff" transform="translate(15.5, 9) scale(0.95)">
          {/* Mistake '?' */}
          <text
            x="0"
            y="17"
            fontFamily="Arial, system-ui, sans-serif"
            fontWeight="900"
            fontSize="17"
            fill="#ffffff"
          >
            ?
          </text>
        </g>
      )}

      {classification === "blunder" && (
        <g fill="#ffffff" transform="translate(9, 9) scale(0.95)">
          {/* Blunder '??' */}
          <text
            x="0"
            y="17"
            fontFamily="Arial, system-ui, sans-serif"
            fontWeight="900"
            fontSize="16"
            fill="#ffffff"
          >
            ??
          </text>
        </g>
      )}
    </svg>
  );
};
