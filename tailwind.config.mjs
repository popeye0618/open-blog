import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				cream: '#FFF8F0',
				peach: '#FFD6BA',
				pink: '#FFB5C5',
				mint: '#B5EAD7',
				lavender: '#C7B8EA',
				butter: '#FFEEAD',
				ink: '#2B2A33',
			},
			fontFamily: {
				sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
				display: ['Fraunces', 'serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
			},
			boxShadow: {
				soft: '0 8px 24px -8px rgba(43,42,51,0.12)',
			},
		},
	},
	plugins: [typography],
};
