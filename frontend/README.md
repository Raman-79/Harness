# Forge Frontend

A modern AI chat interface built with Next.js, TypeScript, and Tailwind CSS, featuring an OLED-optimized dark mode design system inspired by Claude.ai.

## Design System

This frontend implements the "Dark Mode (OLED)" design system from the UI/UX Pro Max skill:

- **Color Palette**: Deep space blues with OLED-optimized blacks
  - Background: #0F172A (near-black for OLED efficiency)
  - Primary: #1E293B (slate blue)
  - Accent: #22C55E (emerald green for actions)
  - Foreground: #F8FAFC (soft white for text)

- **Typography**: Inter font family for optimal readability
- **Effects**: Subtle glows, smooth transitions, and tactile feedback
- **Accessibility**: WCAG AAA contrast ratios, focus states, reduced motion support

## Design Principles Applied

1. **Accessibility (CRITICAL)**: Proper contrast ratios, focus states, semantic HTML
2. **Touch & Interaction**: 48px minimum touch targets, hover/press feedback
3. **Performance**: OLED-optimized colors, efficient animations
4. **Style Selection**: Consistent dark mode aesthetic with purposeful accent colors
5. **Layout & Responsive**: Mobile-first approach with proper spacing scale
6. **Typography & Color**: Inter font family, semantic color tokens
7. **Animation**: Meaningful motion with appropriate duration and easing
8. **Forms & Feedback**: Clear input states, loading feedback, error handling
9. **Navigation Patterns**: Consistent placement and visual hierarchy
10. **Charts & Data**: Accessible data visualization (where applicable)

## Key Features

- OLED-optimized dark theme for battery efficiency
- Smooth animations and micro-interactions
- Responsive design across device sizes
- Accessible color contrast and typography
- File upload with drag-and-drop support
- Markdown rendering with syntax highlighting
- Realistic typing indicators and message animations

## Design Tokens

```css
--background: #0F172A;    /* OLED black */
--foreground: #F8FAFC;    /* Soft white */
--primary: #1E293B;       /* Slate blue */
--on-primary: #FFFFFF;    /* Pure white */
--secondary: #334155;     /* Darker slate */
--accent: #22C55E;        /* Emerald green */
--muted: #272F42;         /* Muted blue */
--border: #475569;        /* Border gray */
--destructive: #EF4444;   /* Error red */
--ring: #1E293B;          /* Focus ring */
```

## Implementation Notes

- Uses CSS custom properties for easy theming
- Implements focus rings for keyboard navigation
- Provides hover and press feedback for all interactive elements
- Respects prefers-reduced-motion for accessibility
- Optimized for OLED displays with true blacks
- Uses Inter typeface for excellent screen readability
