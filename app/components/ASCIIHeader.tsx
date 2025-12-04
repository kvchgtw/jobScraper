export default function ASCIIHeader() {
  return (
    <div className="text-center">
      <pre className="text-terminal-text text-xs sm:text-sm md:text-base inline-block">
{`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              ░░█ █▀█ █▄▄   ▄▀█ █▀▀ █▀▀ █▀█ █▀▀ █▀▀ ▄▀█ ▀█▀ █▀█ █▀█  ║
║              █▄█ █▄█ █▄█   █▀█ █▄█ █▄█ █▀▄ ██▄ █▄█ █▀█  █  █▄█ █▀▄  ║
║                                                               ║
║                  Find Your Next Opportunity                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`}
      </pre>
      <p className="mt-4 text-terminal-dim">
        [ Searching across LinkedIn • Indeed • Glassdoor • Greenhouse • Lever • Ashby • Workday • 104 ]
      </p>
    </div>
  );
}
