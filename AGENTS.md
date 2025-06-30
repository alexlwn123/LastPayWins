# Agent Guidelines for Last Pay Wins

## Build/Lint/Test Commands
- `pnpm dev` - Start development server with debugging
- `pnpm build` - Build for production
- `pnpm lint` - Run Biome linter
- `pnpm format` - Format code with Biome
- `pnpm inngest` - Start Inngest development server
- No test framework configured

## Code Style (Biome Configuration)
- **Indentation**: 2 spaces
- **Quotes**: Double quotes for JavaScript/TypeScript
- **Imports**: Auto-organize imports enabled
- **Files**: Only lint/format files in `src/` directory
- **Linting**: Biome recommended rules enabled

## TypeScript Conventions
- Use TypeScript for all new files (.ts/.tsx)
- Define types inline or in separate type files (see `src/types/payer.ts`)
- Use proper typing for React components and hooks
- Server-only code should use `"server only"` directive

## Naming Conventions
- Components: PascalCase (e.g., `Invoice.tsx`, `CurrentWinner.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useInvoice.ts`, `usePusher.ts`)
- Files: camelCase for utilities, PascalCase for components
- CSS Modules: Use `.module.css` suffix

## Error Handling
- Use optional chaining (`?.`) for safe property access
- Console.error for failed operations
- Handle async operations with proper error catching