import { type VariantProps, tv } from 'tailwind-variants';

// Define and export variants from the .ts file
export const alertVariants = tv({
	base: '[&>svg]:text-foreground relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
	variants: {
		variant: {
			default: 'bg-background text-foreground',
			destructive:
				'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive'
		}
	},
	defaultVariants: {
		variant: 'default'
	}
});

export type AlertVariant = VariantProps<typeof alertVariants>['variant'];

// Import and re-export the Svelte components
import Root from './alert.svelte';
import Description from './alert-description.svelte';
import Title from './alert-title.svelte';

export {
	Root,
	Description,
	Title,
	//
	Root as Alert,
	Description as AlertDescription,
	Title as AlertTitle
};
