// Locale switcher refs:
// - Paraglide docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
// - Router example: https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#switching-locale

import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { m } from "#/paraglide/messages";
import { getLocale, locales, setLocale } from "#/paraglide/runtime";

export default function ParaglideLocaleSwitcher() {
	const currentLocale = getLocale();

	return (
		<fieldset
			className="flex items-center gap-2"
			aria-label={m.language_label()}
		>
			<span className="text-sm text-muted-foreground">
				{m.current_locale({ locale: currentLocale })}
			</span>
			<ButtonGroup>
				{locales.map((locale) => (
					<Button
						key={locale}
						size="sm"
						type="button"
						variant={locale === currentLocale ? "default" : "outline"}
						onClick={() => setLocale(locale)}
						aria-pressed={locale === currentLocale}
					>
						{locale.toUpperCase()}
					</Button>
				))}
			</ButtonGroup>
		</fieldset>
	);
}
