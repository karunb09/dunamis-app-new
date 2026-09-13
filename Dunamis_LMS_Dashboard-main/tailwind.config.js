// Entrance animations use `backwards` fill, never `forwards`/`both`: a transform left
// on an element after its animation makes it the containing block for `fixed`
// descendants, which would trap every page-level modal inside the animated wrapper.
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"], // already present
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "translateY(16px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "badge-pop": {
          "0%": { transform: "scale(0)" },
          "60%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(-14deg)" },
          "40%": { transform: "rotate(10deg)" },
          "60%": { transform: "rotate(-6deg)" },
          "80%": { transform: "rotate(3deg)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(24px, -18px, 0) scale(1.1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        indeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
        // No `to` frame: the bar grows to whatever width/height its inline style sets.
        "grow-width": {
          from: { width: "0" },
        },
        "grow-height": {
          from: { height: "0" },
        },
        "reveal-x": {
          from: { clipPath: "inset(0 100% 0 0)" },
          to: { clipPath: "inset(0 0 0 0)" },
        },
        "check-ring": {
          "0%": { opacity: "0", transform: "scale(0.4)" },
          "60%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Pairs with strokeDasharray="48" on the path — the tick draws itself.
        "check-draw": {
          from: { strokeDashoffset: "48" },
          to: { strokeDashoffset: "0" },
        },
        "burst-out": {
          "0%": { opacity: "0.5", transform: "scale(0.6)" },
          "100%": { opacity: "0", transform: "scale(2.1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out backwards",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "pop-in": "pop-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "modal-in": "modal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "slide-in-right": "slide-in-right 0.45s cubic-bezier(0.32, 0.72, 0, 1) backwards",
        "badge-pop": "badge-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards",
        wiggle: "wiggle 0.6s ease-in-out",
        drift: "drift 14s ease-in-out infinite",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        indeterminate: "indeterminate 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "grow-width": "grow-width 0.9s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "grow-height": "grow-height 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "reveal-x": "reveal-x 1.1s cubic-bezier(0.65, 0, 0.35, 1) backwards",
      },
    },
  },
  plugins: [],
};
