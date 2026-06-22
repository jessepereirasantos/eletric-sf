import React from 'react';

interface CadIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const CadIcon: React.FC<CadIconProps & { name: string }> = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.2, ...props }) => {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props
  };

  switch (name) {
    case 'select':
      return (
        <svg {...common}>
          <path d="M4 4l5.5 16.5L12 14l5.5 5.5 2-2L14 12l6.5-2.5L4 4z" />
        </svg>
      );
    case 'eraser':
      return (
        <svg {...common}>
          <path d="M5 20h14" />
          <path d="M16 4l4 4-8.5 8.5H7.5V12.5L16 4z" />
          <path d="M12 8l4 4" />
        </svg>
      );
    case 'line':
      return (
        <svg {...common}>
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      );
    case 'arc':
      return (
        <svg {...common}>
          <path d="M21 12A9 9 0 0 0 3 12" />
          <circle cx="3" cy="12" r="1" fill="currentColor" />
          <circle cx="21" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="3" r="1" fill="currentColor" />
        </svg>
      );
    case 'rectangle':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <path d="M3 5l18 14" strokeDasharray="2 2" strokeOpacity="0.5" />
        </svg>
      );
    case 'circle':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" strokeDasharray="2 2" strokeOpacity="0.5" />
        </svg>
      );
    case 'polygon':
      return (
        <svg {...common}>
          <polygon points="12 2 21 7.5 21 16.5 12 22 3 16.5 3 7.5" />
        </svg>
      );
    case 'pushpull':
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="10" />
          <path d="M4 10l4-4h12l-4 4" />
          <path d="M16 6v10" />
          <path d="M12 2v6" />
          <path d="M9 5l3-3 3 3" />
        </svg>
      );
    case 'offset':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" />
          <rect x="8" y="8" width="8" height="8" strokeDasharray="2 2" />
          <path d="M3 3l5 5M21 3l-5 5M3 21l5-5M21 21l-5-5" strokeWidth="0.8" />
        </svg>
      );
    case 'move':
      return (
        <svg {...common}>
          <path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" />
        </svg>
      );
    case 'rotate':
      return (
        <svg {...common}>
          <path d="M21 12A9 9 0 1 1 12 3c2.4 0 4.6.9 6.2 2.5L21 8" />
          <path d="M16 8h5V3" />
        </svg>
      );
    case 'scale':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" />
          <path d="M4 4l5 5M20 20l-5-5" />
          <rect x="2" y="2" width="4" height="4" fill="currentColor" />
          <rect x="18" y="18" width="4" height="4" fill="currentColor" />
          <rect x="18" y="2" width="4" height="4" />
          <rect x="2" y="18" width="4" height="4" />
        </svg>
      );
    case 'measure':
      return (
        <svg {...common}>
          <path d="M4 14l6-6M8 18l6-6M4 14l4 4L18 8l-4-4-6 6" />
          <path d="M7 11l1 1M9 9l1 1M11 7l1 1" strokeWidth="0.8" />
        </svg>
      );
    case 'text':
      return (
        <svg {...common}>
          <path d="M4 7V4h16v3M12 4v16M9 20h6" />
        </svg>
      );
    case 'dimension':
      return (
        <svg {...common}>
          <path d="M4 20v-5M20 20v-5M4 18h16" />
          <path d="M6 16l-2 2 2 2M18 16l2 2-2 2" />
        </svg>
      );
    case 'orbit':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="9" ry="4" strokeDasharray="3 3" />
          <ellipse cx="12" cy="12" rx="4" ry="9" strokeDasharray="3 3" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'pan':
      return (
        <svg {...common}>
          <path d="M10 14.5V4.5a1.5 1.5 0 0 1 3 0v6M13 10.5v-3a1.5 1.5 0 0 1 3 0v4M16 11.5v-2a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-6-6v-6a1.5 1.5 0 0 1 3 0v4" />
        </svg>
      );
    case 'zoom':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
        </svg>
      );
    case 'zoom-extents':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <path d="M3 3l4 4M21 3l-4 4M3 21l4-4M21 21l-4-4" />
        </svg>
      );
    case 'save':
      return (
        <svg {...common}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      );
    case 'open':
      return (
        <svg {...common}>
          <path d="M3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
        </svg>
      );
    case 'new':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case 'undo':
      return (
        <svg {...common}>
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      );
    case 'redo':
      return (
        <svg {...common}>
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
        </svg>
      );
    case 'solid':
      return (
        <svg {...common} fill="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
    case 'wireframe':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 12h16M12 4v16M4 4l16 16M20 4L4 20" strokeWidth="0.8" strokeDasharray="2 2" />
        </svg>
      );
    case 'xray':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" fillOpacity="0.3" />
          <rect x="8" y="8" width="16" height="16" rx="2" strokeDasharray="2 2" />
        </svg>
      );
    case 'monochrome':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#fff" />
          <path d="M4 20L20 4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};
