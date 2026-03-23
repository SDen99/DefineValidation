// @sden99/ui-components
// Safe, reusable UI components for clinical data applications

// Utility functions
export { cn } from './utils/index.js';
export type { ClassValue } from './utils/index.js';

// Accordion components
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/accordion/index.js';

// Alert components (non-dialog)
export { Alert, AlertDescription, AlertTitle } from './components/alert/index.js';

// Badge component
export { Badge } from './components/badge/index.js';

// Button component  
export { Button, buttonVariants } from './components/button/index.js';
export type { ButtonVariant, ButtonSize, ButtonProps } from './components/button/index.js';

// Card components
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/card/index.js';

// Checkbox component
export { Checkbox } from './components/checkbox/index.js';

// Input component
export { Input } from './components/input/index.js';

// Progress component  
export { Progress } from './components/progress/index.js';

// Scroll Area components
export { ScrollArea, ScrollAreaScrollbar } from './components/scroll-area/index.js';

// Separator component
export { Separator } from './components/separator/index.js';

// Table components
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './components/table/index.js';

// Tabs components
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs/index.js';

// Re-export component groups for convenience
export * as AccordionComponents from './components/accordion/index.js';
export * as AlertComponents from './components/alert/index.js';
export * as ButtonComponents from './components/button/index.js';
export * as CardComponents from './components/card/index.js';
export * as TableComponents from './components/table/index.js';
export * as TabsComponents from './components/tabs/index.js';