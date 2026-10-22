import { useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { Textarea } from "#/components/ui/textarea";
import { jsonValue, parseJsonField } from "./catalog-layout";

type Field =
	| { key: string; label: string; readonly?: boolean; type?: "text" }
	| {
			key: string;
			label: string;
			options: string[];
			readonly?: boolean;
			type: "select";
	  }
	| { key: string; label: string; readonly?: boolean; type: "json" };

export function EntityEditForm({
	fields,
	initialValue,
	onSubmit,
}: {
	fields: Field[];
	initialValue: Record<string, unknown>;
	onSubmit: (value: Record<string, unknown>) => void;
}) {
	const [value, setValue] = useState<Record<string, string>>(() =>
		Object.fromEntries(
			fields.map((field) => [field.key, jsonValue(initialValue[field.key])]),
		),
	);

	return (
		<form
			className="grid gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				const body = Object.fromEntries(
					fields
						.filter((field) => !field.readonly)
						.map((field) => [
							field.key,
							field.type === "json"
								? parseJsonField(value[field.key] ?? "")
								: value[field.key],
						])
						.filter(([, fieldValue]) => fieldValue !== undefined),
				);
				onSubmit(body);
			}}
		>
			{fields.map((field) => (
				<label className="grid gap-2 text-sm" key={field.key}>
					{field.label}
					{field.type === "json" ? (
						<Textarea
							disabled={field.readonly}
							rows={6}
							value={value[field.key] ?? ""}
							onChange={(event) =>
								setValue((current) => ({
									...current,
									[field.key]: event.target.value,
								}))
							}
						/>
					) : field.type === "select" ? (
						<NativeSelect
							className="w-full"
							disabled={field.readonly}
							value={value[field.key] ?? ""}
							onChange={(event) =>
								setValue((current) => ({
									...current,
									[field.key]: event.target.value,
								}))
							}
						>
							{field.options.map((option) => (
								<NativeSelectOption key={option} value={option}>
									{option}
								</NativeSelectOption>
							))}
						</NativeSelect>
					) : (
						<Input
							disabled={field.readonly}
							value={value[field.key] ?? ""}
							onChange={(event) =>
								setValue((current) => ({
									...current,
									[field.key]: event.target.value,
								}))
							}
						/>
					)}
				</label>
			))}
			<Button type="submit">Speichern</Button>
		</form>
	);
}
