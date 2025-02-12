'use client'
import Select from "react-select";

const options = [
	{ value: "chocolate", label: "Chocolate" },
	{ value: "strawberry", label: "Strawberry" },
	{ value: "vanilla", label: "Vanilla" },
];

export function WithSelect() {
	return (
		<div>
			<Select options={options} />
		</div>
	);
}
