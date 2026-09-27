import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const TOKEN_HINT = 'use a token from globals.css (@theme) instead'

/** Selectors for string literals and template parts that hold design values. */
function magicValueRules() {
  const patterns = [
    [String.raw`\d(\.\d+)?px`, `px values are not allowed: ${TOKEN_HINT}`],
    [String.raw`\[#`, `arbitrary colors are not allowed: ${TOKEN_HINT}`],
    [
      String.raw`^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`,
      `hex colors are not allowed: ${TOKEN_HINT}`,
    ],
    [String.raw`(rgb|hsl)a?\(`, `rgb()/hsl() colors are not allowed: ${TOKEN_HINT}`],
  ]
  return [
    ...patterns.flatMap(([regex, message]) => [
      // href="#section" is an anchor, not a color
      {
        selector: `Literal[value=/${regex}/]:not(JSXAttribute[name.name="href"] > Literal)`,
        message,
      },
      { selector: `TemplateElement[value.raw=/${regex}/]`, message },
    ]),
    {
      // `${size}px`
      selector: 'TemplateElement[value.raw=/^px/]',
      message: `px values are not allowed: ${TOKEN_HINT}`,
    },
    {
      selector: 'JSXAttribute[name.name="style"] Property > Literal[raw=/^-?\\d/]',
      message: `numeric values in style are not allowed: ${TOKEN_HINT}`,
    },
  ]
}

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    // Design values come only from tokens in globals.css (@theme): no hex/rgb, px or arbitrary colors.
    files: ['src/components/**/*.{ts,tsx}', 'src/app/(frontend)/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...magicValueRules()],
    },
  },
  {
    ignores: [
      '.next/',
      'next-env.d.ts',
      'src/app/(payload)/admin/importMap.js',
      'src/payload-types.ts',
      'src/payload-generated-schema.ts',
      'src/migrations/',
    ],
  },
]

export default eslintConfig
