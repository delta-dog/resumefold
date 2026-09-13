export type ThemePref = "system" | "light" | "dark";
export const THEME_KEY = "byr:theme";

/** Inline, runs before paint (see layout.tsx) so the chosen theme never flashes. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;
