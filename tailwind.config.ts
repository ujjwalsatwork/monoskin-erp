import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/src/**/*.{ts,tsx}", "./index.html"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Funnel Display", "General Sans", "system-ui", "sans-serif"],
        sans: ["General Sans", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "SF Mono", "Monaco", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
        table: {
          header: "hsl(var(--table-header))",
          hover: "hsl(var(--table-row-hover))",
          border: "hsl(var(--table-border))",
          stripe: "hsl(var(--table-stripe))",
        },
        "clinical-midnight": "hsl(var(--clinical-midnight))",
        "peptide-blue": "hsl(var(--peptide-blue))",
        "hyaluronic-haze": "hsl(var(--hyaluronic-haze))",
        "barrier-beige": "hsl(var(--barrier-beige))",
        "epidermal-neutral": "hsl(var(--epidermal-neutral))",
        "sterile-white": "hsl(var(--sterile-white))",
        "microcell-mist": "hsl(var(--microcell-mist))",
        clinical: {
          midnight: "hsl(var(--clinical-midnight))",
        },
        peptide: {
          blue: "hsl(var(--peptide-blue))",
        },
        hyaluronic: {
          haze: "hsl(var(--hyaluronic-haze))",
        },
        barrier: {
          beige: "hsl(var(--barrier-beige))",
        },
        epidermal: {
          neutral: "hsl(var(--epidermal-neutral))",
        },
        sterile: {
          white: "hsl(var(--sterile-white))",
        },
        microcell: {
          mist: "hsl(var(--microcell-mist))",
        },
        stat: {
          green: "hsl(var(--stat-green))",
          "green-bg": "hsl(var(--stat-green-bg))",
          yellow: "hsl(var(--stat-yellow))",
          "yellow-bg": "hsl(var(--stat-yellow-bg))",
          pink: "hsl(var(--stat-pink))",
          "pink-bg": "hsl(var(--stat-pink-bg))",
          purple: "hsl(var(--stat-purple))",
          "purple-bg": "hsl(var(--stat-purple-bg))",
          blue: "hsl(var(--stat-blue))",
          "blue-bg": "hsl(var(--stat-blue-bg))",
        },
        status: {
          draft: "hsl(var(--status-draft))",
          pending: "hsl(var(--status-pending))",
          approved: "hsl(var(--status-approved))",
          rejected: "hsl(var(--status-rejected))",
          processing: "hsl(var(--status-processing))",
          completed: "hsl(var(--status-completed))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        'premium': 'var(--shadow-lg)',
        'card': 'var(--shadow-sm)',
        'elevated': 'var(--shadow-md)',
        'glow': 'var(--shadow-glow)',
        'primary': 'var(--shadow-primary)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-up": "fade-in-up 0.5s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s infinite",
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
