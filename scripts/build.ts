await Bun.$`bunx tailwindcss -c tailwind.config.ts -i apps/web/src/styles.css -o public/assets/styles.css`;
await Bun.build({
  entrypoints: ["apps/web/src/main.tsx"],
  outdir: "public/assets",
  target: "browser",
  sourcemap: "external"
});
console.log("Built web assets.");

export {};
