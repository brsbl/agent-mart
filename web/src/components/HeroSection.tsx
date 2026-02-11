export function HeroSection() {
  return (
    <section className="flex flex-col items-center px-4 gap-4">
      <pre className="text-foreground leading-none font-mono text-[7px] sm:text-[13px] md:text-[20px] mt-4 md:mt-8 tracking-tight select-none opacity-70 max-w-full overflow-hidden">
{` █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ███╗   ███╗ █████╗ ██████╗ ████████╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       ██╔████╔██║███████║██████╔╝   ██║
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██║╚██╔╝██║██╔══██║██╔══██╗   ██║
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ██║ ╚═╝ ██║██║  ██║██║  ██║   ██║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝`}
      </pre>
      <p className="mt-1 md:mt-2 text-sm sm:text-base md:text-lg text-foreground-secondary text-center">
        Browse Claude Code plugins
      </p>
    </section>
  );
}
