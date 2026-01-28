import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">Agent Mart</span>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Browse
            </Link>
            <a
              href="https://github.com/brsbl/agent-mart"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
