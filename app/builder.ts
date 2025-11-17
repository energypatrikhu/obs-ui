await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "../@obs-ui",
  minify: true,
  target: "bun",
  publicPath: "./static/",
  compile: {
    target: "bun-windows-x64-baseline",
    outfile: "energy-obs-ui.exe",
    windows: {
      title: "Energy OBS UI",
      copyright: `Copyright © ${new Date().getFullYear()} EnergyPatrikHU`,
      description:
        "An OBS UI application and browser extension to show Twitch stream data and now playing information from various music sources.",
      publisher: "EnergyPatrikHU",
    },
  },
  bytecode: true,
  packages: "bundle",
});
