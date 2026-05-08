CREATE TABLE `org` (
	`org_id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`stripe_customer_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscription` (
	`subscription_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`product_id` text NOT NULL,
	`customer_id` text,
	`org_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `subscription_pk` PRIMARY KEY(`subscription_id`, `variant_id`),
	CONSTRAINT `fk_subscription_org_id_org_org_id_fk` FOREIGN KEY (`org_id`) REFERENCES `org`(`org_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `subscription_org_id_idx` ON `subscription` (`org_id`);