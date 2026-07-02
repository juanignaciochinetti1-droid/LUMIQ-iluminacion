CREATE TABLE `insumos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`descripcion` text NOT NULL,
	`cantidad` decimal(10,3) DEFAULT '0',
	`unidad` varchar(50) NOT NULL,
	`precioUnitario` decimal(12,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `insumos_id` PRIMARY KEY(`id`),
	CONSTRAINT `insumos_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `produccion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fecha` date NOT NULL,
	`productoId` int NOT NULL,
	`cantidad` decimal(10,3) NOT NULL,
	`responsable` varchar(255) NOT NULL,
	`costoMP` decimal(12,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produccion_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`stock` decimal(10,3) DEFAULT '0',
	`precioVenta` decimal(12,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recetas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productoId` int NOT NULL,
	`insumoId` int NOT NULL,
	`cantidad` decimal(10,3) NOT NULL,
	`unidad` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recetas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ventas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fecha` date NOT NULL,
	`remito` varchar(100),
	`dniCuit` varchar(50),
	`direccion` text,
	`localidad` varchar(255),
	`productoId` int NOT NULL,
	`cantidad` decimal(10,3) NOT NULL,
	`precioUnitario` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ventas_id` PRIMARY KEY(`id`)
);
