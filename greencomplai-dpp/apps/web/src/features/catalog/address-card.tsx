import { useEffect, useState } from "react";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

import {
	type AddressDraft,
	AddressFields,
	addressToDraft,
	mergeAddress,
} from "./address-fields";

// A dedicated card with its own save path, as with the product identifiers:
// the address is a nested object and does not fit the flat editing form next
// to it. It used to live there as a raw JSON text field - but a forgotten
// bracket then lost it entirely.
export function AddressCard({
	address,
	onSave,
	pending,
}: {
	address: unknown;
	onSave: (address: Record<string, unknown> | undefined) => void;
	pending: boolean;
}) {
	const [draft, setDraft] = useState<AddressDraft>(() =>
		addressToDraft(address),
	);

	useEffect(() => {
		setDraft(addressToDraft(address));
	}, [address]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Anschrift</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				<AddressFields onChange={setDraft} value={draft} />
				<Button
					className="justify-self-start"
					disabled={pending}
					onClick={() => onSave(mergeAddress(address, draft))}
				>
					Anschrift speichern
				</Button>
			</CardContent>
		</Card>
	);
}
