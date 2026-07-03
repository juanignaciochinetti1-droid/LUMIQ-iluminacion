ALTER TABLE `productos` ADD `codigo` varchar(100);
--> statement-breakpoint
ALTER TABLE `productos` ADD `costo` decimal(12,2);
--> statement-breakpoint
ALTER TABLE `productos` ADD CONSTRAINT `productos_codigo_unique` UNIQUE(`codigo`);
