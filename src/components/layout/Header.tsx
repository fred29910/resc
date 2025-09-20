import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <a href="/" className="text-lg font-bold">
            My Site
          </a>
          <nav className="flex items-center space-x-4">
            <a href="/blog" className="hover:text-blue-500">
              Blog
            </a>
            <a href="/docs" className="hover:text-blue-500">
              Docs
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}