"use client";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	ChakraProvider,
	defaultSystem,
} from "@chakra-ui/react";

export function Chakra() {
	return (
		<ChakraProvider value={defaultSystem}>
			<Alert.Root status="error">
				<Alert.Indicator />
				<AlertTitle>Your browser!</AlertTitle>
				<AlertDescription>
					Your Chakra experience!
				</AlertDescription>
			</Alert.Root>
		</ChakraProvider>
	);
}
