-- schema.sql
-- Crea base de datos + tablas para Sistema de Gestión de Mascotas
-- Seguro para volver a ejecutar (elimina tablas existentes)

SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `mascotas` CHARACTER SET = 'utf8mb4' COLLATE = 'utf8mb4_unicode_ci';
USE `mascotas`;

-- Eliminar tablas antiguas si existen
DROP TABLE IF EXISTS `visitas_medicas`;
DROP TABLE IF EXISTS `mascota_dueno`;
DROP TABLE IF EXISTS `mascotas`;
DROP TABLE IF EXISTS `duenos`;

-- Tabla: duenos
CREATE TABLE `duenos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido` VARCHAR(100) NOT NULL,
    `edad` INT NOT NULL,
    `telefono` VARCHAR(50) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_duenos_nombre` (`nombre`, `apellido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: mascotas
CREATE TABLE `mascotas` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `edad` INT NOT NULL,
    `especie` VARCHAR(100) NOT NULL,
    `fecha_nacimiento` DATE NOT NULL,
    `condicion` VARCHAR(255) NOT NULL DEFAULT 'Sano',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_mascotas_nombre` (`nombre`),
    INDEX `idx_mascotas_especie` (`especie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla pivote: mascota_dueno (relación muchos a muchos)
CREATE TABLE `mascota_dueno` (
    `mascota_id` INT UNSIGNED NOT NULL,
    `dueno_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`mascota_id`, `dueno_id`),
    INDEX `idx_mascota_dueno_mascota` (`mascota_id`),
    INDEX `idx_mascota_dueno_dueno` (`dueno_id`),
    CONSTRAINT `fk_md_mascota` FOREIGN KEY (`mascota_id`) REFERENCES `mascotas` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_md_dueno` FOREIGN KEY (`dueno_id`) REFERENCES `duenos` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: visitas_medicas
CREATE TABLE `visitas_medicas` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `mascota_id` INT UNSIGNED NOT NULL,
    `fecha` DATE NOT NULL,
    `diagnostico` TEXT NOT NULL,
    `tratamiento` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_visitas_mascota_fecha` (`mascota_id`, `fecha`),
    CONSTRAINT `fk_visita_mascota` FOREIGN KEY (`mascota_id`) REFERENCES `mascotas` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

